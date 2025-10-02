<script setup lang="ts">
	import { computed, ComputedRef, PropType, ref, Ref } from "vue";

	// Composables
	import { useBuildingData } from "@/database/services/useBuildingData";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanProductionBuilding from "@/features/planning/components/PlanProductionBuilding.vue";

	// Types & Interfaces
	import { IPlanetResource } from "@/features/api/gameData.types";
	import { IProductionResult } from "@/features/planning/usePlanCalculation.types";
	import { PLAN_COGCPROGRAM_TYPE } from "@/stores/planningStore.types";

	// UI
	import { PCheckbox, PSelect, PTooltip } from "@/ui";

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
			type: String as PropType<PLAN_COGCPROGRAM_TYPE>,
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
			type: Object as PropType<IPlanetResource[]>,
			required: true,
		},
	});

	const emit = defineEmits<{
		// from PlanProductionBuilding.vue
		(e: "update:building:amount", index: number, value: number): void;
		(e: "delete:building", index: number): void;
		(e: "create:building", ticker: string): void;
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
	const localCOGC: ComputedRef<PLAN_COGCPROGRAM_TYPE> = computed(
		() => props.cogc
	);
	const localMatchCOGC: Ref<boolean> = ref(false);

	const { getProductionBuildingOptions } = await useBuildingData();
</script>

<template>
	<h2 class="text-white/80 font-bold text-lg">Production</h2>
	<div
		class="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 py-3 child:my-auto">
		<div class="flex gap-3 child:my-auto">
			<div v-if="planetResources.length" class="text-sm">
				Planet Resources
			</div>
			<div class="flex flex-wrap gap-1 child:my-auto">
				<PTooltip
					v-for="resource in planetResources"
					:key="`PLANET#RESOURCE#${resource.MaterialTicker}`">
					<template #trigger>
						<div class="hover:cursor-help">
							<MaterialTile
								:key="resource.MaterialTicker"
								:ticker="resource.MaterialTicker"
								:amount="
									parseFloat(
										formatNumber(resource.DailyExtraction)
									)
								"
								disable-drawer
								:enable-popover="false" />
						</div>
					</template>
					{{ resource.ResourceType }} ({{
						resource.ResourceType === "MINERAL"
							? "EXT"
							: resource.ResourceType === "GASEOUS"
							? "COL"
							: "RIG"
					}})
				</PTooltip>
			</div>
		</div>
		<div class="sm:justify-self-end-safe flex child:my-auto gap-3">
			<div class="flex gap-3">
				<div class="text-sm text-nowrap">Match COGC</div>
				<PCheckbox
					v-model:checked="localMatchCOGC"
					:disabled="disabled" />
			</div>

			<PSelect
				v-model:value="localSelectedBuilding"
				:disabled="disabled"
				searchable
				class="w-full sm:!w-[300px]"
				:options="
					getProductionBuildingOptions(
						localProductionData.buildings.map((e) => e.name),
						localMatchCOGC ? localCOGC : undefined
					)
				"
				@update:value="
					(value) => {
						emit('create:building', value as string);
						trackEvent('plan_create_building', {planetNaturalId: props.planetId, buildingTicker: value as string})
					}
				" />
		</div>
	</div>

	<PlanProductionBuilding
		v-for="(building, index) in localProductionData.buildings"
		:key="building.name"
		:disabled="props.disabled"
		:building-data="building"
		:building-index="index"
		:cx-uuid="cxUuid"
		:planet-id="planetId"
		@update:building:amount="
			(index: number, value: number) =>
				{
					emit('update:building:amount', index, value);
					trackEvent('plan_update_building', {planetNaturalId: props.planetId, buildingTicker: building.name, amount: value})
				}
		"
		@delete:building="(index: number) => emit('delete:building', index)"
		@update:building:recipe:amount="
			(buildingIndex: number, recipeIndex: number, value: number) =>
				{
					emit(
						'update:building:recipe:amount',
						buildingIndex,
						recipeIndex,
						value
					);
					trackEvent('plan_update_building_recipe_amount', {planetNaturalId: props.planetId, buildingTicker: building.name, recipeIndex: recipeIndex, amount: value})
			}
		"
		@delete:building:recipe="
			(buildingIndex: number, recipeIndex: number) =>
				{
					emit('delete:building:recipe', buildingIndex, recipeIndex);
					trackEvent('plan_update_building_delete_recipe', {planetNaturalId: props.planetId, buildingTicker: building.name, recipeIndex: recipeIndex})
				}
		"
		@add:building:recipe="
			(buildingIndex: number) =>
				{
					emit('add:building:recipe', buildingIndex);
					trackEvent('plan_update_building_add_recipe', {planetNaturalId: props.planetId, buildingTicker: building.name})
				}
		"
		@update:building:recipe="
			(buildingIndex: number, recipeIndex: number, recipeId: string) =>
				{
					emit(
						'update:building:recipe',
						buildingIndex,
						recipeIndex,
						recipeId
					);
					trackEvent('plan_update_building_change_recipe', {planetNaturalId: props.planetId, buildingTicker: building.name, recipeId})
				}
		" />
</template>
