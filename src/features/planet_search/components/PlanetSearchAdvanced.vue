<script setup lang="ts">
	import { computed, ComputedRef, ref, Ref } from "vue";

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { useQueryRepository } from "@/lib/query_cache/queryRepository";

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
		NButton,
		NForm,
		NFormItem,
		NSelect,
		NInputNumber,
		NCheckbox,
		NTable,
	} from "naive-ui";
	import { SearchSharp } from "@vicons/material";

	const refIsLoading: Ref<boolean> = ref(false);

	const emit = defineEmits<{
		(e: "update:results", value: IPlanet[]): void;
		(e: "update:materials", value: string[]): void;
	}>();

	// input refs
	const inputMaterials: Ref<string[]> = ref([]);
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
			MaxDistanceCheck:
				inputSystem.value !== undefined &&
				inputSystem.value !== null &&
				inputSystemDistance.value !== undefined
					? {
							SystemId: inputSystem.value,
							MaxDistance: inputSystemDistance.value,
					  }
					: undefined,
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

	async function doSearch() {
		refIsLoading.value = true;

		try {
			await useQuery(useQueryRepository().repository.PostPlanetSearch, {
				searchData: searchPayload.value,
			})
				.execute()
				.then((data: IPlanet[]) => {
					emit("update:results", data);
					emit("update:materials", inputMaterials.value);
				})
				.finally(() => (refIsLoading.value = false));
		} catch {
			emit("update:results", []);
		}
	}
</script>

<template>
	<div class="flex flex-row justify-between pb-3">
		<h2 class="text-lg font-bold my-auto">Advanced Search</h2>
		<n-button size="small" :loading="refIsLoading" @click="doSearch">
			<template #icon><SearchSharp /></template>
			Search
		</n-button>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-[40%_auto] gap-x-6">
		<div>
			<n-form
				label-placement="left"
				label-width="auto"
				label-align="left"
				size="small">
				<n-form-item label="Materials">
					<n-select
						v-model:value="inputMaterials"
						:options="PLANETSEARCHOPTIONMATERIALS"
						multiple
						clearable
						filterable
						@update:value="
							(value: string[]) => {
								// limit to 4
								if (Object.keys(inputMaterials).length > 4) {
									value.pop();
								}
							}
						" />
				</n-form-item>
				<n-form-item label="COGC">
					<n-select
						v-model:value="inputCOGC"
						:options="PLANETSEARCHCOGC"
						multiple
						clearable
						filterable
						class="child:child:child:child:child:!text-md" />
				</n-form-item>
				<n-form-item label="Planet Features">
					<n-select
						v-model:value="inputInfrastructure"
						:options="PLANETSEARCHINFRASTRUCTURE"
						multiple
						filterable
						clearable />
				</n-form-item>
				<n-form-item label="System Distance">
					<n-select
						v-model:value="inputSystem"
						:options="PLANETSEARCHSYSTEMS"
						filterable
						clearable
						class="pr-3" />
					<n-input-number
						v-model:value="inputSystemDistance"
						show-button
						:min="0"
						:max="30" />
				</n-form-item>
			</n-form>
		</div>
		<div>
			<h3 class="pb-3">Planet Environment</h3>

			<div class="flex flex-row gap-x-3">
				<n-table>
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
									<n-checkbox
										v-model:checked="inputIncludeRocky"
										size="small" />
									Rocky
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<n-checkbox
										v-model:checked="inputIncludeLowGravity"
										size="small" />
									Low
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<n-checkbox
										v-model:checked="
											inputIncludeLowTemperature
										"
										size="small" />
									Low
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<n-checkbox
										v-model:checked="
											inputIncludeLowPressure
										"
										size="small" />
									Low
								</div>
							</td>
						</tr>
						<tr>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<n-checkbox
										v-model:checked="inputIncludeGaseous"
										size="small" />
									Gaseous
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<n-checkbox
										v-model:checked="
											inputIncludeHighGravity
										"
										size="small" />
									High
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<n-checkbox
										v-model:checked="
											inputIncludeHighTemperature
										"
										size="small" />
									High
								</div>
							</td>
							<td>
								<div
									class="flex flex-row gap-x-3 child:my-auto">
									<n-checkbox
										v-model:checked="
											inputIncludeHighPressure
										"
										size="small" />
									High
								</div>
							</td>
						</tr>
					</tbody>
				</n-table>

				<div class="flex flex-col gap-y-3">
					<n-button
						size="small"
						secondary
						@click="environmentDefault">
						Default
					</n-button>
					<n-button size="small" secondary @click="environmentAll">
						Select All
					</n-button>
				</div>
			</div>
		</div>
	</div>
</template>
