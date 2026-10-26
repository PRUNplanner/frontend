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
		showBasked: {
			type: Boolean,
			required: true,
		},
	});

	// Local State
	const localMaterialIOData: ComputedRef<IMaterialIO[]> = computed(
		() => props.materialIOData
	);
	const localShowBasked: ComputedRef<boolean> = computed(
		() => props.showBasked
	);

	const columns = computed<PDataTableColumn<IMaterialIO>[]>(() => {
		const numeric = (key: string, title: string) => ({
			key,
			title: t(`plan.components.materialio.table.${title}`),
			align: "right" as const,
			sorter: true as const,
		});
		return [
			{ key: "ticker", title: "", sorter: true },
			numeric("input", "input"),
			numeric("output", "output"),
			numeric("delta", "delta"),
			...(localShowBasked.value
				? [
						numeric("totalWeight", "total_weight"),
						numeric("totalVolume", "total_volume"),
					]
				: [numeric("price", "cost_day")]),
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
		class="[&_td.numeric]:whitespace-nowrap [&_td.numeric]:[word-break:normal] [&_.p-data-table-title-text]:whitespace-normal!"
		:columns="columns"
		:data="localMaterialIOData"
		:max-height="maxHeight"
		striped>
		<!-- the ticker title is visually empty, as before, but names the sort button -->
		<template #header-ticker>
			<span class="sr-only">{{ t("terms.material_ticker") }}</span>
		</template>
		<template #cell-ticker="{ row }">
			<div class="flex flex-wrap items-center gap-1">
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
	</PDataTable>
	<p v-if="summary" class="pt-2 text-sm text-muted-strong" data-market-summary>
		{{ summary }}
		<button
			type="button"
			class="inline-flex items-center min-h-11 sm:min-h-6 text-link hover:underline cursor-pointer"
			@click="emit('open:planCheck')">
			{{ t("cx.market_flags.summary.link") }}
		</button>
	</p>
</template>
