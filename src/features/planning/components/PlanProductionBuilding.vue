<script setup lang="ts">
	import { computed, type ComputedRef, type PropType } from "vue";

	// Types & Interfaces
	import type { IProductionBuilding } from "@/features/planning/usePlanCalculation.types";
	import type { PlanDataBuilding } from "@/features/api/schemas/planningData.schemas";
	import type { ITypicalRecipes } from "@/features/plan_analytics/usePlanetInsights.types";
	import type { IBuildingChange } from "@/features/sharing/sharedPlan.types";

	// Composables
	import { usePlanetInsights } from "@/features/plan_analytics/usePlanetInsights";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanProductionRecipe from "@/features/planning/components/PlanProductionRecipe.vue";

	// Util
	import { formatNumber, formatPercent } from "@/util/numbers";
	import { zeroEfficiencyReason } from "@/features/planning/engine/efficiency";

	// UI
	import { PTooltip, PButton, PInputNumber, PValue } from "@/ui";
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
		// what changed against the shared plan
		change: {
			type: Object as PropType<IBuildingChange>,
			required: false,
			default: undefined,
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
			e: "add:building:recipes",
			buildingIndex: number,
			recipes: PlanDataBuilding["active_recipes"]
		): void;
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

	const { typicalRecipes } = usePlanetInsights(() => props.planetId);

	// the planet's typical recipes for an empty building, only ones it can run
	const typicalMix: ComputedRef<ITypicalRecipes | undefined> = computed(() => {
		if (props.disabled || localBuildingData.value.activeRecipes.length > 0)
			return undefined;
		const typical = typicalRecipes(localBuildingData.value.name);
		if (!typical) return undefined;
		const optionIds = new Set(
			localBuildingData.value.recipeOptions.map((o) => o.recipe_id)
		);
		const recipes = typical.recipes.filter((r) =>
			optionIds.has(r.recipeid)
		);
		return recipes.length > 0 ? { ...typical, recipes } : undefined;
	});

	const typicalMixOutputs: ComputedRef<string[]> = computed(() =>
		(typicalMix.value?.recipes ?? []).flatMap(
			(r) =>
				localBuildingData.value.recipeOptions
					.find((o) => o.recipe_id === r.recipeid)
					?.outputs.map((m) => m.material_ticker) ?? []
		)
	);

	// why a building produces nothing, shown next to "0.00 %"
	const zeroReason: ComputedRef<string | undefined> = computed(() => {
		if (localBuildingData.value.totalEfficiency !== 0) return undefined;
		const type = zeroEfficiencyReason(
			localBuildingData.value.efficiencyElements
		);
		if (!type) return undefined;
		return type === "FERTILITY" || type === "WORKFORCE"
			? `plan.components.production_building.zero_reason.${type}`
			: `game.efficiency_type.${type}`;
	});

	const isPlanetCogc = computed(() => {
		return localBuildingData.value.efficiencyElements.some(
			(element) => element.efficiencyType === "COGC"
		);
	});

	// area and revenue are for all buildings of this row, so is construction;
	// the engine's constructionCost stays per building (COGM, finance)
	const constructionCostTotal: ComputedRef<number> = computed(
		() =>
			localBuildingData.value.constructionCost *
			localBuildingData.value.amount
	);
</script>

