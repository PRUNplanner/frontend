<script setup lang="ts">
	import { computed, ComputedRef, ref, Ref, watch } from "vue";

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import {
		IPlanet,
		IPlanetSearchAdvanced,
		PLANET_COGCPROGRAM_TYPE,
	} from "@/features/api/gameData.types";
	import {
		PLANETSEARCHOPTIONMATERIALS,
		PLANETSEARCHSYSTEMS,
		PLANETSEARCHCOGC,
		PLANETSEARCHINFRASTRUCTURE,
	} from "@/features/planet_search/searchConstants";

	// UI
	import {
		PButton,
		PForm,
		PFormItem,
		PSelect,
		PSelectMultiple,
		PCheckbox,
		PInputNumber,
		PTable,
	} from "@/ui";
	import { SearchSharp } from "@vicons/material";

	const refIsLoading: Ref<boolean> = ref(false);

	const emit = defineEmits<{
		(e: "update:results", value: IPlanet[]): void;
		(e: "update:materials", value: string[]): void;
		(
			e: "update:distance",
			system: string | undefined,
			distance: number | undefined
		): void;
		(e: "update:richness", value: Record<string, number>): void;
	}>();

	// input refs
	const inputMaterials: Ref<string[]> = ref([]);
	const inputMaterialRichness: Ref<Record<string, number>> = ref({});
	const inputCOGC: Ref<string[]> = ref([]);
	const inputInfrastructure: Ref<string[]> = ref([]);
	const inputSystem: Ref<string | undefined> = ref(undefined);
	const inputSystemDistance: Ref<number> = ref(30);
	const inputIncludeRocky: Ref<boolean> = ref(true);
	const inputIncludeGaseous: Ref<boolean> = ref(false);
	const inputIncludeLowGravity: Ref<boolean> = ref(false);
	const inputIncludeHighGravity: Ref<boolean> = ref(false);
	const inputIncludeLowPressure: Ref<boolean> = ref(false);
	const inputIncludeHighPressure: Ref<boolean> = ref(false);
	const inputIncludeLowTemperature: Ref<boolean> = ref(false);
	const inputIncludeHighTemperature: Ref<boolean> = ref(false);

	const searchPayload: ComputedRef<IPlanetSearchAdvanced> = computed(() => {
		return {
			Materials: inputMaterials.value,
			COGC: inputCOGC.value as PLANET_COGCPROGRAM_TYPE[],
			IncludeRocky: inputIncludeRocky.value,
			IncludeGaseous: inputIncludeGaseous.value,
			IncludeLowGravity: inputIncludeLowGravity.value,
			IncludeHighGravity: inputIncludeHighGravity.value,
			IncludeLowPressure: inputIncludeLowPressure.value,
			IncludeHighPressure: inputIncludeHighPressure.value,
			IncludeLowTemperature: inputIncludeLowTemperature.value,
			IncludeHighTemperature: inputIncludeHighTemperature.value,
			MustBeFertile:
				inputInfrastructure.value &&
				inputInfrastructure.value.includes("Fertile")
					? true
					: false,
			MustHaveLocalMarket:
				inputInfrastructure.value &&
				inputInfrastructure.value.includes("LM")
					? true
					: false,
			MustHaveChamberOfCommerce:
				inputInfrastructure.value &&
				inputInfrastructure.value.includes("COGC")
					? true
					: false,
			MustHaveWarehouse:
				inputInfrastructure.value &&
				inputInfrastructure.value.includes("WAR")
					? true
					: false,
			MustHaveAdministrationCenter:
				inputInfrastructure.value &&
				inputInfrastructure.value.includes("ADM")
					? true
					: false,
			MustHaveShipyard:
				inputInfrastructure.value &&
				inputInfrastructure.value.includes("SHY")
					? true
					: false,
			// // NOTE: Removed to use frontend pathfinding
			// MaxDistanceCheck:
			// 	inputSystem.value !== undefined &&
			// 	inputSystem.value !== null &&
			// 	inputSystemDistance.value !== undefined
			// 		? {
			// 				SystemId: inputSystem.value,
			// 				MaxDistance: inputSystemDistance.value,
			// 		  }
			// 		: undefined,
		};
	});

	function environmentDefault(): void {
		inputIncludeRocky.value = true;
		inputIncludeGaseous.value = false;
		inputIncludeLowGravity.value = false;
		inputIncludeHighGravity.value = false;
		inputIncludeLowPressure.value = false;
		inputIncludeHighPressure.value = false;
		inputIncludeLowTemperature.value = false;
		inputIncludeHighTemperature.value = false;
	}

	function environmentAll(): void {
		inputIncludeRocky.value = true;
		inputIncludeGaseous.value = true;
		inputIncludeLowGravity.value = true;
		inputIncludeHighGravity.value = true;
		inputIncludeLowPressure.value = true;
		inputIncludeHighPressure.value = true;
		inputIncludeLowTemperature.value = true;
		inputIncludeHighTemperature.value = true;
	}

	// Watch materials to manage richness thresholds
	watch(
		inputMaterials,
		(newMaterials) => {
			const newRichness: Record<string, number> = {};
			for (const material of newMaterials) {
				// Keep existing value or default to 0 (no filter)
				newRichness[material] =
					inputMaterialRichness.value[material] ?? 0;
			}
			inputMaterialRichness.value = newRichness;
		},
		{ immediate: true }
	);

	// Watch richness changes to emit updates in real-time
	watch(
		inputMaterialRichness,
		(newRichness) => {
			emit("update:richness", { ...newRichness });
		},
		{ deep: true }
	);

	async function doSearch() {
		refIsLoading.value = true;

		trackEvent("planet_search_advanced", searchPayload.value);

		try {
			const data: IPlanet[] = await useQuery("PostPlanetSearch", {
				searchData: searchPayload.value,
			}).execute();

			// also send distance
			if (inputSystem.value && inputSystemDistance.value) {
				emit(
					"update:distance",
					inputSystem.value,
					inputSystemDistance.value
				);
			}

			emit("update:materials", inputMaterials.value);
			emit("update:richness", { ...inputMaterialRichness.value });
			emit("update:results", data);
		} catch {
			emit("update:results", []);
			emit("update:materials", []);
			emit("update:richness", {});
			emit("update:distance", undefined, undefined);
		}

		refIsLoading.value = false;
	}
