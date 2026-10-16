<script setup lang="ts">
	import { computed, onBeforeUnmount, ref, watch } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { usePlanetData } from "@/database/services/usePlanetData";

	// Util
	import { formatNumber } from "@/util/numbers";
	import {
		exchangeBasisLabel,
		exchangeOptionLabel,
		isNoPrice,
	} from "@/features/exchanges/exchangeLabel.util";
	import { toRows } from "@/features/exchanges/fixedPrices.util";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import CXNotes from "@/features/exchanges/components/CXNotes.vue";
	import CXPriceLadder from "@/features/exchanges/components/CXPriceLadder.vue";
	import CXSourceTag from "@/features/exchanges/components/CXSourceTag.vue";

	// Types & Interfaces
	import type { CXData } from "@/features/api/schemas/cxData.schemas";
	import type { PriceType } from "@/features/cx/priceBook";
	import type { IExchangeNote } from "@/features/exchanges/exchangeNotes.util";
	import type {
		IMaterialPriceRow,
		IMaterialSide,
	} from "@/features/exchanges/useExchangePlanData.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import {
		PButton,
		PButtonGroup,
		PDataTable,
		PInput,
		PProgressBar,
		PTag,
		PTooltip,
	} from "@/ui";

	/*
	 * The Overview of a preference: summary, notes and the price every
	 * material of the linked plans gets, expandable to its cascade
	 */
	const {
		cxData,
		pricedData,
		rows,
		notes,
		calculating = false,
		progress = [0, 0],
		planetCounts,
	} = defineProps<{
		// the rules as edited
		cxData: CXData;
		// the rules the rows are priced with (edits, debounced)
		pricedData: CXData | undefined;
		rows: IMaterialPriceRow[];
		notes: IExchangeNote[];
		calculating?: boolean;
		// plans calculated, of
		progress?: [number, number];
		// planets with their own rules, of all listed
		planetCounts: [number, number];
	}>();

	const emit = defineEmits<{
		(e: "open", scope: string): void;
		(e: "use-cogm", note: IExchangeNote): void;
	}>();

	const { t } = useI18n();
	const { planetName } = usePlanetData();

	// Summary
	const allPlanetsRule = computed(() => {
		const rules = cxData.cx_empire;
		if (rules.length === 1 && rules[0].type === "BOTH")
			return exchangeOptionLabel(rules[0].exchange, t);
		if (rules.length === 0)
			return exchangeBasisLabel("UNIVERSE", "vwap_30d", t);
		return rules
			.map((o) =>
				t("exchanges.rule.inherited_part", {
					type: t(`exchanges.rule.side.${o.type.toLowerCase()}`),
					rule: exchangeOptionLabel(o.exchange, t),
				})
			)
			.join(" · ");
	});
	const fixedCount = computed(
		() =>
			toRows(cxData.ticker_empire).length +
			cxData.ticker_planets.reduce(
				(sum, p) => sum + toRows(p.preferences).length,
				0
			)
	);

	// Filters
	type Filter = "all" | "fixed" | "no_price" | "varies";
	const FILTERS: Filter[] = ["all", "fixed", "no_price", "varies"];
	const filter = ref<Filter>("all");
	const search = ref("");

	const sidesOf = (r: IMaterialPriceRow) =>
		[r.buy, r.sell].filter((s): s is IMaterialSide => s !== null);
	const anyPrice = (
		r: IMaterialPriceRow,
		test: (p: IMaterialSide["planets"][number]) => boolean
	) => sidesOf(r).some((s) => s.planets.some(test));

	const shown = computed(() => {
		const q = search.value.trim().toUpperCase();
		return rows.filter((r) => {
			if (q && !r.ticker.includes(q)) return false;
			switch (filter.value) {
				case "fixed":
					return anyPrice(
						r,
						(p) =>
							p.source.level === "planet_ticker" ||
							p.source.level === "empire_ticker"
					);
				case "no_price":
					return anyPrice(r, (p) => isNoPrice(p.source));
				case "varies":
					return sidesOf(r).some((s) => s.varies);
			}
			return true;
		});
	});

	// Wide: Buy · Source · Sell · Source · Used on; narrow: one side
	const wideQuery =
		typeof window.matchMedia === "function"
			? window.matchMedia("(min-width: 1024px)")
			: null;
	const isWide = ref(wideQuery?.matches ?? true);
	const onMedia = (e: MediaQueryListEvent) => (isWide.value = e.matches);
	wideQuery?.addEventListener("change", onMedia);
	onBeforeUnmount(() => wideQuery?.removeEventListener("change", onMedia));
	const phoneSide = ref<PriceType>("BUY");

	const tableData = computed(() =>
		isWide.value
			? shown.value
			: shown.value.filter((r) =>
					phoneSide.value === "BUY" ? r.buy : r.sell
				)
	);

	const columns = computed<PDataTableColumn<IMaterialPriceRow>[]>(() => {
		const material = {
			key: "material",
			title: t("exchanges.overview.columns.material"),
		};
		if (!isWide.value)
			return [
				material,
				// the source sits under the price, a third column won't fit
				{
					key: "price",
					title: t(
						`exchanges.overview.columns.${phoneSide.value.toLowerCase()}`
					),
					align: "right",
				},
			];
		return [
			material,
			{
				key: "buy",
				title: t("exchanges.overview.columns.buy"),
				align: "right",
			},
			{ key: "buy_source", title: t("exchanges.overview.columns.source") },
			{
				key: "sell",
				title: t("exchanges.overview.columns.sell"),
				align: "right",
			},
			{ key: "sell_source", title: t("exchanges.overview.columns.source") },
			{ key: "planets", title: t("exchanges.overview.columns.used_on") },
		];
	});
	const rowKey = (r: IMaterialPriceRow) => r.ticker;
	const expandLabel = (r: IMaterialPriceRow) =>
		t("exchanges.overview.expand", { ticker: r.ticker });

	const sideOf = (r: IMaterialPriceRow, type: PriceType) =>
		type === "BUY" ? r.buy : r.sell;

	function priceText(side: IMaterialSide | null): string {
		if (!side) return "–";
		return side.min === side.max
			? formatNumber(side.min)
			: `${formatNumber(side.min)}–${formatNumber(side.max)}`;
	}

	const names = (planets: string[]) =>
		planets.map((p) => planetName(p, p)).join(", ");
	// "Used on" shows this many, the rest in a tooltip
	const USED_ON_SHOWN = 3;

	// one ladder per side and planet
	function ladders(r: IMaterialPriceRow) {
		const types: PriceType[] = isWide.value
			? ["BUY", "SELL"]
			: [phoneSide.value];
		return types.flatMap((type) =>
			(sideOf(r, type)?.planets ?? []).map((p) => ({
				type,
				planet: p.planet,
			}))
		);
	}

	const expanded = ref<(string | number)[]>([]);
	watch(expanded, (now, before) =>
		now
			.filter((k) => !before.includes(k))
			.forEach((k) =>
				trackEvent("exchange:price_detail", {
					location: "exchanges_view",
					material_ticker: String(k),
				})
			)
	);
