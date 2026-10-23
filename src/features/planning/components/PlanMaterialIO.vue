<script setup lang="ts">
	import { computed, type ComputedRef, type PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import MarketFlagButton from "@/features/cx/components/MarketFlagButton.vue";

	// Types & Interfaces
	import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";
	import type { IMarketCheck } from "@/features/cx/marketCheck.types";

	// Util
	import { formatNumber } from "@/util/numbers";
	import {
		countLevels,
		flaggedCheck,
		formatShare,
		MARKET_SHARE_AMBER,
		MARKET_SHARE_RED,
	} from "@/features/cx/marketCheck.util";

	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable, PValue } from "@/ui";

	const emit = defineEmits<{ (e: "open:planCheck"): void }>();

	const props = defineProps({
		materialIOData: {
			type: Array as PropType<IMaterialIO[]>,
			required: true,
		},
		// market flags per ticker, shown after the tile
		checks: {
			type: Object as PropType<Map<string, IMarketCheck>>,
			required: false,
			default: undefined,
		},
		// body height; the header stays fixed above it
		maxHeight: {
			type: String,
			required: false,
			default: undefined,
		},
		// value column: ȼ, t or m³ per day, or the share of the market
		value: {
			type: String as PropType<"price" | "weight" | "volume" | "share">,
			required: false,
			default: "price",
		},
		// every material's market check: its traded volumes, for the share
		market: {
			type: Object as PropType<Map<string, IMarketCheck>>,
			required: false,
			default: undefined,
		},
		// a narrow pane drops In and Out
		compact: {
			type: Boolean,
			required: false,
			default: false,
		},
		// all rows, or only exported (delta > 0) or imported ones
		filter: {
			type: String as PropType<"all" | "exports" | "imports">,
			required: false,
			default: "all",
		},
	});

	// Local State
	const localMaterialIOData: ComputedRef<IMaterialIO[]> = computed(() =>
		props.filter === "all"
			? props.materialIOData
			: props.materialIOData.filter((r) =>
					props.filter === "exports" ? r.delta > 0 : r.delta < 0
				)
	);

	const columns = computed<PDataTableColumn<IMaterialIO>[]>(() => {
		const numeric = (key: string, title: string, width?: number) => ({
			key,
			title: t(`plan.components.materialio.table.${title}`),
			align: "right" as const,
			sorter: true as const,
			width,
		});
		const shareColumn = (days: 7 | 30) => ({
			key: `share${days}d`,
			title: t(`plan.components.materialio.table.share_${days}d`),
			align: "right" as const,
			sorter: (a: IMaterialIO, b: IMaterialIO) =>
				(share(a, days) ?? -1) - (share(b, days) ?? -1),
		});
		// the fixed table shares the width equally: the tile (and its flag)
		// needs less, the value per day (+2,480,862.73) more
		if (props.value === "share")
			return [
				{ key: "ticker", title: "", sorter: true, width: 84 },
				numeric("delta", "delta"),
				shareColumn(7),
				shareColumn(30),
			];
		return [
			{ key: "ticker", title: "", sorter: true, width: 84 },
			...(props.compact
				? []
				: [numeric("input", "input"), numeric("output", "output")]),
			numeric("delta", "delta"),
			props.value === "weight"
				? numeric("totalWeight", "total_weight", 100)
				: props.value === "volume"
					? numeric("totalVolume", "total_volume", 100)
					: numeric("price", "cost_day", 100),
		];
	});

	const flagged = (ticker: string) => flaggedCheck(props.checks, ticker);

	// the row's Δ against the average daily volume of the last 7 or 30
	// days, in %; null without trades
	function share(row: IMaterialIO, days: 7 | 30): number | null {
		const check = props.market?.get(row.ticker);
		const traded = days === 7 ? check?.traded7d : check?.traded30d;
		return traded ? (Math.abs(row.delta) / (traded / days)) * 100 : null;
	}

	const shareClass = (pct: number | null): string =>
		pct === null
			? "text-muted"
			: pct >= MARKET_SHARE_RED
				? "text-negative"
				: pct >= MARKET_SHARE_AMBER
					? "text-warning"
					: "";

	// the volume exchange of the shares, the same for every material
	const shareExchange = computed(() => {
		const exchange = props.market?.values().next().value?.exchange;
		return !exchange || exchange === "UNIVERSE"
			? t("cx.market_flags.all_exchanges")
			: exchange;
	});

	const summary = computed(() => {
		if (!props.checks) return undefined;
		const { red, amber } = countLevels([...props.checks.values()]);
		const parts = [
			...(red
				? [t("cx.market_flags.summary.red", { n: red }, red)]
				: []),
			...(amber
				? [t("cx.market_flags.summary.amber", { n: amber }, amber)]
				: []),
		];
		return parts.length ? `${parts.join(", ")}.` : undefined;
	});
