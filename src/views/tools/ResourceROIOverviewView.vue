<script setup lang="ts">
	import { computed, ref, type Ref, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: `${t("resource_roi.view_title")} | PRUNplanner`,
	});

	// Composables
	import { useResourceROIOverview } from "@/features/resource_roi_overview/useResourceROIOverview";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import { PProgressBar } from "@/ui";
	import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";
	import ResourceROITable from "@/features/resource_roi_overview/components/ResourceROITable.vue";
	import ResourceROIChartDrawer from "@/features/resource_roi_overview/components/ResourceROIChartDrawer.vue";
	import { InsightsSharp } from "@vicons/material";

	// Types & Interfaces
	import type { IResourceROIResult } from "@/features/resource_roi_overview/useResourceROIOverview.types";

	// Statics
	import { RESOURCE_MATERIAL_OPTIONS } from "@/features/resource_roi_overview/resourceROIOverview.constants";

	// UI
	import { PSelect, PButton, PSpin } from "@/ui";

	const refInitialized: Ref<boolean> = ref(false);
	const refSelectedCXUuid: Ref<string | undefined> = ref(undefined);
	const refSearchMaterial: Ref<string | undefined> = ref(undefined);
	const refIsLoading: Ref<boolean> = ref(false);

	const {
		resultData,
		calculate,
		progressCurrent,
		progressTotal,
		progressSearchingPlanets,
	} = useResourceROIOverview(refSelectedCXUuid);

	/*
	 * Chart drawer: open state kept in this browser
	 */
	const CHART_KEY = "prunplanner_resource_roi_chart";
	function readChartOpen(): boolean {
		try {
			return localStorage.getItem(CHART_KEY) === "1";
		} catch {
			return false;
		}
	}
	const refChartOpen: Ref<boolean> = ref(readChartOpen());
	watch(refChartOpen, (open) => {
		if (open) trackEvent("resource_roi:chart_open");
		try {
			localStorage.setItem(CHART_KEY, open ? "1" : "0");
		} catch {
			// storage blocked: open for this page only
		}
	});
	const hasResults = computed(
		() => !refIsLoading.value && resultData.value.length > 0
	);
	const refFilteredRows: Ref<IResourceROIResult[]> = ref([]);
	const refActive: Ref<string | null> = ref(null);

	// a dot hovered in the chart brings its row into view above the drawer
	const refTableBox: Ref<HTMLElement | null> = ref(null);
	watch(refActive, (key) => {
		const row = key
			? refTableBox.value?.querySelector(
					`tr[data-row-key="${CSS.escape(key)}"]`
				)
			: null;
		if (!row) return;
		const drawer = document.querySelector("[data-roi-chart]");
		const bottom = drawer?.getBoundingClientRect().top ?? window.innerHeight;
		const rect = row.getBoundingClientRect();
		if (rect.top >= 0 && rect.bottom <= bottom) return;
		window.scrollBy({ top: rect.top + rect.height / 2 - bottom / 2 });
	});

	async function performSearchAndCalculation(): Promise<void> {
		const materialTicker = refSearchMaterial.value;
		if (materialTicker) {
			refInitialized.value = true;
			refIsLoading.value = true;
			calculate(materialTicker)
				.then(() =>
					trackEvent("tool:use", {
						tool_name: "resource_roi",
						material_ticker: materialTicker,
					})
				)
				.finally(() => (refIsLoading.value = false));
		}
	}
</script>

<template>
	<WrapperGameDataLoader
		load-exchanges
		load-materials
		load-buildings
		load-recipes>
		<WrapperPlanningDataLoader
			load-c-x
			@update:cx-uuid="(d) => (refSelectedCXUuid = d)">
			<div class="min-h-screen flex flex-col">
				<div
					class="px-6 py-3 border-b border-white/10 flex flex-row flex-wrap gap-x-6 gap-y-2 justify-between">
					<h1 class="text-2xl font-bold my-auto grow whitespace-nowrap">
						{{ $t("resource_roi.title") }}
					</h1>
					<div
						class="flex flex-row flex-wrap gap-3 my-auto child:my-auto">
						<div>{{ $t("resource_roi.resource_select") }}</div>
						<PSelect
							v-model:value="refSearchMaterial"
							:aria-label="$t('resource_roi.resource_select')"
							:options="RESOURCE_MATERIAL_OPTIONS"
							placeholder=""
							searchable
							class="w-50" />
						<div>{{ $t("resource_roi.cx_select") }}</div>
						<CXPreferenceSelector
							:aria-label="$t('resource_roi.cx_select')"
							:cx-uuid="refSelectedCXUuid"
							class="w-50"
							@update:cxuuid="
								(value) => (refSelectedCXUuid = value)
							" />
						<PButton
							:disabled="!refSearchMaterial"
							:loading="refIsLoading"
							@click="performSearchAndCalculation">
							{{ $t("resource_roi.button_calculate") }}
						</PButton>
						<PButton
							:pressed="refChartOpen && hasResults"
							:disabled="!hasResults"
							@click="refChartOpen = !refChartOpen">
							<template #icon><InsightsSharp /></template>
							{{ $t("resource_roi.chart.button") }}
						</PButton>
						<HelpDrawer file-name="tools_resource_roi_overview" />
					</div>
				</div>

				<div ref="refTableBox" class="grow px-6 py-3">
					<div v-if="!refInitialized" class="text-center py-3">
						{{ $t("resource_roi.info") }}
					</div>
					<div
						v-else-if="refIsLoading"
						class="flex justify-center child:w-100 py-3">
						<div class="text-center">
							<div v-if="progressSearchingPlanets">
								<PSpin size="xl" />
								<div class="pt-3 text-xs text-muted">
									{{
										$t("resource_roi.searching", {
											resource: refSearchMaterial,
										})
									}}
								</div>
							</div>
							<div v-else>
								<PProgressBar
									:step="progressCurrent"
									:total="progressTotal" />
								<div class="pt-3 text-xs text-muted">
									{{ $t("resource_roi.calculating") }}
								</div>
							</div>
						</div>
					</div>
					<div v-else>
						<ResourceROITable
							v-if="refSearchMaterial"
							:searched-material="refSearchMaterial"
							:result-data="resultData"
							:active="refActive"
							@filtered="(rows) => (refFilteredRows = rows)" />
					</div>
				</div>
				<ResourceROIChartDrawer
					v-if="refChartOpen && hasResults"
					v-model:show="refChartOpen"
					v-model:active="refActive"
					data-roi-chart
					:rows="refFilteredRows" />
			</div>
		</WrapperPlanningDataLoader>
	</WrapperGameDataLoader>
</template>
