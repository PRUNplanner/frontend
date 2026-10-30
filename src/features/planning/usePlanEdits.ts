import {
	computed,
	type ComputedRef,
	onUnmounted,
	ref,
	type Ref,
	watch,
} from "vue";
import { useI18n } from "vue-i18n";

// Composables
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Util
import {
	optimizeHabs,
	calculateAvailableArea,
	type HabSolverGoal,
} from "@/features/planning/calculations/habOptimization";

// Types & Interfaces
import type { InfrastructureType } from "@/features/api/schemas/planningData.schemas";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import type { IStarterSetup } from "@/features/plan_analytics/usePlanetInsights.types";
import type { IPlanCalculation } from "@/features/planning/planView.types";

// UI
import { useToast } from "@/ui";
import type { PToastHandle } from "@/ui/ui.types";

/**
 * Plan edits with feedback: removing or changing a recipe with an undo
 * toast, picked recipes with a status line, the starter setup and the
 * habitation optimizer
 * @author jplacht
 *
 * @param {IPlanCalculation} calculation The plan's calculation
 * @param {Ref<IPlanDefinition>} refPlanData Edited plan
 * @param {Ref<boolean>} refAutoOptimizeHabs Optimize habs on workforce changes
 * @param {(trigger: "button") => void} trackedUndo Undo, tracked
 * @param {string} planetNaturalId Plan's planet
 */
