<script setup lang="ts">
	import {
		computed,
		defineAsyncComponent,
		nextTick,
		PropType,
		ref,
		type Ref,
	} from "vue";

	// Router
	import router from "@/router";

	// Types & Interfaces
	import { IPlan, IPlanEmpireElement } from "@/stores/planningStore.types";
	import { IPlanet } from "@/features/api/gameData.types";

	// Composables
	import { usePlanetData } from "@/features/game_data/usePlanetData";
	const { getPlanet } = usePlanetData();
	import { useCXData } from "@/features/cx/useCXData";
	const { findEmpireCXUuid } = useCXData();
	import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
	import { usePlan } from "@/features/planning_data/usePlan";
	const {
		createNewPlan,
		saveExistingPlan,
		reloadExistingPlan,
		patchMaterialIO,
	} = usePlan();

	// Util
	import { formatNumber } from "@/util/numbers";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanBonuses from "@/features/planning/components/PlanBonuses.vue";
	import PlanArea from "@/features/planning/components/PlanArea.vue";
	import PlanWorkforce from "@/features/planning/components/PlanWorkforce.vue";
	import PlanInfrastructure from "@/features/planning/components/PlanInfrastructure.vue";
	import PlanExperts from "@/features/planning/components/PlanExperts.vue";
	import PlanProduction from "@/features/planning/components/PlanProduction.vue";
	import PlanMaterialIO from "@/features/planning/components/PlanMaterialIO.vue";
	import PlanConfiguration from "@/features/planning/components/PlanConfiguration.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	const ShareButton = defineAsyncComponent(
		() => import("@/features/sharing/components/SharingButton.vue")
	);

	// UI
	import { NButton, NIcon, NTooltip, NSpin } from "naive-ui";
	import {
		AutoAwesomeMosaicOutlined,
		AutoAwesomeMosaicFilled,
		ShoppingBasketSharp,
		AttachMoneySharp,
		DataSaverOffSharp,
		DataObjectRound,
		SaveSharp,
		ChangeCircleOutlined,
	} from "@vicons/material";
	import { onBeforeRouteLeave } from "vue-router";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: false,
			default: false,
		},
		planData: {
			type: Object as PropType<IPlan>,
			required: true,
		},
		empireList: {
			type: Array as PropType<IPlanEmpireElement[]>,
			required: false,
			default: undefined,
		},
	});

	const refPlanData: Ref<IPlan> = ref(props.planData);
	const refEmpireList: Ref<IPlanEmpireElement[] | undefined> = ref(
		props.empireList
	);
	const refEmpireUuid: Ref<string | undefined> = ref(undefined);
	const refCXUuid: Ref<string | undefined> = ref(undefined);

	const {
		existing,
		saveable,
		modified,
		result,
		planName,
		backendData,
		computedActiveEmpire,
		planEmpires,
		handleResetModified,
		handleUpdateCorpHQ,
		handleUpdateCOGC,
		handleUpdatePermits,
		handleUpdateWorkforceLux,
		handleUpdateInfrastructure,
		handleUpdateExpert,
		handleUpdateBuildingAmount,
		handleDeleteBuilding,
		handleCreateBuilding,
		handleUpdateBuildingRecipeAmount,
		handleDeleteBuildingRecipe,
		handleAddBuildingRecipe,
		handleChangeBuildingRecipe,
		handleChangePlanName,
	} = usePlanCalculation(
		refPlanData,
		refEmpireUuid,
		refEmpireList,
		refCXUuid
	);

	const planetData: IPlanet = getPlanet(props.planData.planet_id);

	const refVisualShowConfiguration: Ref<boolean> = ref(true);
	const refMaterialIOShowBasked: Ref<boolean> = ref(false);
	const refMaterialIOSplitted: Ref<boolean> = ref(false);

	/**
	 * Handle initial empire uuid assignment
	 *
	 * Option A: no empire list => undefined
	 * Option B: planData has empires in list, use first uuid
	 * Option C: empire list => use first element
	 * Fallback: undefined
	 */
	if (!props.empireList) {
		refEmpireUuid.value = undefined;
	} else if (planEmpires.value.length > 0) {
		refEmpireUuid.value = planEmpires.value[0].uuid;
		// update cx uuid
		refCXUuid.value = findEmpireCXUuid(refEmpireUuid.value);
	} else if (props.empireList && props.empireList.length > 0) {
		refEmpireUuid.value = props.empireList[0].uuid;
		refCXUuid.value = findEmpireCXUuid(refEmpireUuid.value);
	}

	/**
	 * Tool Setup
	 */

	type toolOptions =
		| "visitation-frequency"
		| "repair-analysis"
		| "popr"
		| null;
	const refShowTool: Ref<toolOptions> = ref(null);

	function openTool(key: toolOptions): void {
		refShowTool.value = null;
		nextTick(() => {
			key != refShowTool.value
				? (refShowTool.value = key)
				: (refShowTool.value = null);
		});
	}

	const compViewToolMeta = computed(() => {
		switch (refShowTool.value) {
			case "visitation-frequency":
				return {
					component: defineAsyncComponent(
						() =>
							import(
								"@/features/planning/components/tools/PlanVisitationFrequency.vue"
							)
					),
					props: {
						stoAmount: result.value.infrastructure["STO"],
						materialIO: result.value.materialio,
						disabled: props.disabled,
						planUuid: refPlanData.value.uuid,
					},
					listeners: {},
				};
			case "repair-analysis":
				return {
					component: defineAsyncComponent(
						() =>
							import(
								"@/features/planning/components/tools/PlanRepairAnalysis.vue"
							)
					),
					props: {
						data: result.value.production.buildings.map((b) => {
							return {
								name: b.name,
								amount: b.amount,
								dailyRevenue: b.dailyRevenue,
								constructionMaterials: b.constructionMaterials,
							};
						}),
						cxUuid: refCXUuid.value,
						planetNaturalId: planetData.PlanetNaturalId,
					},
					listeners: {},
				};
			case "popr":
				return {
					component: defineAsyncComponent(
						() =>
							import(
								"@/features/planning/components/tools/PlanPOPR.vue"
							)
					),
					props: {
						planetNaturalId: planetData.PlanetNaturalId,
						workforceData: result.value.workforce,
					},
					listeners: {},
				};
			default:
				return null;
		}
	});

	/*
	 * Plan Saving & Reloading
	 */

	const refIsSaving: Ref<boolean> = ref(false);

	async function save(): Promise<void> {
		refIsSaving.value = true;

		// plan exists, trigger a save
		if (existing.value) {
			await saveExistingPlan(refPlanData.value.uuid!, backendData.value);

			await patchMaterialIO(
				refPlanData.value.uuid!,
				planetData.PlanetNaturalId,
				result.value.materialio
			);

			// reset modified state
			handleResetModified();

			refIsSaving.value = false;
		} else {
			await createNewPlan(backendData.value).then(
				async (newUuid: string | undefined) => {
					if (newUuid) {
						refIsSaving.value = false;
						refPlanData.value.uuid = newUuid;

						await patchMaterialIO(
							refPlanData.value.uuid!,
							planetData.PlanetNaturalId,
							result.value.materialio
						);

						// reset modified state
						handleResetModified();

						router.push(
							`/plan/${planetData.PlanetNaturalId}/${newUuid}`
						);
					}
				}
			);
			refIsSaving.value = false;
		}
	}

	const refIsReloading: Ref<boolean> = ref(false);

	async function reloadPlan(): Promise<void> {
		if (!existing.value || !refPlanData.value.uuid) {
			throw new Error(`Unable to reload plan without uuid.`);
		}

		refIsReloading.value = true;

		await reloadExistingPlan(refPlanData.value.uuid).then(
			(result: IPlan) => (refPlanData.value = result)
		);
		refIsReloading.value = false;
	}

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: computed(() =>
			planName.value
				? `${planName.value} | PRUNplanner`
				: `${props.planData.planet_id} | PRUNplanner`
		),
	});

	// Route Guard
	onBeforeRouteLeave(() => {
		if (modified.value) {
			// eslint-disable-next-line no-undef
			const answer = confirm(
				"Do you really want to leave? Unsaved changes will be lost."
			);

			if (!answer) return false;
		}
	});
