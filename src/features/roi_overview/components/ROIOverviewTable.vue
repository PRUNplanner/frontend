<script setup lang="ts">
	import {
		type ComputedRef,
		type PropType,
		type Ref,
		computed,
		onMounted,
		ref,
		watch,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useROIOverview } from "@/features/roi_overview/useROIOverview";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { formatNumber, formatPayback } from "@/util/numbers";
	import { capitalizeString } from "@/util/text";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import COGMButton from "@/features/roi_overview/components/COGMButton.vue";
	import ROIOverviewTableFilters from "@/features/roi_overview/components/ROIOverviewTableFilters.vue";

	// Types & Interfaces
	import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
	import type { IROIResult } from "@/features/roi_overview/useROIOverview.types";
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import { PDataTable, PProgressBar, PValue } from "@/ui";
	import type { PDataTableColumn } from "@/ui/ui.types";

	const props = defineProps({
		planDefinition: {
			type: Object as PropType<IPlanDefinition>,
			required: true,
		},
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const definition: ComputedRef<IPlanDefinition> = computed(
		() => props.planDefinition
	);
	const cx: ComputedRef<string | undefined> = computed(() => props.cxUuid);

	const result: Ref<IROIResult[]> = ref([]);
	const isCalculating: Ref<boolean> = ref(true);

	const filterBuilding: Ref<string[]> = ref([]);
	const filterCOGC: Ref<string[]> = ref([]);
	const filterOutputMaterial: Ref<string[]> = ref([]);
	const filterInputMaterial: Ref<string[]> = ref([]);
	const filterPostiveROI: Ref<boolean> = ref(false);

	const { calculate, formatOptimal, progressCurrent, progressTotal } =
		useROIOverview(definition, cx);

	const filteredResult: ComputedRef<IROIResult[]> = computed(() => {
		let filtered = result.value;

		if (filterBuilding.value.length > 0)
			filtered = filtered.filter((f) =>
				filterBuilding.value.includes(f.buildingTicker)
			);

		if (filterCOGC.value.length > 0)
			filtered = filtered.filter((f) =>
				filterCOGC.value.includes(f.cogc)
			);

		if (filterOutputMaterial.value.length > 0)
			filtered = filtered.filter((f) =>
				f.recipeOutputs.some((e) =>
					filterOutputMaterial.value.includes(e.material_ticker)
				)
			);

		if (filterInputMaterial.value.length > 0)
			filtered = filtered.filter((f) =>
				f.recipeInputs.some((e) =>
					filterInputMaterial.value.includes(e.material_ticker)
				)
			);

		if (filterPostiveROI.value)
			filtered = filtered.filter((f) => f.planROI >= 0);

		return filtered;
	});

	const filterOptionBuilding: ComputedRef<PSelectOption[]> = computed(() =>
		Array.from(new Set(result.value.map((e) => e.buildingTicker)))
			.sort((a, b) => (a > b ? 1 : -1))
			.map((e) => ({ label: e, value: e }))
	);

	const filterOptionCOGC: ComputedRef<PSelectOption[]> = computed(() =>
		Array.from(new Set(result.value.map((e) => e.cogc)))
			.sort()
			.map((e) => ({ label: capitalizeString(e), value: e }))
	);

	const filterOptionInputMaterial: ComputedRef<PSelectOption[]> = computed(
		() =>
			Array.from(
				new Set(
					result.value
						.map((e) =>
							e.recipeInputs.map((e) => e.material_ticker)
						)
						.flat()
				)
			)
				.sort()
				.map((e) => ({ label: e, value: e }))
	);

	const filterOptionOutputMaterial: ComputedRef<PSelectOption[]> = computed(
		() =>
			Array.from(
				new Set(
					result.value
						.map((e) =>
							e.recipeOutputs.map((e) => e.material_ticker)
						)
						.flat()
				)
			)
				.sort()
				.map((e) => ({ label: e, value: e }))
	);

	async function get() {
		isCalculating.value = true;
		result.value = [];

		calculate().then(
			(d) => {
				// undefined: a newer calculation took over
				if (d === undefined) return;
				result.value = d;
				isCalculating.value = false;
				trackEvent("tool:use", { tool_name: "recipe_roi" });
			},
			() => (isCalculating.value = false)
		);
	}

	// watch for cx change, must retrigger calculation
	watch(
		() => props.cxUuid,
		async () => {
			get();
		}
	);

	// trigger initial calculation on load
	onMounted(async () => {
		get();
	});

	const columns = computed<PDataTableColumn<IROIResult>[]>(() => {
		const title = (key: string) => t(`recipe_roi.table.${key}`);
		const numeric = (key: string, titleKey: string) => ({
			key,
			title: title(titleKey),
			align: "right" as const,
			sorter: true as const,
		});
		return [
			{ key: "buildingTicker", title: title("building"), sorter: true },
			{ key: "optimalSetup", title: title("optimal_setup") },
			{ key: "recipeOutputs", title: title("recipe_output") },
			{ key: "recipeInputs", title: title("recipe_input") },
			{ key: "cogc", title: title("cogc") },
			{ key: "cogm", title: title("cogm") },
			numeric("planCost", "plan_cost"),
			numeric("dailyProfit", "daily_profit"),
			numeric("planProfitArea", "profit_area"),
			numeric("planROI", "plan_roi"),
		];
	});
</script>

<template>
	<div v-if="isCalculating" class="w-full flex justify-center">
		<div class="text-center w-100 py-3">
			<PProgressBar :step="progressCurrent" :total="progressTotal" />
			<div class="pt-3 text-xs text-muted">
				{{ $t("recipe_roi.calculating") }}
			</div>
		</div>
	</div>
	<div v-else>
		<ROIOverviewTableFilters
			v-model:filter-building="filterBuilding"
			v-model:filter-cogc="filterCOGC"
			v-model:filter-output-material="filterOutputMaterial"
			v-model:filter-input-material="filterInputMaterial"
			v-model:filter-positive-r-o-i="filterPostiveROI"
			:building-options="filterOptionBuilding"
			:cogc-options="filterOptionCOGC"
			:output-material-options="filterOptionOutputMaterial"
			:input-material-options="filterOptionInputMaterial" />
		<PDataTable
			:columns="columns"
			:data="filteredResult"
			striped
			:page-size="50">
			<template #cell-buildingTicker="{ row }">
				<span class="font-bold">{{ row.buildingTicker }}</span>
			</template>
			<template #cell-optimalSetup="{ row }">
				{{ formatOptimal(row.optimalSetup) }}
			</template>
			<template #cell-recipeOutputs="{ row }">
				<div class="flex flex-row flex-wrap gap-1">
					<MaterialTile
						v-for="output in row.recipeOutputs"
						:key="`${row.buildingTicker}#output#${output.material_ticker}`"
						:ticker="output.material_ticker"
						:amount="output.material_amount"
						:daily="
							output.material_amount *
							row.optimalSetup.amount *
							row.dailyRuns *
							1.25
						"
						daily-context="setup"
						popover-placement="right" />
				</div>
			</template>
			<template #cell-recipeInputs="{ row }">
				<div class="flex flex-row flex-wrap gap-1">
					<MaterialTile
						v-for="input in row.recipeInputs"
						:key="`${row.buildingTicker}#input#${input.material_ticker}`"
						:ticker="input.material_ticker"
						:amount="input.material_amount"
						:daily="
							-input.material_amount *
							row.optimalSetup.amount *
							row.dailyRuns *
							1.25
						"
						daily-context="setup"
						popover-placement="right" />
				</div>
			</template>
			<template #cell-cogc="{ row }">
				<span class="text-nowrap">
					{{ capitalizeString(row.cogc) }}
				</span>
			</template>
			<template #cell-cogm="{ row }">
				<COGMButton :cogm-data="row.cogm" />
			</template>
			<template #cell-planCost="{ row }">
				<span class="text-nowrap">
					{{ formatNumber(row.planCost) }}
				</span>
			</template>
			<template #cell-dailyProfit="{ row }">
				<PValue class="text-nowrap" :value="row.dailyProfit" />
			</template>
			<template #cell-planProfitArea="{ row }">
				<PValue
					class="text-nowrap"
					:value="row.planProfitArea" />
			</template>
			<template #cell-planROI="{ row }">
				<span
					class="text-nowrap"
					:class="
						row.planROI > 0
							? 'text-positive'
							: 'text-negative'
					">
					{{ formatPayback(row.planROI, false) }}
				</span>
			</template>
		</PDataTable>
	</div>
</template>