</script>

<template>
	<!-- numbers never break mid-digit in the narrow side column -->
	<PDataTable
		class="[&_td.numeric]:whitespace-nowrap [&_td.numeric]:[word-break:normal] pointer-coarse:[&_th]:h-11 pointer-coarse:[&_td]:h-11"
		:columns="columns"
		:data="localMaterialIOData"
		:max-height="maxHeight"
		striped>
		<template #header-ticker>
			{{ t("terms.material_ticker") }}
		</template>
		<template #cell-ticker="{ row }">
			<div class="flex items-center gap-0.5 [&_[data-market-flag]]:-mr-2">
				<MaterialTile
					:key="`MATERIALIO#MATERIALTILE#${row.ticker}`"
					:ticker="row.ticker"
					:daily="row.delta"
					:market-check="checks?.get(row.ticker)"
					:disable-drawer="false" />
				<MarketFlagButton
					v-if="flagged(row.ticker)"
					:check="flagged(row.ticker)!"
					open-link
					@open="emit('open:planCheck')" />
			</div>
		</template>
		<template #cell-input="{ row }">
			<span :class="row.input === 0 ? 'text-muted' : ''">
				{{ formatNumber(row.input) }}
			</span>
		</template>
		<template #cell-output="{ row }">
			<span :class="row.output === 0 ? 'text-muted' : ''">
				{{ formatNumber(row.output) }}
			</span>
		</template>
		<template #cell-delta="{ row }">
			<PValue :value="row.delta" />
		</template>
		<!-- may wrap: at phone width the column is too narrow -->
		<template #header-price>
			<span class="whitespace-normal">
				{{ t("plan.components.materialio.table.cost_day") }}
			</span>
		</template>
		<template #cell-price="{ row }">
			<PValue :value="row.price" />
		</template>
		<template #cell-totalWeight="{ row }">
			<PValue :value="row.totalWeight" />
		</template>
		<template #cell-totalVolume="{ row }">
			<PValue :value="row.totalVolume" />
		</template>
		<template #cell-share7d="{ row }">
			<span :class="shareClass(share(row, 7))">
				{{ formatShare(share(row, 7)) }}
			</span>
		</template>
		<template #cell-share30d="{ row }">
			<span :class="shareClass(share(row, 30))">
				{{ formatShare(share(row, 30)) }}
			</span>
		</template>
	</PDataTable>
	<p
		v-if="value === 'share'"
		class="px-3 pt-2 text-xs text-muted-strong"
		data-share-note>
		{{
			t("plan.components.materialio.share_note", {
				exchange: shareExchange,
			})
		}}
	</p>
	<p v-if="summary" class="px-3 pt-2 text-sm text-muted-strong" data-market-summary>
		{{ summary }}
		<button
			type="button"
			class="inline-flex items-center min-h-11 sm:min-h-6 text-link hover:underline cursor-pointer"
			@click="emit('open:planCheck')">
			{{ t("cx.market_flags.summary.link") }}
		</button>
	</p>
</template>
