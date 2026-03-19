<script setup lang="ts">
	import { computed, ComputedRef, PropType } from "vue";

	// Types & Interfaces
	import { IProductionBuilding } from "@/features/planning/usePlanCalculation.types";

	// Components
	import PlanProductionRecipe from "@/features/planning/components/PlanProductionRecipe.vue";

	// Util
	import { capitalizeString } from "@/util/text";
	import { formatNumber } from "@/util/numbers";

	// UI
	import { PTooltip, PButton, PInputNumber } from "@/ui";
	import { ClearSharp, PlusSharp } from "@vicons/material";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		buildingData: {
			type: Object as PropType<IProductionBuilding>,
			required: true,
		},
		buildingIndex: {
			type: Number,
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
	});

	const emit = defineEmits<{
		(e: "update:building:amount", index: number, value: number): void;
		(e: "delete:building", index: number): void;
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
	const localBuildingData: ComputedRef<IProductionBuilding> = computed(
		() => props.buildingData
	);

	const expertiseString = computed(() => {
		if (localBuildingData.value.expertise) {
			return localBuildingData.value.expertise
				.replaceAll("_", " ")
				.toLowerCase();
		}
		return "";
	});

	const isPlanetCogc = computed(() => {
		return localBuildingData.value.efficiencyElements.some(
			(element) => element.efficiencyType === "COGC"
		);
	});
</script>

<template>
	<div class="mb-6">
		<div
			class="p-3 rounded-tl rounded-tr border-pp-border border-l border-t border-r grid gap-3 grid-cols-1 grid-rows-[auto_auto] @lg:grid-cols-[1fr_1fr] @lg:grid-rows-1">
			<div class="flex flex-row gap-x-3 items-baseline">
				<h3 class="text-2xl font-bold text-white">
					{{ localBuildingData.name }} -
					{{ localBuildingData.amount }}
				</h3>
				<span :class="isPlanetCogc ? 'text-positive' : ''">{{
					capitalizeString(expertiseString)
				}}</span>
			</div>
			<div
				class="col-1 row-2 @lg:row-1 @lg:col-2 @lg:justify-self-end-safe flex flex-row flex-wrap gap-x-1">
				<PInputNumber
					v-model:value="localBuildingData.amount"
					:disabled="disabled"
					show-buttons
					:min="0"
					class="max-w-25"
					@update:value="
						(value) => {
							if (value !== null && value !== undefined) {
								emit(
									'update:building:amount',
									buildingIndex,
									value
								);
							}
						}
					" />

				<PButton
					v-if="localBuildingData.recipeOptions.length > 0"
					:disabled="disabled"
					@click="emit('add:building:recipe', buildingIndex)">
					<template #icon><PlusSharp /></template>
					RECIPE
				</PButton>
				<PButton
					:disabled="disabled"
					type="error"
					@click="emit('delete:building', buildingIndex)">
					<template #icon><ClearSharp /></template>
				</PButton>
			</div>
		</div>
		<div class="p-3 border-pp-border border-l border-t border-r">
			<div
				v-if="localBuildingData.activeRecipes.length > 0"
				class="grid grid-cols-1 lg:grid-cols-4 gap-6">
				<PlanProductionRecipe
					v-for="(recipe, index) in localBuildingData.activeRecipes"
					:key="`${index}#${recipe.recipeId}`"
					:disabled="disabled"
					:recipe-index="index"
					:recipe-data="recipe"
					:recipe-options="localBuildingData.recipeOptions"
					:cx-uuid="cxUuid"
					:planet-id="planetId"
					@update:building:recipe:amount="
						(index: number, value: number) => {
							emit(
								'update:building:recipe:amount',
								buildingIndex,
								index,
								value
							);
						}
					"
					@delete:building:recipe="
						(index: number) => {
							emit(
								'delete:building:recipe',
								buildingIndex,
								index
							);
						}
					"
					@update:building:recipe="
						(index: number, recipeid: string) => {
							emit(
								'update:building:recipe',
								buildingIndex,
								index,
								recipeid
							);
						}
					" />
			</div>
			<div v-else class="h-full w-full flex items-center justify-center">
				No Active Recipes
			</div>
		</div>
		<div
			class="p-3 border-pp-border border rounded-bl rounded-br bg-white/5 text-nowrap flex flex-row flex-wrap gap-x-3 justify-between">
			<div class="flex flex-wrap gap-x-3">
				<PTooltip>
					<template #trigger>
						<div class="flex gap-x-1 hover:cursor-help">
							<span>Efficiency:</span>
							<span class="font-bold">
								{{
									formatNumber(
										localBuildingData.totalEfficiency * 100
									)
								}}
								%
							</span>
						</div>
					</template>

					<div
						v-for="element in localBuildingData.efficiencyElements"
						:key="`${localBuildingData.name}#EFFICIENCY#${element.efficiencyType}`"
						class="flex flex-row justify-between align-center gap-x-3 child:p-1">
						<div>{{ element.efficiencyType }}</div>
						<div>{{ formatNumber(element.value * 100) }} %</div>
					</div>
				</PTooltip>
				<div class="flex gap-x-1">
					<span>Area:</span>
					<span class="font-bold">
						{{ localBuildingData.areaUsed }}
					</span>
				</div>
			</div>
			<div class="flex flex-wrap gap-x-3">
				<div class="flex gap-x-1">
					<span>Revenue:</span>
					<span
						class="font-bold"
						:class="
							localBuildingData.dailyRevenue >= 0
								? 'text-positive!'
								: 'text-negative!'
						">
						{{ formatNumber(localBuildingData.dailyRevenue) }} $
					</span>
				</div>
				<div class="flex gap-x-1">
					<span>Construction Cost:</span>
					<span class="font-bold">
						{{
							formatNumber(
								localBuildingData.constructionCost * -1
							)
						}}
						<span class="font-light text-white/50">ȼ</span>
					</span>
				</div>
			</div>
		</div>
	</div>
</template>
