<script setup lang="ts">
	import { type PropType, computed, ref, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import EmpireMaterialIOSummaryCell from "@/features/empire/components/EmpireMaterialIOSummaryCell.vue";
	import EmpireMaterialIODetail from "@/features/empire/components/EmpireMaterialIODetail.vue";
	import MarketFlagButton from "@/features/cx/components/MarketFlagButton.vue";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	const { planetNames, loadPlanetNames } = usePlanetData();

	// Util
	import { formatNumber } from "@/util/numbers";
	import { summarizeSide } from "@/features/empire/util/empireMaterialIO.util";
	import { flaggedCheck } from "@/features/cx/marketCheck.util";

	// UI
	import { PDataTable, PValue } from "@/ui";

	// Types & Interfaces
	import type {
		IEmpireMaterialIO,
		IEmpireMaterialIOSide,
	} from "@/features/empire/empire.types";
	import type { IMarketCheck } from "@/features/cx/marketCheck.types";

	import type { PDataTableColumn } from "@/ui/ui.types";

	const props = defineProps({
		empireMaterialIO: {
			type: Array as PropType<IEmpireMaterialIO[]>,
			required: true,
		},
		// market flags of the empire's net flow per ticker
		checks: {
			type: Object as PropType<Map<string, IMarketCheck>>,
			required: false,
			default: undefined,
		},
		// each plan's own share per flagged ticker
		planShares: {
			type: Object as PropType<
				Map<string, { name: string; sharePct: number | null }[]>
			>,
			required: false,
			default: undefined,
		},
	});

	const flagged = (ticker: string) => flaggedCheck(props.checks, ticker);

	const expandAll = defineModel<boolean>("expandAll", { default: false });

	// Local State
	const localEmpireMaterialIO = computed(() => props.empireMaterialIO);
	const expandedKeys = ref<string[]>([]);
	const detailView = ref<"sides" | "net">("sides");

	/** per ticker: both sides summarized against the row's larger side */
	const summaries = computed(
		() =>
			new Map<
				string,
				{ output: IEmpireMaterialIOSide; input: IEmpireMaterialIOSide }
			>(
				props.empireMaterialIO.map((r) => {
					const scale = Math.max(r.output, r.input);
					return [
						r.ticker,
						{
							output: summarizeSide(r.outputPlanets, "output", scale),
							input: summarizeSide(r.inputPlanets, "input", scale),
						},
					];
				})
			)
	);

	/*
	 * Expand all opens every visible row, Summary calls collapseAll (also
	 * when Summary is already selected). Collapsing one row after Expand
	 * all switches back to Summary but keeps the others open.
	 */
	const openAll = () =>
		(expandedKeys.value = props.empireMaterialIO.map((r) => r.ticker));

	function collapseAll(): void {
		expandedKeys.value = [];
	}

	defineExpose({ collapseAll });

	watch(expandAll, (all) => {
		if (all) openAll();
	});

	watch(
		() => props.empireMaterialIO,
		() => {
			if (expandAll.value) openAll();
		},
		{ immediate: true }
	);

	function updateExpanded(keys: (string | number)[]): void {
		if (expandAll.value && keys.length < expandedKeys.value.length)
			expandAll.value = false;
		if (keys.length > expandedKeys.value.length)
			trackEvent("empire:material_io_expand");
		expandedKeys.value = keys.map(String);
	}

	watch(
		() => props.empireMaterialIO,
		async () =>
			await loadPlanetNames(
				Array.from(
					new Set(
						props.empireMaterialIO
							.map((e) => [
								...e.inputPlanets.map((p) => p.planetId).flat(),
								...e.outputPlanets
									.map((p) => p.planetId)
									.flat(),
							])
							.flat()
					)
				)
			),
		{ immediate: true }
	);

	const columns = computed<PDataTableColumn<IEmpireMaterialIO>[]>(() => {
		const numeric = (key: string, title: string) => ({
			key,
			title: t(title),
			align: "right" as const,
			sorter: true as const,
		});
		return [
			{ key: "ticker", title: t("terms.material_ticker"), sorter: true },
			numeric("delta", "terms.delta"),
			numeric("output", "terms.production"),
			numeric("input", "terms.consumption"),
			numeric("deltaPrice", "terms.delta_price"),
			{
				key: "outputPlanets",
				title: t("empire.material_io.produced_by"),
				minWidth: 200,
			},
			{
				key: "inputPlanets",
				title: t("empire.material_io.consumed_by"),
				minWidth: 200,
			},
		];
	});

	// stable, inline functions re-render the whole table
	const rowKey = (row: IEmpireMaterialIO) => row.ticker;
	const expandLabel = (row: IEmpireMaterialIO) =>
		t("empire.material_io.expand_row", { ticker: row.ticker });
</script>

<template>
	<div class="flex-1 min-h-0">
		<PDataTable
			:columns="columns"
			:data="localEmpireMaterialIO"
			:row-key="rowKey"
			:expanded-row-keys="expandedKeys"
			:expand-label="expandLabel"
			striped
			fill
			:min-width="960"
			@update:expanded-row-keys="updateExpanded">
			<template #cell-ticker="{ row }">
				<div class="flex items-center gap-1">
					<MaterialTile
						:key="row.ticker"
						:ticker="row.ticker"
						:daily="row.delta"
						daily-context="empire"
						:market-check="checks?.get(row.ticker)"
						popover-placement="right" />
					<MarketFlagButton
						v-if="flagged(row.ticker)"
						:check="flagged(row.ticker)!"
						where="empire"
						:plan-shares="planShares?.get(row.ticker)" />
				</div>
			</template>
			<template #cell-delta="{ row }">
				<PValue class="text-nowrap" :value="row.delta" />
			</template>
			<template #cell-output="{ row }">
				<span
					class="text-nowrap"
					:class="row.output <= 0 ? 'text-muted' : ''">
					{{ formatNumber(row.output) }}
				</span>
			</template>
			<template #cell-input="{ row }">
				<span
					class="text-nowrap"
					:class="row.input <= 0 ? 'text-muted' : ''">
					{{ formatNumber(row.input) }}
				</span>
			</template>
			<template #cell-deltaPrice="{ row }">
				<PValue class="text-nowrap" :value="row.deltaPrice" />
			</template>
			<template #cell-outputPlanets="{ row }">
				<EmpireMaterialIOSummaryCell
					:side="summaries.get(row.ticker)!.output"
					:planet-names="planetNames" />
			</template>
			<template #cell-inputPlanets="{ row }">
				<EmpireMaterialIOSummaryCell
					:side="summaries.get(row.ticker)!.input"
					:planet-names="planetNames" />
			</template>
			<template #expand="{ row }">
				<EmpireMaterialIODetail
					v-model:view="detailView"
					:row="row"
					:planet-names="planetNames" />
			</template>
		</PDataTable>
	</div>
</template>

