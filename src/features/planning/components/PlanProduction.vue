<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		type PropType,
		ref,
		type Ref,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useBuildingData } from "@/database/services/useBuildingData";
	import { trackPlanEdit } from "@/lib/analytics/useAnalytics";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanProductionBuilding from "@/features/planning/components/PlanProductionBuilding.vue";

	// Types & Interfaces
	import type {
		PlanetResource,
		PlanetResourceType,
	} from "@/features/api/schemas/gameData.schemas";
	import type { IProductionResult } from "@/features/planning/usePlanCalculation.types";
	import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";

	// UI
	import PCheckbox from "@/ui/components/PCheckbox.vue";
	import PSelect from "@/ui/components/PSelect.vue";
	import PTooltip from "@/ui/components/PTooltip.vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		productionData: {
			type: Object as PropType<IProductionResult>,
			required: true,
		},
		cogc: {
			type: String as PropType<PlanCOGCProgram>,
			required: true,
		},
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		planetId: {
			type: String,
			required: true,
		},
		planetResources: {
			type: Object as PropType<PlanetResource[]>,
			required: true,
		},
	});

	const emit = defineEmits<{
		// from PlanProductionBuilding.vue
		(e: "update:building:amount", index: number, value: number): void;
		(e: "delete:building", index: number): void;
		(e: "create:building", ticker: string): void;
		(e: "create:building:recipe", ticker: string, recipeId: string): void;
		(
			e: "update:building:recipe:amount",
			buildingIndex: number,
			recipeIndex: number,
			value: number
		): void;
		(
			e: "delete:building:recipe",
			buildingIndex: number,
			recipeIndex: number
		): void;
		(e: "add:building:recipe", buildingIndex: number): void;
		(
			e: "update:building:recipe",
			buildingIndex: number,
			recipeIndex: number,
			recipeid: string
		): void;
	}>();

	// Local State
	const localProductionData: ComputedRef<IProductionResult> = computed(
		() => props.productionData
	);
	const localSelectedBuilding: Ref<string | undefined> = ref(undefined);
	const localCOGC: ComputedRef<PlanCOGCProgram> = computed(() => props.cogc);
	const localMatchCOGC: Ref<boolean> = ref(false);

	const { getProductionBuildingOptions } = useBuildingData();

	function emitCreateBuildingWithRecipe(
		resourceType: PlanetResourceType,
		resourceTicker: string
	): void {
		const buildingTicker =
			resourceType === "MINERAL"
				? "EXT"
				: resourceType === "GASEOUS"
					? "COL"
					: "RIG";

		emit(
			"create:building:recipe",
			buildingTicker,
			buildingTicker + "#" + resourceTicker
		);
	}
</script>

<template>
	<h2 class="text-white/80 font-bold text-lg">
		{{ $t("plan.components.production.label") }}
	</h2>
	<div
		class="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 py-3 child:my-auto">
		<div class="flex gap-3 child:my-auto">
			<div v-if="planetResources.length" class="text-sm">
				{{ $t("plan.components.production.planet_resources") }}
			</div>
			<div class="flex flex-wrap gap-1 child:my-auto">
				<PTooltip
					v-for="resource in planetResources"
					:key="`PLANET#RESOURCE#${resource.material_ticker}`">
					<template #trigger>
						<div
							class="hover:cursor-pointer"
							@click="
								emitCreateBuildingWithRecipe(
									resource.resource_type,
									resource.material_ticker
								)
							">
							<MaterialTile
								:key="resource.material_ticker"
								:ticker="resource.material_ticker"
								:amount="
									parseFloat(
										formatNumber(resource.daily_extraction)
									)
								"
								disable-drawer
								:enable-popover="false" />
						</div>
					</template>
					{{ resource.resource_type }} ({{
						resource.resource_type === "MINERAL"
							? "EXT"
							: resource.resource_type === "GASEOUS"
								? "COL"
								: "RIG"
					}})
				</PTooltip>
			</div>
		</div>
		<div
			v-if="!disabled"
			class="sm:justify-self-end-safe flex child:my-auto gap-3">
			<div class="flex gap-3">
				<div class="text-sm text-nowrap">
					{{ $t("plan.components.production.form.match_cogc") }}
				</div>
				<PCheckbox
					v-model:checked="localMatchCOGC"
					:aria-label="
						$t('plan.components.production.form.match_cogc')
					" />
			</div>

			<PSelect
				v-model:value="localSelectedBuilding"
				:aria-label="
					$t('plan.components.production.form.select_placeholder')
				"
				searchable
				:placeholder="
					t('plan.components.production.form.select_placeholder')
				"
				class="w-full sm:w-75!"
				:options="
					getProductionBuildingOptions(
						localProductionData.buildings.map((e) => e.name),
						localMatchCOGC ? localCOGC : undefined
					)
				"
				@update:value="
					(value) => {
						emit('create:building', value as string);
						trackPlanEdit({
							field: 'building_add',
							planet_natural_id: props.planetId,
							building_ticker: value as string,
						});
					}
				" />
		</div>
	</div>

	<div class="border border-white/10 rounded overflow-hidden">
		<div
			class="grid grid-cols-12 text-xs uppercase p-3 bg-white/5 font-bold">
			<div class="col-span-3">
				{{ $t("plan.components.production.table.building_recipe") }}
			</div>
			<div class="col-span-3">
				{{ $t("plan.components.production.table.runtime") }}
			</div>
			<div class="col-span-3">
				{{ $t("plan.components.production.table.share") }}
			</div>
			<div class="col-span-3 text-end">
				{{ $t("plan.components.production.table.tools") }}
			</div>
		</div>
		<template
			v-for="(building, index) in localProductionData.buildings"
			:key="`${building.name}`">
			<PlanProductionBuilding
				:disabled="props.disabled"
				:building-data="building"
				:building-index="index"
				:cx-uuid="cxUuid"
				:planet-id="planetId"
				@update:building:amount="
					(index: number, value: number) => {
						emit('update:building:amount', index, value);
						trackPlanEdit({
							field: 'building_amount',
							planet_natural_id: props.planetId,
							building_ticker: building.name,
							amount: value,
						});
					}
				"
				@delete:building="
					(index: number) => emit('delete:building', index)
				"
				@update:building:recipe:amount="
					(
						buildingIndex: number,
						recipeIndex: number,
						value: number
					) => {
						emit(
							'update:building:recipe:amount',
							buildingIndex,
							recipeIndex,
							value
						);
						trackPlanEdit({
							field: 'recipe_amount',
							planet_natural_id: props.planetId,
							building_ticker: building.name,
							amount: value,
						});
					}
				"
				@delete:building:recipe="
					(buildingIndex: number, recipeIndex: number) => {
						emit(
							'delete:building:recipe',
							buildingIndex,
							recipeIndex
						);
						trackPlanEdit({
							field: 'recipe_delete',
							planet_natural_id: props.planetId,
							building_ticker: building.name,
						});
					}
				"
				@add:building:recipe="
					(buildingIndex: number) => {
						emit('add:building:recipe', buildingIndex);
						trackPlanEdit({
							field: 'recipe_add',
							planet_natural_id: props.planetId,
							building_ticker: building.name,
						});
					}
				"
				@update:building:recipe="
					(
						buildingIndex: number,
						recipeIndex: number,
						recipeId: string
					) => {
						emit(
							'update:building:recipe',
							buildingIndex,
							recipeIndex,
							recipeId
						);
						trackPlanEdit({
							field: 'recipe_change',
							planet_natural_id: props.planetId,
							building_ticker: building.name,
							recipe_id: recipeId,
						});
					}
				" />
		</template>
	</div>
</template>