</script>

<template>
	<div class="flex flex-row justify-between pb-3">
		<h2 class="text-lg font-bold my-auto">Advanced Search</h2>
		<PButton :loading="refIsLoading" @click="doSearch">
			<template #icon><SearchSharp /></template>
			Search
		</PButton>
	</div>

	<div class="grid grid-cols-1 xl:grid-cols-[40%_auto] gap-x-6">
		<div>
			<PForm>
				<PFormItem label="Materials">
					<PSelectMultiple
						v-model:value="inputMaterials"
						:options="PLANETSEARCHOPTIONMATERIALS"
						clearable
						searchable
						class="w-full"
						@update:value="
							(value) => {
								// NOTE: There is apparently a bug where search returns planets for 3+ materials
								// but the materials do not actually exist on the planets. Backend issue.

								// limit to 2
								if (Object.keys(inputMaterials).length > 2) {
									value.pop();
								}
							}
						" />
				</PFormItem>
				<PFormItem
					v-if="inputMaterials.length > 0"
					label="Min. Richness %">
					<div class="flex flex-col gap-1 w-full">
						<div
							v-for="material in inputMaterials"
							:key="material"
							class="flex items-center gap-2">
							<span class="w-12 text-sm font-mono">{{
								material
							}}</span>
							<PInputNumber
								v-model:value="inputMaterialRichness[material]"
								:min="0"
								:max="100"
								class="flex-1" />
							<span class="text-sm text-white/50">%</span>
						</div>
					</div>
				</PFormItem>
				<PFormItem label="COGC">
					<PSelectMultiple
						v-model:value="inputCOGC"
						:options="PLANETSEARCHCOGC"
						clearable
						searchable
						class="w-full" />
				</PFormItem>
				<PFormItem label="Planet Features">
					<PSelectMultiple
						v-model:value="inputInfrastructure"
						:options="PLANETSEARCHINFRASTRUCTURE"
						searchable
						clearable
						class="w-full" />
				</PFormItem>
				<PFormItem label="System Distance">
					<PSelect
						v-model:value="inputSystem"
						:options="PLANETSEARCHSYSTEMS"
						searchable
						clearable
						class="pr-3 w-full" />
					<PInputNumber
						v-model:value="inputSystemDistance"
						show-buttons
						:min="0"
						:max="30" />
				</PFormItem>
			</PForm>
		</div>
		<div>
			<h3 class="pb-3">Planet Environment</h3>

			<div class="flex flex-row gap-x-3">
				<PTable class="w-full">
					<tbody>
						<tr class="child:w-[25%]">
							<td>Surface</td>
							<td>Gravity</td>
							<td>Temperature</td>
							<td>Pressure</td>
						</tr>
						<tr>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="inputIncludeRocky" />
									Rocky
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="
											inputIncludeLowGravity
										" />
									Low
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="
											inputIncludeLowTemperature
										" />
									Low
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="
											inputIncludeLowPressure
										" />
									Low
								</div>
							</td>
						</tr>
						<tr>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="inputIncludeGaseous" />
									Gaseous
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="
											inputIncludeHighGravity
										" />
									High
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="
											inputIncludeHighTemperature
										" />
									High
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="
											inputIncludeHighPressure
										" />
									High
								</div>
							</td>
						</tr>
					</tbody>
				</PTable>

				<div class="flex flex-col gap-y-3">
					<PButton secondary @click="environmentDefault">
						Default
					</PButton>
					<PButton secondary @click="environmentAll">
						Select All
					</PButton>
				</div>
			</div>
		</div>
	</div>
</template>
