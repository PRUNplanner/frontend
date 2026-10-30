<script setup lang="ts">
	import {
		computed,
		type Ref,
		ref,
		watchEffect,
		type ComputedRef,
		watch,
		onBeforeUnmount,
	} from "vue";

	// Composables
	import { useBuildingData } from "@/database/services/useBuildingData";
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { usePrice } from "@/features/cx/usePrice";
	import { useFIOStorage } from "@/features/fio/useFIOStorage";
	import { usePlanPreferences } from "@/features/preferences/usePlanPreferences";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { usePlanningStore } from "@/stores/planningStore";
	import { useUserStore } from "@/stores/userStore";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";

	// Util
	import { relativeFromDate } from "@/util/date";
	import { useRunProgress } from "@/util/runProgress";
	import { clamp, formatAmount, formatNumber } from "@/util/numbers";
	import { workforceTypeNames } from "@/features/planning/calculations/workforceCalculations";

	// Types & Interfaces
	import type { InfrastructureType } from "@/features/api/schemas/planningData.schemas";
	import type {
		IBuildingConstruction,
		IProductionBuilding,
	} from "@/features/planning/usePlanCalculation.types";
	import type { Building } from "@/features/api/schemas/gameData.schemas";
	import type { IXITTransferMaterial } from "@/features/xit/xitAction.types";

	// UI
	import {
		PButton,
		PIcon,
		PInputNumber,
		PSelect,
		PTable,
		PTooltip,
	} from "@/ui";
	import {
		EditSharp,
		RestartAltSharp,
		WarningAmberRound,
	} from "@vicons/material";

	const props = defineProps<{
		planetNaturalId: string;
		planUuid?: string;
		disabled?: boolean;
		cxUuid?: string;
		constructionData: IBuildingConstruction[];
		productionBuildingData: IProductionBuilding[];
		infrastructureData: Record<InfrastructureType, number>;
	}>();

	const { materialsMap } = useMaterialData();
	const { buildingsMap } = useBuildingData();
	const { getPrice } = usePrice(
		ref(props.cxUuid),
		ref(props.planetNaturalId)
	);

	const {
		hasStorage,
		storageOptions,
		findStorageValueFromOptions,
		planetStorageId,
	} = useFIOStorage();
	const planningStore = usePlanningStore();

	// Get already constructed buildings, cart must still render if FIO fails
	let constructedMap: Map<string, number> | null = null;
	if (useUserStore().hasFIO) {
		try {
			const fioSites = await useQuery("GetFIOStorage").execute();
			constructedMap = new Map<string, number>();
			for (const building of fioSites.sites_data[props.planetNaturalId]
				?.Buildings ?? []) {
				const count = constructedMap.get(building.BuildingTicker) ?? 0;
				constructedMap.set(building.BuildingTicker, count + 1);
			}
		} catch {
			// queryStore already logs the error, constructedMap stays null
		}
	}
	// after the fetch: FIO storage isn't persisted, so null until it loaded
	const fioUpdated = relativeFromDate(
		planningStore.fio_storage_timestamp ?? undefined
	);

	// manually entered built counts, saved per plan; unsaved and shared plans
	// keep them for this visit only
	const saveUuid = computed(() =>
		props.disabled ? undefined : props.planUuid
	);
	const { constructionBuilt } = usePlanPreferences(saveUuid);
	const sessionBuilt: Ref<Record<string, number>> = ref({});
	const manualBuilt = computed<Record<string, number>>(() =>
		saveUuid.value ? (constructionBuilt.value ?? {}) : sessionBuilt.value
	);
	let builtEdited: boolean = false;

	function setManualBuilt(next: Record<string, number>): void {
		if (saveUuid.value) constructionBuilt.value = next;
		else sessionBuilt.value = next;
	}

	function getBuilt(ticker: string): number {
		return manualBuilt.value[ticker] ?? constructedMap?.get(ticker) ?? 0;
	}

	function isManualBuilt(ticker: string): boolean {
		return (
			ticker in manualBuilt.value &&
			manualBuilt.value[ticker] !== constructedMap?.get(ticker)
		);
	}

	function resetAmount(ticker: string): void {
		if (plannedBuildings.value[ticker] !== undefined)
			delete amountOverrides.value[ticker];
	}

	/**
	 * Stores a built count, a value matching the FIO count (or 0 without
	 * FIO) or an emptied field removes the manual value
	 *
	 * @author jplacht
	 *
	 * @param {string} ticker Building Ticker
	 * @param {number | null | undefined} value Built count
	 */
	function setBuilt(ticker: string, value: number | null | undefined): void {
		const next = { ...manualBuilt.value };
		if (
			value === null ||
			value === undefined ||
			value === (constructedMap?.get(ticker) ?? 0)
		)
			delete next[ticker];
		else next[ticker] = value;
		setManualBuilt(next);
		builtEdited = true;
		resetAmount(ticker);
	}

	function resetAllBuilt(): void {
		setManualBuilt({});
		builtEdited = true;
		buildingTicker.value.forEach(resetAmount);
	}

	onBeforeUnmount(() =>
		trackEvent("tool:use", {
			tool_name: "construction_cart",
			built_edited: builtEdited,
		})
	);

	// planned amount per building, the core module once
	const plannedBuildings: ComputedRef<Record<string, number>> = computed(
		() => {
			const r: Record<string, number> = {};
			buildingTicker.value.forEach((bticker) => {
				const planned: number | undefined =
					bticker === "CM"
						? 1
						: (props.productionBuildingData.find(
								(pf) => pf.name === bticker
							)?.amount ??
							props.infrastructureData[bticker as InfrastructureType]);
				if (planned !== undefined) r[bticker] = planned;
			});
			return r;
		}
	);

	// amounts typed in (null when emptied); the others are planned - built
	const amountOverrides: Ref<Record<string, number | null>> = ref({});
	const localBuildingAmount: ComputedRef<Record<string, number>> = computed(
		() => {
			const r: Record<string, number> = {};
			buildingTicker.value.forEach((bticker) => {
				const planned: number | undefined =
					plannedBuildings.value[bticker];
				if (bticker in amountOverrides.value)
					r[bticker] = amountOverrides.value[bticker] as number;
				else if (planned !== undefined)
					r[bticker] = Math.max(planned - getBuilt(bticker), 0);
			});
			return r;
		}
	);

	// materials per building for its amount
	const localBuildingMaterials: ComputedRef<
		Record<string, Record<string, number>>
	> = computed(() =>
		Object.fromEntries(
			props.constructionData.map((b) => [
				b.ticker,
				b.materials.reduce(
					(sum, current) => {
						sum[current.ticker] =
							current.input * localBuildingAmount.value[b.ticker];
						return sum;
					},
					{} as Record<string, number>
				),
			])
		)
	);

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

	const unplannedBuildings = computed(() => {
		if (!constructedMap) return [];

		const plannedSet = new Set(buildingTicker.value);
		return Array.from(constructedMap.keys())
			.filter((ticker) => !plannedSet.has(ticker))
			.sort((a, b) => a.localeCompare(b));
	});

	function getTotalBuildingAmount(ticker: string): number {
		const builtAmount = getBuilt(ticker);
		const plannedAmount = localBuildingAmount.value[ticker] ?? 0;
		return builtAmount + plannedAmount;
	}

	const deficitWorkforceTypes = computed(() => {
		return workforceTypeNames.filter(
			(workforceType) =>
				buildingTicker.value.reduce((sum, ticker) => {
					const building = buildingsMap.value[ticker];
					const amount = getTotalBuildingAmount(ticker);
					const field = `${workforceType}s` as keyof NonNullable<
						Building["habitations"]
					>;
					return sum + (building ? building[field] * amount : 0);
				}, 0) >
				buildingTicker.value.reduce((sum, ticker) => {
					const building = buildingsMap.value[ticker];
					const amount = getTotalBuildingAmount(ticker);
					const field = `${workforceType}s` as keyof NonNullable<
						Building["habitations"]
					>;
					return (
						sum +
						(building
							? (building.habitations?.[field] ?? 0) * amount
							: 0)
					);
				}, 0)
		);
	});

	function isDeficitHabitationBuilding(ticker: string): boolean {
		const building = buildingsMap.value[ticker];
		if (!building?.habitations) return false;

		return deficitWorkforceTypes.value.some(
			(workforceType) =>
				(building.habitations?.[
					`${workforceType}s` as keyof NonNullable<
						Building["habitations"]
					>
				] ?? 0) > 0
		);
	}

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

	const xitTransferElements: ComputedRef<IXITTransferMaterial[]> = computed(
		() =>
			Object.values(totalMaterialsSorted.value)
				.map((e) => ({
					ticker: e.ticker,
					value: e.amount,
				}))
				.sort((a, b) =>
					a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0
				)
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
				value: e.amount,
			}))
		);

	const xitTransferElementsNeed: ComputedRef<IXITTransferMaterial[]> =
		computed(() =>
			totalMaterialsSorted.value.map((e) => ({
				ticker: e.ticker,
				value: e.total,
			}))
		);

	const refSelectedStorage: Ref<string | undefined> = ref(
		planetStorageId(props.planetNaturalId)
	);

	async function calculateTotal(data: IXITTransferMaterial[]) {
		let weight = 0;
		let volume = 0;
		let price = 0;

		for (const m of data) {
			const materialInfo = materialsMap.value[m.ticker];
			weight += materialInfo.weight * m.value;
			volume += materialInfo.volume * m.value;

			const unitPrice = await getPrice(m.ticker, "BUY");
			price += unitPrice * m.value;
		}

		return { weight, volume, price };
	}

	// prices resolve async, a run started later may finish first: only the
	// latest run may set a total, a slower older one is stale
	const { start: startTotal } = useRunProgress();
	const { start: startOverview } = useRunProgress();

	watchEffect(() => {
		const run = startTotal();
		// the sync part of calculateTotal reads the dependencies
		void calculateTotal(xitTransferElements.value).then((total) => {
			if (run.isCurrent()) totalInformation.value = total;
		});
	});

	watch(
		() => xitTransferElementsNeed.value,
		async (overview) => {
			const run = startOverview();
			const total = await calculateTotal(overview);
			if (run.isCurrent())
				overviewTotalInformation.value = total;
		},
		{ deep: true, immediate: true }
	);
	// one line of totals under a table
	const totalsStrip =
		"flex flex-wrap gap-x-6 gap-y-1 px-1 text-sm tabular-nums [&_dt]:text-muted-strong [&>div]:flex [&>div]:gap-2";
