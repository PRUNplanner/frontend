<script setup lang="ts">
	import {
		computed,
		PropType,
		Ref,
		ref,
		watchEffect,
		ComputedRef,
		watch,
	} from "vue";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { usePrice } from "@/features/cx/usePrice";
	import { useFIOStorage } from "@/features/fio/useFIOStorage";
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { useUserStore } from "@/stores/userStore";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";

	// Util
	import { clamp, formatAmount, formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import {
		IBuildingConstruction,
		INFRASTRUCTURE_TYPE,
		IProductionBuilding,
	} from "@/features/planning/usePlanCalculation.types";
	import { IXITTransferMaterial } from "@/features/xit/xitAction.types";

	// UI
	import { PInputNumber, PSelect, PTable } from "@/ui";

	const props = defineProps({
		planetNaturalId: {
			type: String,
			required: true,
		},
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		constructionData: {
			type: Array as PropType<IBuildingConstruction[]>,
			required: true,
		},
		productionBuildingData: {
			type: Array as PropType<IProductionBuilding[]>,
			required: true,
		},
		infrastructureData: {
			type: Object as PropType<Record<INFRASTRUCTURE_TYPE, number>>,
			required: true,
		},
	});

	const { materialsMap } = useMaterialData();
	const { getPrice } = await usePrice(
		ref(props.cxUuid),
		ref(props.planetNaturalId)
	);

	const { hasStorage, storageOptions, findStorageValueFromOptions } =
		useFIOStorage();

	// Get already constructed buildings
	let constructedMap: Map<string, number> | null = null;
	if (useUserStore().hasFIO) {
		constructedMap = new Map<string, number>();
		const fioSites = await useQuery("GetFIOSites").execute();
		const constructedArray = Object.values(fioSites.planets).find(
			(p) => p.PlanetIdentifier === props.planetNaturalId
		)?.Buildings;
		if (constructedArray) {
			for (const building of constructedArray) {
				const count = constructedMap.get(building.BuildingTicker) ?? 0;
				constructedMap.set(building.BuildingTicker, count + 1);
			}
		}
	}

	const plannedBuildings: Ref<Record<string, number>> = ref({});
	const localBuildingAmount: Ref<Record<string, number>> = ref({});
	const localBuildingMaterials: Ref<Record<string, Record<string, number>>> =
		ref({});

	const refStorageOverride: Ref<Record<string, number | null>> = ref({});
	const totalInformation = ref({ weight: 0, volume: 0, price: 0 });
	const overviewTotalInformation = ref({ weight: 0, volume: 0, price: 0 });

	const uniqueMaterials = computed(() => {
		return Array.from(
			new Set(
				props.constructionData
					.map((e) => e.materials.map((x) => x.ticker))
					.flat()
			)
		).sort();
	});

	const buildingTicker = computed(() =>
		props.constructionData.map((b) => b.ticker).sort()
	);

	const totalMaterials = computed(() => {
		const r: Record<string, number> = {};
		uniqueMaterials.value.map((mat) => {
			r[mat] = 0;
			buildingTicker.value.forEach((bticker) => {
				if (localBuildingMaterials.value[bticker][mat]) {
					r[mat] += localBuildingMaterials.value[bticker][mat];
				}
			});
		});

		return r;
	});

	function generateMatrix(): void {
		buildingTicker.value.forEach((bticker) => {
			if (localBuildingAmount.value[bticker] === undefined) {
				let planned =
					props.productionBuildingData.find(
						(pf) => pf.name === bticker
					)?.amount ??
					props.infrastructureData[bticker as INFRASTRUCTURE_TYPE];
				if (bticker === "CM") planned = 1;
				let need = planned;
				if (planned !== undefined) {
					plannedBuildings.value[bticker] = planned;
					if (constructedMap !== null)
						need = Math.max(planned - (constructedMap.get(bticker) ?? 0), 0);
				}
				localBuildingAmount.value[bticker] = need;
			}

			const thisMats = props.constructionData.find(
				(e) => e.ticker === bticker
			);

			if (thisMats) {
				localBuildingMaterials.value[bticker] =
					thisMats.materials.reduce((sum, current) => {
						sum[current.ticker] =
							current.input * localBuildingAmount.value[bticker];
						return sum;
					}, {} as Record<string, number>);
			}
		});
	}

	const xitTransferElements: ComputedRef<IXITTransferMaterial[]> = computed(
		() =>
			Object.entries(totalMaterials.value)
				.map(([ticker, value]) => ({
					ticker,
					value,
				}))
				.sort((a, b) => (a.ticker > b.ticker ? 1 : -1))
	);

	const totalMaterialsSorted: ComputedRef<
		{
			ticker: string;
			amount: number;
			stock: number;
			override: number | null;
			total: number;
		}[]
	> = computed(() =>
		Object.entries(totalMaterials.value).map(([ticker, amount]) => {
			const stock: number = findStorageValueFromOptions(
				refSelectedStorage.value,
				ticker
			);

			const override: number | null =
				refStorageOverride.value[ticker] ?? null;

			const total: number = clamp(
				override !== null ? amount - override : amount - stock,
				0,
				Infinity
			);

			return {
				ticker,
				amount,
				stock,
				override,
				total,
			};
		})
	);

	const xitTransferElementsOverview: ComputedRef<IXITTransferMaterial[]> =
		computed(() =>
			totalMaterialsSorted.value.map((e) => ({
				ticker: e.ticker,
				value: e.total,
			}))
		);

	const refSelectedStorage: Ref<string | undefined> = ref(
		hasStorage.value
			? storageOptions.value.filter(
					(e) => e.value === `PLANET#${props.planetNaturalId}`
			  )
				? `PLANET#${props.planetNaturalId}`
				: undefined
			: undefined
	);

	async function calculateTotal(data: IXITTransferMaterial[]) {
		let weight = 0;
		let volume = 0;
		let price = 0;

		for (const m of data) {
			const materialInfo = materialsMap.value[m.ticker];
			weight += materialInfo.Weight * m.value;
			volume += materialInfo.Volume * m.value;

			const unitPrice = await getPrice(m.ticker, "BUY");
			price += unitPrice * m.value;
		}

		return { weight, volume, price };
	}

	watchEffect(async () => {
		generateMatrix();
		totalInformation.value = await calculateTotal(
			xitTransferElements.value
		);
	});

	watch(
		() => xitTransferElementsOverview.value,
		async (overview) => {
			overviewTotalInformation.value = await calculateTotal(overview);
		},
		{ deep: true, immediate: true }
	);
</script>

<template>
	<div class="pb-3 flex flex-row justify-between child:my-auto">
		<h2 class="text-white/80 font-bold text-lg">Construction Cart</h2>
		<div class="flex flex-row gap-x-3 child:my-auto!">
			<XITTransferActionButton
				:elements="xitTransferElements"
				transfer-name="Construct"
				:drawer-width="400" />
		</div>
	</div>
	<div class="overflow-auto">
		<PTable striped>
			<thead>
				<tr>
					<th>Building</th>
					<th v-if="constructedMap">Constructed</th>
					<th>Amount</th>
					<th>Planned</th>
					<th
						v-for="mat in uniqueMaterials"
						:key="`CONSTRUCTIONCART#COLUMN#${mat}`"
						class="text-center!">
						<MaterialTile :key="mat" :ticker="mat" />
					</th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="building in buildingTicker"
					:key="`CONSTRUCTIONCART#ROW#${building}`">
					<th>{{ building }}</th>
					<th v-if="constructedMap"
						:class="(constructedMap.get(building) ?? 0) > plannedBuildings[building] ? 'text-red-500' : 'text-neutral-500'">
						{{ constructedMap.get(building) ?? 0 }}
					</th>
					<th class="border-r!">
						<PInputNumber
							v-model:value="localBuildingAmount[building]"
							show-buttons
							:min="0" />
					</th>
					<th>
						{{ plannedBuildings[building] ?? 0 }}
					</th>
					<td
						v-for="mat in uniqueMaterials"
						:key="`CONSTRUCTIONCART#COLUMN#${building}#${mat}`"
						class="text-center">
						<span
							:class="
								!localBuildingMaterials[building][mat]
									? 'text-white/20'
									: ''
							">
							{{
								formatAmount(
									localBuildingMaterials[building][mat] ?? 0
								)
							}}
						</span>
					</td>
				</tr>
				<tr class="child:border-t-2! child:border-b-2!">
					<td :colspan="constructedMap ? 4 : 3">Materials Sum</td>
					<td
						v-for="mat in uniqueMaterials"
						:key="`CONSTRUCTIONCART#COLUMN#TOTALS#${mat}`"
						class="text-center font-bold">
						{{ formatAmount(totalMaterials[mat] ?? 0) }}
					</td>
				</tr>
				<tr>
					<td :colspan="uniqueMaterials.length + (constructedMap ? 4 : 3)">
						<div
							class="flex flex-row justify-between child:my-auto">
							<div
								class="grid grid-cols-2 gap-x-3 gap-y-1 child:not-even:font-bold">
								<div>Total Cost</div>
								<div>
									{{ formatNumber(totalInformation.price) }}
									<span class="pl-1 font-light text-white/50">
										$
									</span>
								</div>
							</div>
							<div
								class="grid grid-cols-2 gap-x-3 gap-y-1 child:text-end child:not-even:font-bold">
								<div>Total Volume</div>
								<div>
									{{ formatNumber(totalInformation.volume) }}
									<span class="pl-1 font-light text-white/50">
										m³
									</span>
								</div>
								<div>Total Weight</div>
								<div>
									{{ formatNumber(totalInformation.weight) }}
									<span class="pl-1 font-light text-white/50">
										t
									</span>
								</div>
							</div>
						</div>
					</td>
				</tr>
			</tbody>
		</PTable>

		<div>
			<div class="py-3 flex flex-row justify-between">
				<h2 class="text-white/80 font-bold text-lg my-auto">
					Material
				</h2>
				<div class="flex flex-row flex-wrap gap-3">
					<template v-if="hasStorage">
						<div class="my-auto font-bold">Storage</div>
						<PSelect
							v-model:value="refSelectedStorage"
							searchable
							:options="storageOptions"
							class="w-62.5!" />
					</template>
					<XITTransferActionButton
						:elements="xitTransferElementsOverview"
						transfer-name="Construct"
						:drawer-width="400" />
				</div>
			</div>

			<PTable striped>
				<thead>
					<tr>
						<th>Material</th>
						<th>Amount</th>
						<th v-if="hasStorage">Stock</th>
						<th>Stock Override</th>
						<th>Need</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="material in totalMaterialsSorted"
						:key="material.ticker">
						<td>
							<MaterialTile
								:key="`CONSTRUCTION#MATERIAL#${material.ticker}`"
								:ticker="material.ticker" />
						</td>
						<td>
							{{ formatAmount(material.amount) }}
						</td>
						<td v-if="hasStorage">
							{{ formatAmount(material.stock) }}
						</td>
						<td>
							<PInputNumber
								v-model:value="
									refStorageOverride[material.ticker]
								"
								placeholder=""
								show-buttons
								:min="0"
								class="max-w-50" />
						</td>
						<td>
							{{ formatAmount(material.total) }}
						</td>
					</tr>

					<tr>
						<td :colspan="hasStorage ? 5 : 4">
							<div
								class="flex flex-row justify-between child:my-auto">
								<div
									class="grid grid-cols-2 gap-x-3 gap-y-1 child:not-even:font-bold">
									<div>Total Cost</div>
									<div>
										{{
											formatNumber(
												overviewTotalInformation.price
											)
										}}
										<span
											class="pl-1 font-light text-white/50">
											$
										</span>
									</div>
								</div>
								<div
									class="grid grid-cols-2 gap-x-3 gap-y-1 child:text-end child:not-even:font-bold">
									<div>Total Volume</div>
									<div>
										{{
											formatNumber(
												overviewTotalInformation.volume
											)
										}}
										<span
											class="pl-1 font-light text-white/50">
											m³
										</span>
									</div>
									<div>Total Weight</div>
									<div>
										{{
											formatNumber(
												overviewTotalInformation.weight
											)
										}}
										<span
											class="pl-1 font-light text-white/50">
											t
										</span>
									</div>
								</div>
							</div>
						</td>
					</tr>
				</tbody>
			</PTable>
		</div>
	</div>
</template>
