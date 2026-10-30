<script setup lang="ts">
	import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { usePlanetData } from "@/database/services/usePlanetData";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { priceSourceLabel } from "@/features/exchanges/exchangeLabel.util";
	import {
		fromRows,
		toRows,
		type IFixedPriceRow,
	} from "@/features/exchanges/fixedPrices.util";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import type { CXDataTickerOption } from "@/features/api/schemas/cxData.schemas";
	import type { IPriceSource, PriceType } from "@/features/cx/priceBook";
	import type { IMaterialCOGM } from "@/features/exchanges/useExchangePlanData.types";

	// UI
	import {
		PButton,
		PInput,
		PInputNumber,
		PSelect,
		PTag,
		PTooltip,
	} from "@/ui";
	import { AddSharp, ClearSharp } from "@vicons/material";

	/*
	 * Fixed prices of one scope, one row per material: buy and sell (empty
	 * uses the exchange price), the market price without the fixed one, and
	 * with COGMs the lowest COGM in the linked plans with "Use". Keeps the
	 * stored shape (see fixedPrices.util). Shared by Exchanges and COGM.
	 */
	const prices = defineModel<CXDataTickerOption[]>("prices", {
		required: true,
	});

	const {
		inherited = [],
		cogms = undefined,
		marketPrice,
		location,
	} = defineProps<{
		// all-planets fixed prices shown muted on a planet, with Override
		inherited?: CXDataTickerOption[];
		// shows the COGM column
		cogms?: Map<string, IMaterialCOGM>;
		// the price without any fixed price for the material
		marketPrice: (
			ticker: string,
			type: PriceType
		) => { price: number; source: IPriceSource };
		location: "exchanges_view" | "cogm";
	}>();

	const { t } = useI18n();
	const { materialSelectOptions } = useMaterialData();
	const { planetName } = usePlanetData();

	// what stored prices can't hold: an empty row (new, or both sides
	// cleared) at its place, and the shape each row was stored with
	const emptyRows = ref<{ row: IFixedPriceRow; at: number }[]>([]);
	const shapes = ref<Record<string, IFixedPriceRow["stored"]>>({});

	const sameOptions = (a: CXDataTickerOption[], b: CXDataTickerOption[]) =>
		a.length === b.length &&
		a.every(
			(o, i) =>
				o.ticker === b[i].ticker &&
				o.type === b[i].type &&
				o.value === b[i].value
		);

	// the prices this table wrote last; others came from outside (a
	// discard, a reload), the local state goes with them
	let written: CXDataTickerOption[] = prices.value;
	watch(
		prices,
		(stored) => {
			if (sameOptions(stored, written)) return;
			written = stored;
			emptyRows.value = [];
			shapes.value = {};
		},
		{ deep: true }
	);

	const rows = computed<IFixedPriceRow[]>({
		get: () => {
			const list = toRows(prices.value).map((row) => {
				const shape = shapes.value[row.ticker];
				const own = shape ? { ...row, stored: shape } : undefined;
				// a row keeps its shape while it stores the same options
				return own && sameOptions(fromRows([own]), fromRows([row]))
					? own
					: row;
			});
			for (const { row, at } of emptyRows.value)
				if (!list.some((r) => r.ticker === row.ticker))
					list.splice(at, 0, row);
			return list;
		},
		set: (next) => {
			// the getter already applied each row's shape
			shapes.value = Object.fromEntries(
				next.map((r) => [r.ticker, r.stored])
			);
			emptyRows.value = next.flatMap((row, at) =>
				row.buy === null && row.sell === null ? [{ row, at }] : []
			);
			written = fromRows(next);
			prices.value = written;
		},
	});

	function setSide(
		row: IFixedPriceRow,
		side: "buy" | "sell",
		v: number | null
	) {
		rows.value = rows.value.map((r) =>
			r.ticker === row.ticker ? { ...r, [side]: v } : r
		);
	}

	function remove(ticker: string): void {
		rows.value = rows.value.filter((r) => r.ticker !== ticker);
	}

	const tableRef = useTemplateRef<HTMLElement>("table");

	async function add(
		ticker: string,
		buy: number | null = null,
		sell: number | null = null
	): Promise<void> {
		if (rows.value.some((r) => r.ticker === ticker)) return;
		rows.value = [...rows.value, { ticker, buy, sell, stored: "new" }];
		await nextTick();
		tableRef.value
			?.querySelector<HTMLInputElement>(`[data-buy="${ticker}"] input`)
			?.focus();
	}

	const newTicker = ref<string | null>(null);
	const addOptions = computed(() =>
		materialSelectOptions.value.filter(
			(o) => !rows.value.some((r) => r.ticker === o.value)
		)
	);
	async function addSelected(): Promise<void> {
		if (!newTicker.value) return;
		await add(newTicker.value);
		newTicker.value = null;
	}

	// market for the side the row fixes, buy first
	function market(row: IFixedPriceRow) {
		const type: PriceType =
			row.buy === null && row.sell !== null ? "SELL" : "BUY";
		const fixed = type === "BUY" ? row.buy : row.sell;
		const { price, source } = marketPrice(row.ticker, type);
		const diff =
			fixed !== null && price > 0
				? ((fixed - price) / price) * 100
				: null;
		return { price, source, diff };
	}

	const round2 = (v: number) => Math.round(v * 100) / 100;

	function cogmOf(ticker: string) {
		const cogm = cogms?.get(ticker);
		if (!cogm) return undefined;
		const plans = new Set(cogm.entries.map((e) => e.planUuid)).size;
		const lowest = cogm.entries.find((e) => e.value === cogm.value)!;
		return {
			value: round2(cogm.value),
			plans,
			lowest,
			entries: cogm.entries,
		};
	}

	function useCOGM(row: IFixedPriceRow, value: number): void {
		setSide(row, "buy", value);
		trackEvent("exchange:use_cogm", {
			location,
			material_ticker: row.ticker,
		});
	}

	// search and sort once the list is long
	const SEARCH_FROM = 10;
	const search = ref("");
	const sortBy = ref<string>("material");
	const sortOptions = computed(() => [
		{ label: t("exchanges.fixed.sort_material"), value: "material" },
		{ label: t("exchanges.fixed.sort_diff"), value: "diff" },
	]);

	const shownRows = computed(() => {
		let list = rows.value;
		if (rows.value.length < SEARCH_FROM) return list;
		const q = search.value.trim().toUpperCase();
		if (q) list = list.filter((r) => r.ticker.includes(q));
		return [...list].sort((a, b) =>
			sortBy.value === "material"
				? a.ticker.localeCompare(b.ticker)
				: (market(a).diff ?? Infinity) - (market(b).diff ?? Infinity)
		);
	});

	const view = computed(() =>
		shownRows.value.map((row) => ({
			row,
			m: market(row),
			c: cogmOf(row.ticker),
		}))
	);

	const inheritedRows = computed(() =>
		toRows(inherited).filter(
			(r) => !rows.value.some((own) => own.ticker === r.ticker)
		)
	);

	const showCOGM = computed(() => cogms !== undefined);
