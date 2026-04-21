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
	<div
		class="grid grid-cols-12 px-3 py-1.5 items-center bg-white/10 border-b border-t border-white/5 border-l-2 border-l-prunplanner">
		<div class="col-span-6 xl:col-span-2 text-lg font-mono">
			{{ localBuildingData.amount }}x
			<strong>{{ localBuildingData.name }}</strong>
		</div>
		<div
			class="col-span-6 justify-end xl:justify-normal xl:col-span-4 flex items-center gap-x-1">
			<span class="text-[10px] text-white/50 pr-1">Qty</span>
			<PInputNumber
				v-model:value="localBuildingData.amount"
				size="sm"
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
				size="sm"
				:disabled="disabled"
				@click="emit('add:building:recipe', buildingIndex)">
				<template #icon><PlusSharp /></template>
				RECIPE
			</PButton>
		</div>
		<div
			class="col-span-12 xl:col-span-6 flex justify-end items-center gap-6 text-white/80">
			<div class="flex flex-col items-end">
				<span
					class="text-[10px] text-white/50 uppercase tracking-wider">
					Expertise
				</span>
				<span class="text-xs font-mono">
					<span :class="isPlanetCogc ? 'text-positive' : ''">{{
						capitalizeString(expertiseString)
					}}</span>
				</span>
			</div>
			<div class="flex flex-col items-end">
				<span class="text-[10px] text-white/50 uppercase tracking-wide">
					Efficiency
				</span>
				<span class="text-xs font-mono font-bold">
					<PTooltip>
						<template #trigger>
							<div class="flex gap-x-1 hover:cursor-help">
								<span class="font-bold">
									{{
										formatNumber(
											localBuildingData.totalEfficiency *
												100
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
				</span>
			</div>
			<div class="flex flex-col items-end">
				<span class="text-[10px] text-white/50 uppercase tracking-wide">
					Revenue
				</span>
				<span
					class="text-xs font-mono font-bold text-positive"
					:class="
						localBuildingData.dailyRevenue >= 0
							? 'text-positive!'
							: 'text-negative!'
					">
					{{ formatNumber(localBuildingData.dailyRevenue) }}
					<span class="font-light text-white/50">ȼ</span>
				</span>
			</div>
			<div class="flex flex-col items-end">
				<span class="text-[10px] text-white/50 uppercase tracking-wide">
					Area
				</span>
				<span class="text-xs font-mono font-bold">
					{{ localBuildingData.areaUsed }}
				</span>
			</div>
			<div class="flex flex-col items-end">
				<span class="text-[10px] text-white/50 uppercase tracking-wide">
					Construction
				</span>
				<span class="text-xs font-mono font-bold">
					{{ formatNumber(localBuildingData.constructionCost * -1) }}
					<span class="font-light text-white/50">ȼ</span>
				</span>
			</div>
			<div>
				<PButton
					:disabled="disabled"
					size="sm"
					type="error"
					@click="emit('delete:building', buildingIndex)">
					<template #icon><ClearSharp /></template>
				</PButton>
			</div>
		</div>
	</div>
	<div class="col-span-12">
		<div v-if="localBuildingData.activeRecipes.length > 0">
			<div
				v-for="(recipe, index) in localBuildingData.activeRecipes"
				:key="`RECIPE#${index}#${recipe.recipeId}`"
				class="grid grid-cols-12 px-3 py-2 border-l-2 border-transparent items-center even:bg-white/5 border-b border-b-white/10 last:border-b-0 items-center gap-3 xl:gap-0">
				<PlanProductionRecipe
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
		</div>
		<div v-else class="h-full w-full flex items-center justify-center">
			No Active Recipes
		</div>
	</div>
</template>