</script>

<template>
	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<h2 class="inline-flex items-center text-white/80 font-bold text-lg">
				{{ $t("plan.tools.construction_cart.title") }}
				<PTooltip v-if="unplannedBuildings.length > 0">
					<template #trigger>
						<PIcon class="text-warning ml-1 relative top-px">
							<WarningAmberRound />
						</PIcon>
					</template>
					{{
						$t("plan.tools.construction_cart.unplanned_info", {
							buildings: unplannedBuildings.join("+"),
							fio_updated: fioUpdated,
						})
					}}
				</PTooltip>
			</h2>
			<span class="text-sm text-muted">
				{{ $t("plan.tools.descriptions.construction-cart") }}
			</span>
			<div class="ml-auto flex flex-wrap items-center gap-2">
				<span v-if="!saveUuid" class="text-xs text-muted">
					{{ $t("plan.tools.construction_cart.built_not_saved") }}
				</span>
				<PButton
					v-if="Object.keys(manualBuilt).length > 0"
					size="sm"
					type="secondary"
					@click="resetAllBuilt">
					<template #icon><RestartAltSharp /></template>
					{{ $t("plan.tools.construction_cart.built_reset_all") }}
				</PButton>
				<XITTransferActionButton
					source="construction_cart"
					:elements="xitTransferElementsOverview"
					transfer-name="Construct"
					:drawer-width="400" />
			</div>
		</div>

		<!-- Buildings: built and to build, and what each needs -->
		<section class="flex flex-col gap-2">
			<h3 class="font-medium text-ink-strong">
				{{ $t("plan.tools.construction_cart.sections.buildings") }}
			</h3>
		<PTable striped>
			<thead>
				<tr>
					<th>
						{{ $t("plan.tools.construction_cart.table.building") }}
					</th>
					<th>
						{{ $t("plan.tools.construction_cart.table.built") }}
					</th>
					<th>
						<div class="inline-flex">
							<span>{{
								$t("plan.tools.construction_cart.table.amount")
							}}</span>
							<PTooltip v-if="deficitWorkforceTypes.length > 0">
								<template #trigger>
									<PIcon
										class="text-warning ml-1 relative top-px">
										<WarningAmberRound />
									</PIcon>
								</template>
								{{
									$t(
										"plan.tools.construction_cart.table.habitation_info"
									)
								}}
							</PTooltip>
						</div>
					</th>
					<th>
						{{ $t("plan.tools.construction_cart.table.planned") }}
					</th>
					<th
						v-for="mat in uniqueMaterials"
						:key="`CONSTRUCTIONCART#COLUMN#${mat}`"
						class="text-center!">
						<MaterialTile
							:key="mat"
							:ticker="mat"
							popover-placement="bottom" />
					</th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="building in buildingTicker"
					:key="`CONSTRUCTIONCART#ROW#${building}`">
					<th>{{ building }}</th>
					<th>
						<div class="flex flex-row items-center gap-x-1">
							<PInputNumber
								:value="getBuilt(building)"
								:aria-label="
									$t(
										'plan.tools.construction_cart.built_label',
										{ building }
									)
								"
								show-buttons
								size="sm"
								class="min-w-20"
								:status="
									getBuilt(building) >
									(plannedBuildings[building] ?? 0)
										? 'warning'
										: undefined
								"
								:min="0"
								@update:value="(v) => setBuilt(building, v)" />
							<template v-if="isManualBuilt(building)">
								<PTooltip>
									<template #trigger>
										<PIcon
											class="text-muted"
											role="img"
											:aria-label="
												$t(
													'plan.tools.construction_cart.built_manual'
												)
											">
											<EditSharp />
										</PIcon>
									</template>
									{{
										$t(
											"plan.tools.construction_cart.built_manual"
										)
									}}
								</PTooltip>
								<PButton
									size="sm"
									type="ghost"
									:aria-label="
										$t(
											'plan.tools.construction_cart.built_reset',
											{ building }
										)
									"
									@click="setBuilt(building, null)">
									<template #icon><RestartAltSharp /></template>
								</PButton>
							</template>
						</div>
					</th>
					<th class="border-r!">
						<PInputNumber
							:value="localBuildingAmount[building]"
							:aria-label="
								$t(
									'plan.tools.construction_cart.amount_label',
									{ building }
								)
							"
							show-buttons
							size="sm"
							class="min-w-20"
							:status="
								isDeficitHabitationBuilding(building)
									? 'error'
									: undefined
							"
							:min="0"
							@update:value="
								(v: number | null | undefined) =>
									(amountOverrides[building] = v ?? null)
							" />
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
									? 'text-muted'
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
					<td :colspan="4">
						{{
							$t(
								"plan.tools.construction_cart.table.materials_sum"
							)
						}}
					</td>
					<td
						v-for="mat in uniqueMaterials"
						:key="`CONSTRUCTIONCART#COLUMN#TOTALS#${mat}`"
						class="text-center font-bold">
						{{ formatAmount(totalMaterials[mat] ?? 0) }}
					</td>
				</tr>
				</tbody>
			</PTable>
			<dl :class="totalsStrip">
				<div>
					<dt>{{ $t("plan.tools.construction_cart.table.total_cost") }}</dt>
					<dd class="font-medium text-ink-strong">
						{{ formatNumber(totalInformation.price) }} ȼ
					</dd>
				</div>
				<div class="@min-[40rem]:ml-auto">
					<dt>{{ $t("plan.tools.construction_cart.table.total_weight") }}</dt>
					<dd>{{ formatNumber(totalInformation.weight) }} t</dd>
				</div>
				<div>
					<dt>{{ $t("plan.tools.construction_cart.table.total_volume") }}</dt>
					<dd>{{ formatNumber(totalInformation.volume) }} m³</dd>
				</div>
			</dl>
		</section>

		<!-- Materials: what is left to buy after stock and overrides -->
		<section class="flex flex-col gap-2">
			<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
				<h3 class="font-medium text-ink-strong">
					{{ $t("plan.tools.construction_cart.sections.materials") }}
				</h3>
				<div class="ml-auto flex flex-wrap items-center gap-2">
					<label
						v-if="hasStorage && storageOptions"
						class="flex items-center gap-2 text-sm text-muted-strong">
						{{ $t("plan.tools.construction_cart.table.storage") }}
						<PSelect
							v-model:value="refSelectedStorage"
							:aria-label="
								$t('plan.tools.construction_cart.table.storage')
							"
							size="sm"
							searchable
							:options="storageOptions"
							class="w-56!" />
					</label>
					<XITTransferActionButton
						source="construction_cart_need"
						:elements="xitTransferElementsNeed"
						transfer-name="Construct"
						:drawer-width="400" />
				</div>
			</div>

			<PTable striped>
				<thead>
					<tr>
						<th>
							{{
								$t(
									"plan.tools.construction_cart.table.material"
								)
							}}
						</th>
						<th class="numeric">
							{{
								$t("plan.tools.construction_cart.table.amount")
							}}
						</th>
						<th v-if="hasStorage" class="numeric">
							{{ $t("plan.tools.construction_cart.table.stock") }}
						</th>
						<th>
							{{
								$t(
									"plan.tools.construction_cart.table.stock_override"
								)
							}}
						</th>
						<th class="numeric">
							{{ $t("plan.tools.construction_cart.table.need") }}
						</th>
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
						<td class="numeric">
							{{ formatAmount(material.amount) }}
						</td>
						<td v-if="hasStorage" class="numeric">
							{{ formatAmount(material.stock) }}
						</td>
						<td>
							<PInputNumber
								v-model:value="
									refStorageOverride[material.ticker]
								"
								:aria-label="
									$t(
										'plan.tools.construction_cart.override_label',
										{ ticker: material.ticker }
									)
								"
								placeholder=""
								show-buttons
								:min="0"
								class="max-w-50" />
						</td>
						<td class="numeric">
							{{ formatAmount(material.total) }}
						</td>
					</tr>
</tbody>
			</PTable>
			<dl :class="totalsStrip">
				<div>
					<dt>{{ $t("plan.tools.construction_cart.table.total_cost") }}</dt>
					<dd class="font-medium text-ink-strong">
						{{ formatNumber(overviewTotalInformation.price) }} ȼ
					</dd>
				</div>
				<div class="@min-[40rem]:ml-auto">
					<dt>{{ $t("plan.tools.construction_cart.table.total_weight") }}</dt>
					<dd>{{ formatNumber(overviewTotalInformation.weight) }} t</dd>
				</div>
				<div>
					<dt>{{ $t("plan.tools.construction_cart.table.total_volume") }}</dt>
					<dd>{{ formatNumber(overviewTotalInformation.volume) }} m³</dd>
				</div>
			</dl>
		</section>
	</div>
</template>
