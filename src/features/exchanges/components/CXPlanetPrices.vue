<script setup lang="ts">
	import { computed, ref, watch } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import CXPriceLadder from "@/features/exchanges/components/CXPriceLadder.vue";
	import CXSourceTag from "@/features/exchanges/components/CXSourceTag.vue";

	// Types & Interfaces
	import type { CXData } from "@/features/api/schemas/cxData.schemas";
	import type { IPriceSource, PriceType } from "@/features/cx/priceBook";
	import type { IMaterialPriceRow } from "@/features/exchanges/useExchangePlanData.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable, PTag } from "@/ui";

	/*
	 * The prices one planet's plans get, one row per material and side,
	 * expandable to the cascade
	 */
	const { planet, planetLabel, rows, pricedData } = defineProps<{
		planet: string;
		planetLabel: string;
		rows: IMaterialPriceRow[];
		pricedData: CXData | undefined;
	}>();

	const emit = defineEmits<{
		(e: "open", scope: string): void;
	}>();

	const { t } = useI18n();

	interface IPlanetPriceRow {
		key: string;
		ticker: string;
		type: PriceType;
		price: number;
		source: IPriceSource;
	}

	const data = computed<IPlanetPriceRow[]>(() =>
		rows.flatMap((r) =>
			(["BUY", "SELL"] as const).flatMap((type) => {
				const p = (type === "BUY" ? r.buy : r.sell)?.planets.find(
					(e) => e.planet === planet
				);
				return p
					? [
							{
								key: `${r.ticker}#${type}`,
								ticker: r.ticker,
								type,
								...p,
							},
						]
					: [];
			})
		)
	);

	const columns = computed<PDataTableColumn<IPlanetPriceRow>[]>(() => [
		{ key: "ticker", title: t("exchanges.overview.columns.material") },
		{ key: "type", title: t("exchanges.rules.side") },
		{
			key: "price",
			title: t("exchanges.overview.columns.price"),
			align: "right",
		},
		{ key: "source", title: t("exchanges.overview.columns.source") },
	]);
	const rowKey = (r: IPlanetPriceRow) => r.key;
	const expandLabel = (r: IPlanetPriceRow) =>
		t("exchanges.overview.expand", { ticker: r.ticker });

	const expanded = ref<(string | number)[]>([]);
	watch(expanded, (now, before) =>
		now
			.filter((k) => !before.includes(k))
			.forEach((k) =>
				trackEvent("exchange:price_detail", {
					location: "exchanges_view",
					material_ticker: String(k).split("#")[0],
				})
			)
	);
</script>

<template>
	<section class="flex flex-col gap-3">
		<div class="flex flex-wrap items-baseline justify-between gap-3">
			<h3 class="text-lg font-bold">
				{{ $t("exchanges.rules.prices_on", { planet: planetLabel }) }}
			</h3>
			<span class="text-muted text-sm">
				{{ $t("exchanges.rules.prices_on_hint") }}
			</span>
		</div>
		<PDataTable
			v-model:expanded-row-keys="expanded"
			:columns="columns"
			:data="data"
			:row-key="rowKey"
			:expand-label="expandLabel">
			<template #cell-ticker="{ row }">
				<MaterialTile :ticker="row.ticker" />
			</template>
			<template #cell-type="{ row }">
				<PTag
					size="sm"
					:type="row.type === 'BUY' ? 'success' : 'error'"
					:value="$t(`exchanges.overview.side.${row.type}`)" />
			</template>
			<template #cell-price="{ row }">
				<span class="tabular-nums">{{ formatNumber(row.price) }}</span>
			</template>
			<template #cell-source="{ row }">
				<CXSourceTag :source="row.source" />
			</template>
			<template #expand="{ row }">
				<CXPriceLadder
					class="py-2"
					:cx-data="pricedData"
					:planet="planet"
					:ticker="row.ticker"
					:type="row.type"
					@open="(s) => emit('open', s)" />
			</template>
			<template #empty>
				{{ $t("exchanges.rules.prices_empty") }}
			</template>
		</PDataTable>
	</section>
</template>