<template>
	<div
		class="grid grid-cols-12 px-3 py-1.5 items-center bg-white/10 border-b border-t border-white/5 border-l-2"
		:class="
			localBuildingData.amount > 0
				? 'border-l-prunplanner'
				: 'border-l-negative'
		">
		<div class="col-span-6 xl:col-span-2 text-lg font-mono">
			{{ localBuildingData.amount }}x
			<strong>{{ localBuildingData.name }}</strong>
			<span
				v-for="kind in change?.kinds"
				:key="kind"
				class="ml-2 align-middle text-xs font-sans font-bold uppercase"
				:class="kind === 'added' ? 'text-positive' : 'text-warning'">
				{{ $t(`sharing.compare.${kind}`) }}
			</span>
		</div>
		<div
			class="col-span-6 justify-end xl:justify-normal xl:col-span-4 flex items-center gap-x-1">
			<span class="text-xs text-muted pr-1">
				{{ $t("plan.components.production_building.qty") }}
			</span>
			<PInputNumber
				:aria-label="
					$t('plan.components.production_building.qty_label', {
						building: localBuildingData.name,
					})
				"
				:value="localBuildingData.amount"
				size="sm"
				:disabled="disabled"
				:show-buttons="!disabled"
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
				v-if="!disabled && localBuildingData.recipeOptions.length > 0"
				size="sm"
				@click="emit('add:building:recipe', buildingIndex)">
				<template #icon><PlusSharp /></template>
				{{
					$t("plan.components.production_building.buttons.add_recipe")
				}}
			</PButton>
		</div>
		<!-- each stat has a fixed width (min-w-max lets a long value grow), so the
			stats line up in columns from one building to the next -->
		<div
			class="col-span-12 xl:col-span-6 flex flex-wrap justify-end items-center gap-x-6 gap-y-2 text-white/80">
			<div class="flex flex-col items-end sm:w-[7.5rem] min-w-max text-right">
				<span class="text-xs text-muted uppercase tracking-wider">
					{{
						$t(
							"plan.components.production_building.table.expertise"
						)
					}}
				</span>
				<span class="text-xs">
					<span
						:class="
							isPlanetCogc ? 'text-positive' : 'text-negative'
						">
						{{ isPlanetCogc ? "✓" : "✗" }}
						{{
							$t(`game.expertise.${localBuildingData.expertise}`)
						}}</span
					>
				</span>
			</div>
			<div class="flex flex-col items-end sm:w-[5.5rem] min-w-max text-right">
				<span class="text-xs text-muted uppercase tracking-wide">
					{{
						$t(
							"plan.components.production_building.table.efficiency"
						)
					}}
				</span>
				<span class="text-xs font-bold whitespace-nowrap">
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
							<div>
								{{
									$t(
										`game.efficiency_type.${element.efficiencyType}`
									)
								}}
							</div>
							<div>{{ formatNumber(element.value * 100) }} %</div>
						</div>
					</PTooltip>
				</span>
				<span v-if="zeroReason" class="text-xs text-negative">
					{{ $t(zeroReason) }}
				</span>
			</div>
			<div class="flex flex-col items-end sm:w-[6rem] min-w-max text-right">
				<span class="text-xs text-muted uppercase tracking-wide">
					{{
						$t("plan.components.production_building.table.revenue")
					}}
				</span>
				<span class="text-xs font-bold whitespace-nowrap">
					<PValue :value="localBuildingData.dailyRevenue" />
					<span class="pl-1 font-light text-muted">ȼ</span>
				</span>
			</div>
			<div class="flex flex-col items-end sm:w-[2.5rem] min-w-max text-right">
				<span class="text-xs text-muted uppercase tracking-wide">
					{{ $t("plan.components.production_building.table.area") }}
				</span>
				<span class="text-xs font-bold whitespace-nowrap">
					{{ localBuildingData.areaUsed }}
				</span>
			</div>
			<div class="flex flex-col items-end sm:w-[7rem] min-w-max text-right">
				<span class="text-xs text-muted uppercase tracking-wide">
					{{
						$t(
							"plan.components.production_building.table.construction"
						)
					}}
				</span>
				<span class="text-xs font-bold whitespace-nowrap">
					<PTooltip :disabled="localBuildingData.amount <= 1">
						<template #trigger>
							<span
								:class="{
									'hover:cursor-help':
										localBuildingData.amount > 1,
								}">
								{{ formatNumber(constructionCostTotal * -1) }}
								<span class="font-light text-muted">ȼ</span>
							</span>
						</template>
						<div
							class="flex flex-row justify-between align-center gap-x-3 child:p-1">
							<div>
								{{
									$t(
										"plan.components.production_building.table.construction_per_building"
									)
								}}
							</div>
							<div>
								{{
									formatNumber(
										localBuildingData.constructionCost * -1
									)
								}}
								ȼ
							</div>
						</div>
					</PTooltip>
				</span>
			</div>
			<div class="flex justify-end">
				<PButton
					v-if="!disabled"
					:aria-label="$t('common.buttons.delete')"
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
					:is-new="!!change?.newRecipes.includes(recipe.recipeId)"
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
		<div
			v-else
			class="h-full w-full flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 py-2 text-white/60 text-xs">
			<span>
				{{ $t("plan.components.production_building.no_recipe") }}
			</span>
			<template v-if="typicalMix">
				<span>
					{{ $t("plan.components.production_building.mix_hint") }}
				</span>
				<PButton
					size="sm"
					:aria-label="
						$t('plan.components.production_building.mix_add_label', {
							building: localBuildingData.name,
						})
					"
					@click="
						emit(
							'add:building:recipes',
							buildingIndex,
							typicalMix.recipes
						)
					">
					<span class="flex items-center gap-1.5">
						<MaterialTile
							v-for="ticker in typicalMixOutputs"
							:key="`${localBuildingData.name}#MIX#${ticker}`"
							:ticker="ticker"
							disable-drawer
							:enable-popover="false" />
						<span class="text-prunplanner">
							{{ formatPercent(typicalMix.percentage, 0) }}
						</span>
						{{ $t("plan.components.production_building.mix_add") }}
					</span>
				</PButton>
			</template>
		</div>
	</div>
</template>
