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
	import { countLevels, flaggedCheck } from "@/features/cx/marketCheck.util";

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
		// value column: ȼ, t or m³ per day
		value: {
			type: String as PropType<"price" | "weight" | "volume">,
			required: false,
			default: "price",
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
		// the fixed table shares the width equally: the tile (and its flag)
		// needs less, the value per day (+2,480,862.73) more
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
		class="[&_td.numeric]:whitespace-nowrap [&_td.numeric]:[word-break:normal] pointer-coarse:[&_th]:h-11 pointer-coarse:[&_td]:h-11 [&_.material-tile]:touch-target"
		:columns="columns"
		:data="localMaterialIOData"
		:max-height="maxHeight"
		striped>
		<!-- the ticker title is visually empty, as before, but names the sort button -->
		<template #header-ticker>
			<span class="sr-only">{{ t("terms.material_ticker") }}</span>
		</template>
		<template #cell-ticker="{ row }">
			<div class="flex items-center gap-0.5 [&_[data-market-flag]]:-mr-2">
				<MaterialTile
					:key="`MATERIALIO#MATERIALTILE#${row.ticker}`"
					:ticker="row.ticker"
					:daily="row.delta"
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
	</PDataTable>
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
