<script setup lang="ts">
	import { computed, type ComputedRef, ref, type Ref, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import type {
		Planet,
		PlanetSearchAdvancedPayload,
		PlanetCOGCProgramType,
	} from "@/features/api/schemas/gameData.schemas";
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
		(e: "update:results", value: Planet[]): void;
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

	const searchPayload: ComputedRef<PlanetSearchAdvancedPayload> = computed(
		() => {
			return {
				materials: inputMaterials.value,
				cogc_programs: inputCOGC.value as PlanetCOGCProgramType[],
				environment_rocky: inputIncludeRocky.value,
				environment_gaseous: inputIncludeGaseous.value,
				environment_low_gravity: inputIncludeLowGravity.value,
				environment_high_gravity: inputIncludeHighGravity.value,
				environment_low_pressure: inputIncludeLowPressure.value,
				environment_high_pressure: inputIncludeHighPressure.value,
				environment_low_temperature: inputIncludeLowTemperature.value,
				environment_high_temperature: inputIncludeHighTemperature.value,
				must_be_fertile:
					inputInfrastructure.value &&
					inputInfrastructure.value.includes("Fertile")
						? true
						: false,
				must_have_localmarket:
					inputInfrastructure.value &&
					inputInfrastructure.value.includes("LM")
						? true
						: false,
				must_have_chamberofcommerce:
					inputInfrastructure.value &&
					inputInfrastructure.value.includes("COGC")
						? true
						: false,
				must_have_warehouse:
					inputInfrastructure.value &&
					inputInfrastructure.value.includes("WAR")
						? true
						: false,
				must_have_administrationcenter:
					inputInfrastructure.value &&
					inputInfrastructure.value.includes("ADM")
						? true
						: false,
				must_have_shipyard:
					inputInfrastructure.value &&
					inputInfrastructure.value.includes("SHY")
						? true
						: false,
			};
		}
	);

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
			const data: Planet[] = await useQuery("PostPlanetSearch", {
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
		<h2 class="text-lg font-bold my-auto">
			{{ $t("planet_search.advanced.title") }}
		</h2>
		<PButton :loading="refIsLoading" @click="doSearch">
			<template #icon><SearchSharp /></template>
			{{ $t("common.buttons.search") }}
		</PButton>
	</div>

	<div class="grid grid-cols-1 xl:grid-cols-[40%_auto] gap-x-6">
		<div>
			<PForm>
				<PFormItem
					:label="t('planet_search.advanced.labels.materials')">
					<PSelectMultiple
						v-model:value="inputMaterials"
						:options="PLANETSEARCHOPTIONMATERIALS"
						clearable
						searchable
						class="w-full"
						@update:value="
							(value) => {
								// limit to 3
								if (Object.keys(inputMaterials).length > 3) {
									value.pop();
								}
							}
						" />
				</PFormItem>
				<PFormItem
					v-if="inputMaterials.length > 0"
					:label="t('planet_search.advanced.labels.min_richness')">
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
							<span class="text-sm text-muted">%</span>
						</div>
					</div>
				</PFormItem>
				<PFormItem :label="t('planet_search.advanced.labels.cogc')">
					<PSelectMultiple
						v-model:value="inputCOGC"
						:options="PLANETSEARCHCOGC"
						clearable
						searchable
						class="w-full" />
				</PFormItem>
				<PFormItem
					:label="t('planet_search.advanced.labels.planet_features')">
					<PSelectMultiple
						v-model:value="inputInfrastructure"
						:options="PLANETSEARCHINFRASTRUCTURE"
						searchable
						clearable
						class="w-full" />
				</PFormItem>
				<PFormItem
					:label="t('planet_search.advanced.labels.system_distance')">
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
			<h3 class="pb-3">
				{{ $t("planet_search.advanced.labels.planet_environment") }}
			</h3>

			<div class="flex flex-col sm:flex-row gap-3">
				<PTable class="w-full">
					<tbody>
						<tr class="child:w-[25%]">
							<td>{{ $t("terms.surface") }}</td>
							<td>{{ $t("terms.gravity") }}</td>
							<td>{{ $t("terms.temperature") }}</td>
							<td>{{ $t("terms.pressure") }}</td>
						</tr>
						<tr>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="inputIncludeRocky" />
									{{ $t("terms.rocky") }}
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="
											inputIncludeLowGravity
										" />
									{{ $t("terms.low") }}
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="
											inputIncludeLowTemperature
										" />
									{{ $t("terms.low") }}
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="
											inputIncludeLowPressure
										" />
									{{ $t("terms.low") }}
								</div>
							</td>
						</tr>
						<tr>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="inputIncludeGaseous" />
									{{ $t("terms.gaseous") }}
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="
											inputIncludeHighGravity
										" />
									{{ $t("terms.high") }}
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="
											inputIncludeHighTemperature
										" />
									{{ $t("terms.high") }}
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<PCheckbox
										v-model:checked="
											inputIncludeHighPressure
										" />
									{{ $t("terms.high") }}
								</div>
							</td>
						</tr>
					</tbody>
				</PTable>

				<div class="flex flex-row sm:flex-col gap-3 shrink-0">
					<PButton secondary @click="environmentDefault">
						{{ $t("common.buttons.default") }}
					</PButton>
					<PButton secondary @click="environmentAll">
						{{ $t("common.buttons.select_all") }}
					</PButton>
				</div>
			</div>
		</div>
	</div>
</template>
