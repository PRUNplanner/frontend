<script setup lang="ts">
	import { ComputedRef, computed, PropType, Ref, ref, watch } from "vue";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Components
	import PlanCOGMTable from "@/features/planning/components/tools/PlanCOGMTable.vue";
	import CXTickerPreference from "@/features/exchanges/components/CXTickerPreference.vue";

	// Types & Interfaces
	import { IProductionBuildingRecipeCOGM } from "@/features/planning/usePlanCalculation.types";
	import { ICX, ICXDataTickerOption } from "@/stores/planningStore.types";

	// UI
	import { PButtonGroup, PButton } from "@/ui";
	import { SaveSharp, ChangeCircleOutlined } from "@vicons/material";

	const props = defineProps({
		cogmData: {
			type: Object as PropType<IProductionBuildingRecipeCOGM>,
			required: true,
		},
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		planetId: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const planningStore = usePlanningStore();

	const data: ComputedRef<IProductionBuildingRecipeCOGM> = computed(
		() => props.cogmData
	);

	const showCX = computed(() => props.cxUuid && props.planetId);

	const selectedCX: Ref<ICX | null> = ref(null);
	// from store always, will not change but used on reload button
	const rawSelectedCX: Ref<ICX | null> = ref(null);

	const planetTickerCX: Ref<ICXDataTickerOption[]> = ref([]);

	const patchData: Ref<ICX | null> = ref(null);
	const isPatching: Ref<boolean> = ref(false);

	function getCXData(): void {
		if (!props.cxUuid || !props.planetId) return;

		selectedCX.value = planningStore.getCX(props.cxUuid);
		rawSelectedCX.value = planningStore.getCX(props.cxUuid);

		// get and identify the current planet CX values
		const planetTickers = selectedCX.value.cx_data.ticker_planets.find(
			(f) => f.planet === props.planetId
		);

		if (planetTickers) {
			planetTickerCX.value = planetTickers.preferences;
		} else {
			planetTickerCX.value = [];
		}
	}

	function reload(): void {
		trackEvent("exchange_reload", { location: "cogm" });
		getCXData();
	}

	async function patchCX(): Promise<void> {
		if (!props.cxUuid || !props.planetId) return;

		if (selectedCX.value && patchData.value) {
			isPatching.value = true;

			try {
				trackEvent("exchange_patch", {
					cxUuid: selectedCX.value.uuid,
					location: "cogm",
				});

				await useQuery("PatchCX", {
					cxUuid: props.cxUuid,
					data: {
						cx_empire: selectedCX.value.cx_data.cx_empire,
						ticker_empire: selectedCX.value.cx_data.ticker_empire,
						cx_planets: selectedCX.value.cx_data.cx_planets,
						ticker_planets: patchData.value.cx_data.ticker_planets,
					},
				}).execute();

				// reload the CX data from store
				getCXData();

				isPatching.value = false;
			} catch (err) {
				console.error("Error patching CX", err);
			}
		}
	}

	watch(
		() => props.cxUuid,
		() => getCXData(),
		{ immediate: true }
	);

	watch(
		() => planetTickerCX.value,
		() => {
			if (!props.cxUuid || !props.planetId) return;

			if (selectedCX.value) {
				// find index of current planet
				const idx = selectedCX.value.cx_data.ticker_planets.findIndex(
					(p) => p.planet === props.planetId
				);

				// remove, element present but not ticker preference
				if (planetTickerCX.value.length === 0) {
					if (idx !== -1) {
						selectedCX.value.cx_data.ticker_planets =
							selectedCX.value.cx_data.ticker_planets.filter(
								(f) => f.planet !== props.planetId
							);
					}
				} else {
					if (idx !== -1) {
						// replace, existing ticker preference
						selectedCX.value.cx_data.ticker_planets[idx] = {
							planet: props.planetId,
							preferences: planetTickerCX.value,
						};
					} else {
						// add, no preference there yet
						selectedCX.value.cx_data.ticker_planets.push({
							planet: props.planetId,
							preferences: planetTickerCX.value,
						});
					}
				}

				// update the patchdata
				patchData.value = selectedCX.value;
			}
		},
		{ immediate: true, deep: true }
	);
</script>

<template>
	<div
		class="grid grid-cols-1"
		:class="
			showCX
				? 'xl:grid-cols-2 gap-3 divide-x divide-white/10 child:first:pr-2 child:last:pl-2'
				: ''
		">
		<div>
			<div class="pb-2 text-white/50 text-xs">
				The cost of goods manufactured is calculated using plan settings
				that factor in production efficiency, recipe runtime, building
				degradation, input material costs, labor requirements, and
				associated labor costs. The final cost is shown per unit of
				output, based on quantity or full cost allocation.
			</div>
			<PlanCOGMTable :data="data" />
		</div>
		<div v-if="showCX" class="max-h-150 overflow-y-auto">
			<div class="flex flex-row flex-wrap justify-between">
				<h2 class="text-lg font-bold pb-3">Exchange Preferences</h2>
				<div class="flex flex-row flex-wrap">
					<PButtonGroup>
						<PButton :loading="isPatching" @click="patchCX">
							<template #icon>
								<SaveSharp />
							</template>
							Save
						</PButton>
						<PButton @click="reload">
							<template #icon>
								<ChangeCircleOutlined />
							</template>
							Reload
						</PButton>
					</PButtonGroup>
				</div>
			</div>
			<h2 class="font-bold pb-3">Empire Ticker</h2>
			<CXTickerPreference
				v-if="selectedCX"
				v-model:cx-options="selectedCX.cx_data.ticker_empire" />
			<h2 class="font-bold py-3">Planet Ticker</h2>
			<CXTickerPreference
				v-if="planetTickerCX"
				v-model:cx-options="planetTickerCX" />
		</div>
	</div>
</template>
