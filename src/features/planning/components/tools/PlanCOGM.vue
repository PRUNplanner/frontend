<script setup lang="ts">
	import {
		type ComputedRef,
		computed,
		defineAsyncComponent,
		type PropType,
		type Ref,
		ref,
		watch,
	} from "vue";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { useCXSave } from "@/features/cx/useCXSave";
	const cxSave = useCXSave("cogm");

	// Components
	import PlanCOGMTable from "@/features/planning/components/tools/PlanCOGMTable.vue";
	import SaveConflictNotice from "@/features/save_conflict/components/SaveConflictNotice.vue";
	const SaveConflictDialog = defineAsyncComponent(
		() =>
			import("@/features/save_conflict/components/SaveConflictDialog.vue")
	);
	import CXTickerPreference from "@/features/exchanges/components/CXTickerPreference.vue";

	// Types & Interfaces
	import type { IProductionBuildingRecipeCOGM } from "@/features/planning/usePlanCalculation.types";
	import type {
		CX,
		CXDataTickerOption,
	} from "@/features/api/schemas/cxData.schemas";

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

	const selectedCX: Ref<CX | null> = ref(null);
	// from store always, will not change but used on reload button
	const rawSelectedCX: Ref<CX | null> = ref(null);

	const planetTickerCX: Ref<CXDataTickerOption[]> = ref([]);

	const patchData: Ref<CX | null> = ref(null);
	const isPatching: Ref<boolean> = ref(false);

	function getCXData(): void {
		if (!props.cxUuid || !props.planetId) return;

		cxSave.remoteNotice.value = null;
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
		trackEvent("exchange:reload", { location: "cogm" });
		getCXData();
	}

	async function patchCX(): Promise<void> {
		if (!props.cxUuid || !props.planetId) return;

		if (selectedCX.value && patchData.value) {
			isPatching.value = true;

			try {
				trackEvent("exchange:update", {
					cx_uuid: selectedCX.value.uuid,
					location: "cogm",
				});

				const saved = await cxSave.save(rawSelectedCX.value!, {
					cx_name: selectedCX.value.cx_name,
					cx_data: {
						cx_empire: selectedCX.value.cx_data.cx_empire,
						ticker_empire: selectedCX.value.cx_data.ticker_empire,
						cx_planets: selectedCX.value.cx_data.cx_planets,
						ticker_planets: patchData.value.cx_data.ticker_planets,
					},
				});

				// reload the CX data from store
				if (saved) getCXData();
			} catch (err) {
				console.error("Error patching CX", err);
			} finally {
				isPatching.value = false;
			}
		}
	}

	watch(
		() => props.cxUuid,
		() => getCXData(),
		{ immediate: true }
	);

	/*
	 * Saved or deleted in another tab: without unsaved edits the CX
	 * reloads, with them a notice offers to
	 */
	watch(
		() => (props.cxUuid ? planningStore.cxs[props.cxUuid] : undefined),
		(cx) => {
			const loaded = rawSelectedCX.value;
			if (isPatching.value || !loaded || !selectedCX.value) return;
			if (
				cx &&
				(cx.uuid !== loaded.uuid ||
					cx.modified_at === loaded.modified_at)
			)
				return;

			if (cxSave.onRemoteChange(cx, loaded, selectedCX.value))
				getCXData();
		}
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
			<div class="pb-2 text-muted text-xs">
				{{ $t("plan.tools.cogm.info") }}
			</div>
			<div class="pb-2 text-muted text-xs">
				{{ $t("plan.tools.cogm.workforce_note") }}
			</div>
			<PlanCOGMTable :data="data" />
		</div>
		<div v-if="showCX" class="max-h-150 overflow-y-auto">
			<div class="flex flex-row flex-wrap justify-between">
				<h2 class="text-lg font-bold pb-3">
					{{ $t("plan.tools.cogm.cx_preferences") }}
				</h2>
				<div class="flex flex-row flex-wrap">
					<PButtonGroup>
						<PButton :loading="isPatching" @click="patchCX">
							<template #icon>
								<SaveSharp />
							</template>
							{{ $t("common.buttons.save") }}
						</PButton>
						<PButton @click="reload">
							<template #icon>
								<ChangeCircleOutlined />
							</template>
							{{ $t("common.buttons.reload") }}
						</PButton>
					</PButtonGroup>
				</div>
			</div>
			<SaveConflictNotice
				class="mb-3"
				:notice="cxSave.remoteNotice.value"
				@reload="getCXData" />
			<h2 class="font-bold pb-3">
				{{ $t("plan.tools.cogm.empire_ticker") }}
			</h2>
			<CXTickerPreference
				v-if="selectedCX"
				v-model:cx-options="selectedCX.cx_data.ticker_empire" />
			<h2 class="font-bold py-3">
				{{ $t("plan.tools.cogm.planet_ticker") }}
			</h2>
			<CXTickerPreference
				v-if="planetTickerCX"
				v-model:cx-options="planetTickerCX" />
		</div>
		<SaveConflictDialog
			v-if="cxSave.conflict.show.value"
			:conflict="cxSave.conflict" />
	</div>
</template>