</script>

<template>
	<div class="flex flex-col gap-6">
		<CXNotes
			:notes="notes"
			show-open
			@open="(s) => emit('open', s)"
			@use-cogm="(n) => emit('use-cogm', n)">
			<h2 class="text-xl font-bold">
				{{ $t("exchanges.overview.title") }}
			</h2>
			<p class="text-muted">{{ $t("exchanges.overview.description") }}</p>
		</CXNotes>

		<dl
			class="flex flex-wrap gap-x-8 gap-y-3 px-4 py-3 rounded-md border border-white/10 bg-white/5">
			<div>
				<dt class="text-muted text-xs">
					{{ $t("exchanges.overview.summary.all") }}
				</dt>
				<dd class="font-bold">{{ allPlanetsRule }}</dd>
			</div>
			<div>
				<dt class="text-muted text-xs">
					{{ $t("exchanges.overview.summary.own") }}
				</dt>
				<dd class="font-bold tabular-nums">
					{{
						$t("exchanges.overview.summary.own_value", {
							n: planetCounts[0],
							m: planetCounts[1],
						})
					}}
				</dd>
			</div>
			<div>
				<dt class="text-muted text-xs">
					{{ $t("exchanges.overview.summary.fixed") }}
				</dt>
				<dd class="font-bold tabular-nums">{{ fixedCount }}</dd>
			</div>
		</dl>

		<section class="flex flex-col gap-3">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h3 class="text-lg font-bold">
					{{ $t("exchanges.overview.prices_title") }}
				</h3>
				<div class="flex flex-wrap items-center gap-3">
					<PInput
						v-model:value="search"
						class="w-48"
						:aria-label="$t('exchanges.overview.search')"
						:placeholder="$t('exchanges.overview.search')" />
					<PButtonGroup
						role="group"
						class="flex-wrap"
						:aria-label="$t('exchanges.overview.filter_label')">
						<PButton
							v-for="f in FILTERS"
							:key="f"
							class="min-w-11"
							:pressed="filter === f"
							@click="filter = f">
							{{ $t(`exchanges.overview.filter.${f}`) }}
						</PButton>
					</PButtonGroup>
				</div>
			</div>

			<div v-if="calculating" class="flex flex-col gap-2 py-6" role="status">
				<span class="text-muted">
					{{ $t("exchanges.overview.calculating") }}
				</span>
				<PProgressBar :step="progress[0]" :total="progress[1]" />
			</div>
			<template v-else>
				<PButtonGroup
					v-if="!isWide"
					role="group"
					class="self-start"
					:aria-label="$t('exchanges.overview.side_label')">
					<PButton
						v-for="s in ['BUY', 'SELL'] as const"
						:key="s"
						size="sm"
						class="min-w-11"
						:pressed="phoneSide === s"
						@click="phoneSide = s">
						{{ $t(`exchanges.overview.side.${s}`) }}
					</PButton>
				</PButtonGroup>
				<PDataTable
					v-model:expanded-row-keys="expanded"
					:columns="columns"
					:data="tableData"
					:row-key="rowKey"
					:expand-label="expandLabel">
					<template #cell-material="{ row }">
						<MaterialTile :ticker="row.ticker" />
					</template>
					<template #cell-buy="{ row }">
						<span class="tabular-nums text-nowrap">
							{{ priceText(row.buy) }}
						</span>
					</template>
					<template #cell-sell="{ row }">
						<span class="tabular-nums text-nowrap">
							{{ priceText(row.sell) }}
						</span>
					</template>
					<template #cell-price="{ row }">
						<div class="flex flex-col items-end gap-1">
							<span class="tabular-nums text-nowrap">
								{{ priceText(sideOf(row, phoneSide)) }}
							</span>
							<PTag
								v-if="sideOf(row, phoneSide)?.varies"
								size="sm"
								type="secondary"
								:value="$t('exchanges.overview.varies')" />
							<CXSourceTag
								v-else-if="sideOf(row, phoneSide)"
								:source="sideOf(row, phoneSide)!.planets[0].source" />
						</div>
					</template>
					<template #cell-buy_source="{ row }">
						<PTag
							v-if="row.buy?.varies"
							size="sm"
							type="secondary"
							:value="$t('exchanges.overview.varies')" />
						<CXSourceTag
							v-else-if="row.buy"
							:source="row.buy.planets[0].source" />
					</template>
					<template #cell-sell_source="{ row }">
						<PTag
							v-if="row.sell?.varies"
							size="sm"
							type="secondary"
							:value="$t('exchanges.overview.varies')" />
						<CXSourceTag
							v-else-if="row.sell"
							:source="row.sell.planets[0].source" />
					</template>
					<template #cell-planets="{ row }">
						<template v-if="row.planets.length <= USED_ON_SHOWN">
							{{ names(row.planets) }}
						</template>
						<PTooltip v-else>
							<template #trigger>
								<span tabindex="0">
									{{ names(row.planets.slice(0, USED_ON_SHOWN)) }}
									<span class="text-muted">
										{{
											$t("exchanges.overview.used_on_more", {
												n: row.planets.length - USED_ON_SHOWN,
											})
										}}
									</span>
								</span>
							</template>
							{{ names(row.planets) }}
						</PTooltip>
					</template>
					<template #expand="{ row }">
						<div class="flex flex-col gap-4 py-2">
							<div
								v-for="l in ladders(row)"
								:key="`${l.type}#${l.planet}`"
								class="flex flex-col sm:flex-row gap-x-6 gap-y-1">
								<div class="sm:w-40 shrink-0 text-muted">
									{{
										$t("exchanges.overview.side_planet", {
											side: $t(
												`exchanges.overview.side.${l.type}`
											),
											planet: planetName(l.planet, l.planet),
										})
									}}
								</div>
								<CXPriceLadder
									class="grow"
									:cx-data="pricedData"
									:planet="l.planet"
									:ticker="row.ticker"
									:type="l.type"
									@open="(s) => emit('open', s)" />
							</div>
						</div>
					</template>
					<template #empty>
						{{
							rows.length === 0
								? $t("exchanges.overview.empty")
								: $t("exchanges.overview.no_match")
						}}
					</template>
				</PDataTable>
			</template>
		</section>
	</div>
</template>