</script>

<template>
	<div class="flex flex-col gap-3">
		<div
			v-if="rows.length >= SEARCH_FROM"
			class="flex flex-wrap items-center gap-3">
			<PInput
				v-model:value="search"
				class="w-48"
				:aria-label="$t('exchanges.fixed.search')"
				:placeholder="$t('exchanges.fixed.search')" />
			<PSelect
				v-model:value="sortBy"
				class="w-48"
				:aria-label="$t('exchanges.fixed.sort')"
				:options="sortOptions" />
		</div>

		<div ref="table" class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="text-muted text-left">
					<tr
						class="child:py-2 child:pr-3 child:whitespace-nowrap border-b border-white/10">
						<th scope="col">
							{{ $t("exchanges.fixed.material") }}
						</th>
						<th scope="col" class="text-right">
							{{ $t("exchanges.fixed.buy") }}
						</th>
						<th scope="col" class="text-right">
							{{ $t("exchanges.fixed.sell") }}
						</th>
						<th scope="col">{{ $t("exchanges.fixed.market") }}</th>
						<th v-if="showCOGM" scope="col">
							{{ $t("exchanges.fixed.cogm") }}
						</th>
						<th scope="col">
							<span class="sr-only">
								{{ $t("exchanges.fixed.actions") }}
							</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="{ row, m, c } in view"
						:key="row.ticker"
						class="child:py-1.5 child:pr-3 border-b border-white/5">
						<td><MaterialTile :ticker="row.ticker" /></td>
						<td class="w-28 min-w-24" :data-buy="row.ticker">
							<PInputNumber
								decimals
								size="sm"
								:min="0"
								:value="row.buy"
								:placeholder="
									$t('exchanges.fixed.exchange_placeholder')
								"
								:aria-label="
									$t('exchanges.fixed.buy_label', {
										ticker: row.ticker,
									})
								"
								@update:value="
									(v) => setSide(row, 'buy', v ?? null)
								" />
						</td>
						<td class="w-28 min-w-24">
							<PInputNumber
								decimals
								size="sm"
								:min="0"
								:value="row.sell"
								:placeholder="
									$t('exchanges.fixed.exchange_placeholder')
								"
								:aria-label="
									$t('exchanges.fixed.sell_label', {
										ticker: row.ticker,
									})
								"
								@update:value="
									(v) => setSide(row, 'sell', v ?? null)
								" />
						</td>
						<td class="text-muted whitespace-nowrap">
							<div>
								<span class="tabular-nums text-white">
									{{ formatNumber(m.price) }}
								</span>
								<template v-if="m.diff !== null">
									·
									<span class="tabular-nums">
										{{ m.diff > 0 ? "+" : ""
										}}{{ formatNumber(m.diff, 0) }} %
									</span>
								</template>
							</div>
							<div class="text-xs">
								{{ priceSourceLabel(m.source, t) }}
							</div>
						</td>
						<td v-if="showCOGM" class="whitespace-nowrap">
							<span v-if="!c" class="text-muted">—</span>
							<div v-else class="flex items-center gap-2">
								<PTooltip>
									<template #trigger>
										<span
											class="inline-block tabular-nums"
											tabindex="0">
											{{ formatNumber(c.value) }}
											<span
												class="block text-xs text-muted">
												{{
													c.plans > 1
														? $t(
																"exchanges.fixed.made_in",
																c.plans
															)
														: c.lowest.planName
												}}
											</span>
										</span>
									</template>
									<div
										v-for="e in c.entries"
										:key="`${e.planUuid}#${e.value}`">
										{{ e.planName }} ·
										{{ planetName(e.planet, e.planet) }} ·
										{{ formatNumber(e.value) }}
									</div>
								</PTooltip>
								<PTag
									v-if="row.buy === c.value"
									size="sm"
									type="success"
									:value="$t('exchanges.fixed.in_use')" />
								<PButton
									v-else
									size="sm"
									type="secondary"
									@click="useCOGM(row, c.value)">
									{{ $t("exchanges.fixed.use") }}
								</PButton>
							</div>
						</td>
						<td class="text-right">
							<PButton
								size="sm"
								type="error"
								:aria-label="
									$t('exchanges.fixed.remove', {
										ticker: row.ticker,
									})
								"
								@click="remove(row.ticker)">
								<template #icon><ClearSharp /></template>
							</PButton>
						</td>
					</tr>
					<tr
						v-for="row in inheritedRows"
						:key="`inherited#${row.ticker}`"
						class="child:py-1.5 child:pr-3 border-b border-white/5 text-muted">
						<td><MaterialTile :ticker="row.ticker" /></td>
						<td class="text-right tabular-nums">
							{{ row.buy === null ? "—" : formatNumber(row.buy) }}
						</td>
						<td class="text-right tabular-nums">
							{{
								row.sell === null ? "—" : formatNumber(row.sell)
							}}
						</td>
						<td :colspan="showCOGM ? 2 : 1">
							{{ $t("exchanges.fixed.inherited") }}
						</td>
						<td class="text-right">
							<PButton
								size="sm"
								type="secondary"
								@click="add(row.ticker, row.buy, row.sell)">
								{{ $t("exchanges.fixed.override") }}
							</PButton>
						</td>
					</tr>
					<tr v-if="rows.length === 0 && inheritedRows.length === 0">
						<td :colspan="showCOGM ? 6 : 5" class="py-3 text-muted">
							{{ $t("exchanges.fixed.empty") }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<PSelect
				v-model:value="newTicker"
				searchable
				class="w-40"
				:aria-label="$t('exchanges.fixed.add_select')"
				:placeholder="$t('exchanges.fixed.add_select')"
				:options="addOptions" />
			<PButton
				type="secondary"
				:disabled="!newTicker"
				@click="addSelected">
				<template #icon><AddSharp /></template>
				{{ $t("exchanges.fixed.add") }}
			</PButton>
		</div>
	</div>
</template>
