<script setup lang="ts">
	import { ref, type Ref } from "vue";

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

	// Statics
	import { PLANETSEARCHOPTIONMATERIALS } from "@/features/planet_search/searchConstants";

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

	async function performSearchAndCalculation(): Promise<void> {
		if (refSearchMaterial.value) {
			trackEvent("resource_roi_overview", {
				materialTicker: refSearchMaterial.value,
			});

			refInitialized.value = true;
			refIsLoading.value = true;
			calculate(refSearchMaterial.value).finally(
				() => (refIsLoading.value = false)
			);
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
					class="px-6 py-3 border-b border-white/10 flex flex-row justify-between">
					<h1 class="text-2xl font-bold my-auto grow">
						{{ $t("resource_roi.title") }}
					</h1>
					<div
						class="flex flex-row flex-wrap gap-3 my-auto child:my-auto">
						<div>{{ $t("resource_roi.resource_select") }}</div>
						<PSelect
							v-model:value="refSearchMaterial"
							:aria-label="$t('resource_roi.resource_select')"
							:options="PLANETSEARCHOPTIONMATERIALS"
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
						<HelpDrawer file-name="tools_resource_roi_overview" />
					</div>
				</div>

				<div class="px-6 py-3">
					<div v-if="!refInitialized" class="text-center py-3">
						{{ $t("resource_roi.info") }}
					</div>
					<div
						v-else-if="refIsLoading"
						class="flex justify-center child:w-100 py-3">
						<div class="text-center">
							<div v-if="progressSearchingPlanets">
								<PSpin size="xl" />
								<div class="pt-3 text-xs text-white/60">
									{{
										$t("resource_roi.calculating", {
											resource: refSearchMaterial,
										})
									}}
								</div>
							</div>
							<div v-else>
								<PProgressBar
									:step="progressCurrent"
									:total="progressTotal" />
								<div class="pt-3 text-xs text-white/60">
									{{ $t("resource_roi.calculating") }}
								</div>
							</div>
						</div>
					</div>
					<div v-else>
						<ResourceROITable
							v-if="refSearchMaterial"
							:searched-material="refSearchMaterial"
							:result-data="resultData" />
					</div>
				</div>
			</div>
		</WrapperPlanningDataLoader>
	</WrapperGameDataLoader>
</template>