export function usePlanEdits(
	calculation: IPlanCalculation,
	refPlanData: Ref<IPlanDefinition>,
	refAutoOptimizeHabs: Ref<boolean>,
	trackedUndo: (trigger: "button") => void,
	planetNaturalId: string
) {
	const { t } = useI18n();
	const toast = useToast();
	const {
		result,
		revision,
		record,
		isRestoring,
		handleDeleteBuilding,
		handleDeleteBuildingRecipe,
		handleChangeBuildingRecipe,
		handleAddBuildingRecipes,
		handleApplyStarterSetup,
		handleUpdateInfrastructure,
	} = calculation;

	// Deleting or changing a recipe shows a toast to take it back. Any later
	// change to the history (edit, undo, redo, save) closes it, so its Undo
	// only ever undoes the edit it announced.
	let undoToast: PToastHandle | undefined;

	// a picked recipe: a status line under its row, with Undo
	const refRecipeStatus: Ref<
		{ building: number; recipe: number; text: string } | undefined
	> = ref(undefined);

	watch(
		revision,
		() => {
			undoToast?.destroy();
			undoToast = undefined;
			refRecipeStatus.value = undefined;
		},
		// before the next toast opens in the same call
		{ flush: "sync" }
	);

	// toasts belong to the app, don't let one outlive its plan
	onUnmounted(() => undoToast?.destroy());

	function toastUndo(text: string): void {
		undoToast?.destroy();
		undoToast = toast(text, {
			action: {
				label: t("plan.history.undo"),
				onClick: () => trackedUndo("button"),
			},
		});
	}

	function deleteBuilding(index: number): void {
		handleDeleteBuilding(index);
		toastUndo(t("plan.history.building_removed"));
	}

	function deleteBuildingRecipe(
		buildingIndex: number,
		recipeIndex: number
	): void {
		handleDeleteBuildingRecipe(buildingIndex, recipeIndex);
		toastUndo(t("plan.history.recipe_removed"));
	}

	// "12 ALG": a recipe by its first output, per run
	function recipeLabel(buildingIndex: number, recipeId: string): string {
		const output = result.value.production.buildings[
			buildingIndex
		]?.recipeOptions.find((r) => r.recipe_id === recipeId)?.outputs[0];
		return output
			? `${output.material_amount} ${output.material_ticker}`
			: recipeId;
	}

	function changeBuildingRecipe(
		buildingIndex: number,
		recipeIndex: number,
		recipeId: string
	): void {
		const building = refPlanData.value.plan_data.buildings[buildingIndex];
		// picking the recipe it already has changes nothing, and Undo would
		// take back the edit before it
		const before: string | undefined =
			building?.active_recipes[recipeIndex]?.recipeid;
		if (before === recipeId) return;

		handleChangeBuildingRecipe(buildingIndex, recipeIndex, recipeId);
		refRecipeStatus.value = {
			building: buildingIndex,
			recipe: recipeIndex,
			text: t("plan.picker.replaced", {
				before: before ? recipeLabel(buildingIndex, before) : "",
				after: recipeLabel(buildingIndex, recipeId),
			}),
		};
	}

	function addPickedRecipe(buildingIndex: number, recipeId: string): void {
		handleAddBuildingRecipes(buildingIndex, [
			{ recipeid: recipeId, amount: 1 },
		]);
		refRecipeStatus.value = {
			building: buildingIndex,
			recipe:
				refPlanData.value.plan_data.buildings[buildingIndex]
					.active_recipes.length - 1,
			text: t("plan.picker.added", {
				recipe: recipeLabel(buildingIndex, recipeId),
			}),
		};
	}

	function undoPickedRecipe(): void {
		trackEvent("plan:recipe_picker_undo");
		trackedUndo("button");
	}

	// One undo step: the setup and the habs for its workforce. Auto-optimise
	// is a preference, not plan data, so undo leaves it on.
	const addStarterSetup = record(async (setup: IStarterSetup) => {
		refAutoOptimizeHabs.value = true;
		await handleApplyStarterSetup(setup);
		applyOptimizeHabs("auto", false);
	});

	async function applyStarterSetup(
		setup: IStarterSetup,
		isSelectionChanged: boolean
	): Promise<void> {
		await addStarterSetup(setup);
		toastUndo(
			t(
				"plan.tools.plan_starter.applied",
				{ n: setup.buildings.length },
				setup.buildings.length
			)
		);
		trackEvent("plan:starter_apply", {
			planet_natural_id: planetNaturalId,
			building_count: setup.buildings.length,
			expert_count: setup.experts.reduce((sum, e) => sum + e.amount, 0),
			is_selection_changed: isSelectionChanged,
		});
	}

	// Auto Optimize Habitation on Workforce Change
	const availableHabArea: ComputedRef<number> = computed(() => {
		return calculateAvailableArea(
			result.value.area.areaTotal,
			result.value.area.areaUsed,
			result.value.infrastructure
		);
	});

	function applyOptimizeHabs(goal: HabSolverGoal, force: boolean) {
		// skip, if autooptimization is deactivated and not forced,
		// forcing only happens from the button clicks in configuration

		if (!refAutoOptimizeHabs.value && !force) return;

		trackEvent("plan:hab_optimize", { goal });

		const solution = optimizeHabs(
			goal,
			result.value.infrastructureCosts,
			result.value.workforce,
			availableHabArea.value
		);

		if (solution.status === "optimal") {
			for (const [hab, count] of solution.variables) {
				const habType = hab as InfrastructureType;
				// Don't update the plan if nothing changed
				if (result.value.infrastructure[habType] === count) continue;
				handleUpdateInfrastructure(habType, count);
			}
		} else {
			if (import.meta.env.DEV)
				console.warn(`Unable to optimize habs: ${solution.status}`);
			// the automatic run stays quiet, a click gets an answer
			if (force)
				toast(t("plan.components.infrastructure.optimize_failed"), {
					type: "error",
				});
		}
	}

	watch(
		[
			() => result.value.workforce.pioneer.required,
			() => result.value.workforce.settler.required,
			() => result.value.workforce.technician.required,
			() => result.value.workforce.engineer.required,
			() => result.value.workforce.scientist.required,
			() => result.value.infrastructureCosts,
		],
		() => {
			// undo/redo restore a snapshot as it was
			if (isRestoring()) return;
			applyOptimizeHabs("auto", false);
		}
	);

	return {
		refRecipeStatus,
		deleteBuilding,
		deleteBuildingRecipe,
		changeBuildingRecipe,
		addPickedRecipe,
		undoPickedRecipe,
		applyStarterSetup,
		applyOptimizeHabs,
	};
}
