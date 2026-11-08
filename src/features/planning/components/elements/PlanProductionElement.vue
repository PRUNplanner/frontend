<script setup lang="ts">
	// Composables
	import { usePlanView } from "@/features/planning/usePlanView";

	// Components
	import PlanProduction from "@/features/planning/components/PlanProduction.vue";

	/**
	 * The plan's buildings and recipes with their toolbar
	 *
	 * @author jplacht
	 */
	const { calculation, planet, readOnly, empire, sharedCopy, edits } =
		usePlanView();
	const {
		result,
		handleUpdateBuildingAmount,
		handleCreateBuilding,
		handleUpdateBuildingRecipeAmount,
		handleAddBuildingRecipes,
	} = calculation;
</script>

<template>
	<div class="px-3" data-production>
		<PlanProduction
			:disabled="readOnly"
			:production-data="result.production"
			:planet-resources="planet.resources"
			:cogc="result.cogc"
			:cx-uuid="empire.cxUuid.value"
			:planet-id="planet.planet_natural_id"
			:changes="sharedCopy.sharedChanges.value"
			:material-i-o="result.materialio"
			:experts="result.experts"
			:status="edits.refRecipeStatus.value"
			@update:building:amount="handleUpdateBuildingAmount"
			@delete:building="edits.deleteBuilding"
			@create:building="handleCreateBuilding"
			@update:building:recipe:amount="handleUpdateBuildingRecipeAmount"
			@delete:building:recipe="edits.deleteBuildingRecipe"
			@add:building:recipes="handleAddBuildingRecipes"
			@apply:starter="edits.applyStarterSetup"
			@update:building:recipe="edits.changeBuildingRecipe"
			@pick:building:recipe="edits.addPickedRecipe"
			@undo="edits.undoPickedRecipe" />
	</div>
</template>