</script>

<template>
	<div
		class="h-view grid grid-cols-1 gap-y-6"
		:class="refVisualShowConfiguration ? 'lg:grid-cols-[300px_auto]' : ''">
		<div
			class="border-r border-white/10"
			:class="!refVisualShowConfiguration ? 'hidden' : 'visible'">
			<div class="p-6">
				<div class="pb-6">
					<h1 class="text-2xl font-bold text-white">
						{{ planetData.PlanetName }}
					</h1>
					<span
						v-if="
							planetData.PlanetName != planetData.PlanetNaturalId
						"
						class="text-white/60">
						{{ planetData.PlanetNaturalId }}
					</span>
				</div>

				<h2 class="text-white/80 font-bold text-lg pb-3">
					Configuration
				</h2>

				<PlanConfiguration
					:disabled="disabled"
					:plan-name="planName"
					:empire-options="refEmpireList"
					:active-empire="computedActiveEmpire"
					:plan-empires="planEmpires"
					@update:active-empire="
						(empireUuid: string) => {
							refEmpireUuid = empireUuid;
							refCXUuid = findEmpireCXUuid(empireUuid);
						}
					"
					@update:plan-name="handleChangePlanName" />
			</div>

			<div class="p-6 pt-0">
				<h2 class="text-white/80 font-bold text-lg pb-3">Area</h2>
				<PlanArea
					:disabled="disabled"
					:area-data="result.area"
					@update:permits="handleUpdatePermits" />
			</div>
			<div class="p-6 pt-0">
				<h2 class="text-white/80 font-bold text-lg pb-3">
					Infrastructure
				</h2>
				<PlanInfrastructure
					:disabled="disabled"
					:infrastructure-data="result.infrastructure"
					@update:infrastructure="handleUpdateInfrastructure" />
			</div>
			<div class="p-6 pt-0">
				<h2 class="text-white/80 font-bold text-lg pb-3">Bonuses</h2>

				<PlanBonuses
					:disabled="disabled"
					:corphq="result.corphq"
					:cogc="result.cogc"
					@update:corphq="handleUpdateCorpHQ"
					@update:cogc="handleUpdateCOGC" />
			</div>
			<div class="p-6 pt-0">
				<h2 class="text-white/80 font-bold text-lg pb-3">Experts</h2>
				<PlanExperts
					:disabled="disabled"
					:expert-data="result.experts"
					@update:expert="handleUpdateExpert" />
			</div>
		</div>
		<div class="">
			<div class="border-b border-white/10 p-6">
				<div class="flex flex-row">
					<div class="child:mt-1 pr-6 child:cursor-pointer">
						<n-icon
							size="24"
							@click="
								refVisualShowConfiguration =
									!refVisualShowConfiguration
							">
							<AutoAwesomeMosaicFilled
								v-if="!refVisualShowConfiguration" />
							<AutoAwesomeMosaicOutlined v-else />
						</n-icon>
					</div>
					<div class="flex flex-grow justify-between">
						<div class="flex">
							<div class="my-auto pr-3 font-bold">Resources</div>
							<div class="my-auto pr-3 flex gap-x-1">
								<n-tooltip
									v-for="resource in planetData.Resources"
									:key="`PLANET#RESOURCE#${resource.MaterialTicker}`"
									trigger="hover">
									<template #trigger>
										<div class="hover:cursor-help">
											<MaterialTile
												:ticker="
													resource.MaterialTicker
												"
												:amount="
													parseFloat(
														formatNumber(
															resource.DailyExtraction
														)
													)
												" />
										</div>
									</template>
									{{ resource.ResourceType }}
								</n-tooltip>
							</div>
						</div>
						<div class="flex gap-x-3">
							<n-button
								v-if="saveable"
								:loading="refIsSaving"
								:type="modified ? 'error' : 'success'"
								size="small"
								:disabled="disabled"
								@click="save">
								<template #icon><SaveSharp /></template>
								{{ existing ? "Save" : "Create" }}
							</n-button>
							<n-button
								v-if="existing"
								size="small"
								:disabled="disabled"
								:loading="refIsReloading"
								@click="reloadPlan">
								<template #icon>
									<ChangeCircleOutlined />
								</template>
								Reload
							</n-button>

							<ShareButton
								v-if="!disabled && refPlanData.uuid"
								button-size="small"
								:plan-uuid="refPlanData.uuid" />

							<HelpDrawer file-name="plan" />
						</div>
					</div>
				</div>
			</div>
			<div class="border-b border-white/10 p-3">
				<div class="flex grow justify-end gap-x-3 my-auto">
					<n-button size="small" secondary disabled>
						Empire Override
					</n-button>
					<n-button size="small" secondary @click="openTool('popr')">
						POPR
					</n-button>
					<n-button
						size="small"
						secondary
						@click="openTool('visitation-frequency')">
						Visitation Frequency
					</n-button>
					<n-button size="small" secondary disabled>
						Construction Cart
					</n-button>
					<n-button size="small" secondary disabled>
						Supply Cart
					</n-button>
					<n-button
						size="small"
						secondary
						@click="openTool('repair-analysis')">
						Repair Analysis
					</n-button>
					<n-button size="small" secondary disabled>
						Habitation Optimization
					</n-button>
				</div>
			</div>
			<div
				:class="
					!refShowTool
						? 'opacity-0 overflow-hidden !h-0'
						: 'px-6 py-3 opacity-100 border-b border-white/10'
				"
				class="transition-discrete transition-opacity duration-500">
				<Suspense v-if="refShowTool && compViewToolMeta">
					<template #default>
						<component
							:is="compViewToolMeta.component"
							:key="`${refShowTool}`"
							v-bind="compViewToolMeta.props"
							v-on="compViewToolMeta.listeners"
							@close="() => (refShowTool = null)" />
					</template>
					<template #fallback>
						<div class="w-full text-center py-5">
							<n-spin size="small" />
						</div>
					</template>
				</Suspense>
			</div>
			<div class="p-6 grid grid-cols-1 lg:grid-cols-[auto_450px] gap-6">
				<div>
					<div
						class="grid grid-cols-1 2xl:grid-cols-[60%_auto] gap-6">
						<div>
							<h2 class="text-white/80 font-bold text-lg pb-3">
								Workforce
							</h2>
							<PlanWorkforce
								:disabled="disabled"
								:workforce-data="result.workforce"
								@update:lux="handleUpdateWorkforceLux" />
						</div>
						<div>
							<h2 class="text-white/80 font-bold text-lg pb-3">
								Overview
							</h2>
							foo
						</div>
					</div>
					<div class="pt-6">
						<PlanProduction
							:disabled="disabled"
							:production-data="result.production"
							:cogc="result.cogc"
							@update:building:amount="handleUpdateBuildingAmount"
							@delete:building="handleDeleteBuilding"
							@create:building="handleCreateBuilding"
							@update:building:recipe:amount="
								handleUpdateBuildingRecipeAmount
							"
							@delete:building:recipe="handleDeleteBuildingRecipe"
							@add:building:recipe="handleAddBuildingRecipe"
							@update:building:recipe="
								handleChangeBuildingRecipe
							" />
					</div>
				</div>
				<div>
					<div class="sticky top-3">
						<h2
							class="text-white/80 font-bold text-lg pb-3 flex justify-between child:my-auto">
							<div>Material I/O</div>
							<div class="flex gap-x-3">
								<n-tooltip trigger="hover">
									<template #trigger>
										<n-button
											size="tiny"
											secondary
											@click="
												refMaterialIOShowBasked =
													!refMaterialIOShowBasked
											">
											<template #icon>
												<ShoppingBasketSharp
													v-if="
														!refMaterialIOShowBasked
													" />
												<AttachMoneySharp v-else />
											</template>
										</n-button>
									</template>
									Toggle Weight & Volume
								</n-tooltip>

								<n-tooltip trigger="hover">
									<template #trigger>
										<n-button
											size="tiny"
											secondary
											@click="
												refMaterialIOSplitted =
													!refMaterialIOSplitted
											">
											<template #icon>
												<DataObjectRound
													v-if="
														!refMaterialIOSplitted
													" />
												<DataSaverOffSharp v-else />
											</template>
										</n-button>
									</template>
									Toggle Production & Workforce Split
								</n-tooltip>
							</div>
						</h2>
						<template v-if="!refMaterialIOSplitted">
							<PlanMaterialIO
								:material-i-o-data="result.materialio"
								:show-basked="refMaterialIOShowBasked" />
						</template>
						<template v-else>
							<h3 class="font-bold pb-3">Production</h3>
							<PlanMaterialIO
								:material-i-o-data="result.productionMaterialIO"
								:show-basked="refMaterialIOShowBasked" />
							<h3 class="font-bold py-3">Workforce</h3>
							<PlanMaterialIO
								:material-i-o-data="result.workforceMaterialIO"
								:show-basked="refMaterialIOShowBasked" />
						</template>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
