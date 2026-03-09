import { ref, Ref } from "vue";

// Composables
import { useBuildingData } from "@/database/services/useBuildingData";

// Types & Interfaces
import {
	IPlan,
	IPlanData,
	IPlanDataExpert,
	IPlanDataInfrastructure,
	IPlanDataWorkforce,
	PLAN_COGCPROGRAM_TYPE,
} from "@/stores/planningStore.types";
import {
	EXPERT_TYPE,
	INFRASTRUCTURE_TYPE,
	IPlanResult,
	WORKFORCE_TYPE,
} from "@/features/planning/usePlanCalculation.types";
import { IBuilding } from "@/features/api/gameData.types";

// Util
import { clamp } from "@/util/numbers";

/**
 * Plan Calculation data Handlers, allowing data manipulation
 * from UI towards data and their validation
 *
 * @author jplacht
 *
 * @export
 * @param {Ref<IPlanDataPlanet>} planet Planet Data
 * @param {Ref<IPlanData>} planData Plan Data
 * @param {Ref<string | undefined>} planName Plan Name
 * @param {Ref<IPlanResult>} planResult Plan Calculation Result
 */
export async function usePlanCalculationHandlers(
	plan: Ref<IPlan>,
	planData: Ref<IPlanData>,
	planName: Ref<string | undefined>,
	planResult: Ref<IPlanResult>
) {
	// internal state
	const modified: Ref<boolean> = ref(false);

	// Composables
	const { getBuilding } = await useBuildingData();

	function handleResetModified(): void {
		modified.value = false;
	}

	/**
	 * Updates the CORP HQ Setting
	 * @author jplacht
	 *
	 * @param {boolean} value Has CorpHQ on Planet
	 */
	function handleUpdateCorpHQ(value: boolean): void {
		plan.value.plan_corphq = value;
		modified.value = true;
	}

	/**
	 * Changes to currently active COGC
	 * @author jplacht
	 *
	 * @param {PLAN_COGCPROGRAM_TYPE} value COGC Program
	 */
	function handleUpdateCOGC(value: PLAN_COGCPROGRAM_TYPE): void {
		plan.value.plan_cogc = value;
		modified.value = true;
	}

	/**
	 * Sets the plans permits, clamps it between 1 and 3
	 * @author jplacht
	 *
	 * @param {number} value Number of permits
	 */
	function handleUpdatePermits(value: number): void {
		plan.value.plan_permits_used = clamp(value, 1, 3);
		modified.value = true;
	}

	/**
	 * Updates luxury setup for given workforce and luxury type
	 * @author jplacht
	 *
	 * @param {WORKFORCE_TYPE} workforce Workforce, e.g. "pioneer"
	 * @param {("lux1" | "lux2")} luxType Luxury 1 or 2
	 * @param {boolean} value If this luxury is available to workforce
	 */
	function handleUpdateWorkforceLux(
		workforce: WORKFORCE_TYPE,
		luxType: "lux1" | "lux2",
		value: boolean
	): void {
		const workforceData: IPlanDataWorkforce | undefined =
			planData.value.workforce.find((e) => e.type == workforce);

		if (workforceData) {
			if (luxType === "lux1") {
				workforceData.lux1 = value;
			} else {
				workforceData.lux2 = value;
			}
		}
		modified.value = true;
	}

	/**
	 * Updates the amount of assigned experts, clamps it between 0 and 5
	 * @author jplacht
	 *
	 * @param {EXPERT_TYPE} expert Expert Type
	 * @param {number} value Experts set for type in plan
	 */
	function handleUpdateExpert(expert: EXPERT_TYPE, value: number): void {
		const expertData: IPlanDataExpert | undefined =
			planData.value.experts.find((e) => e.type === expert);

		if (expertData) {
			expertData.amount = clamp(value, 0, 5);
		}
		modified.value = true;
	}

	/**
	 * Updates the amount of a specific infrastructure building in the plan
	 * @author jplacht
	 *
	 * @param {INFRASTRUCTURE_TYPE} infrastructure Infrastructure Building e.g. "STO"
	 * @param {number} value Building amount
	 */
	function handleUpdateInfrastructure(
		infrastructure: INFRASTRUCTURE_TYPE,
		value: number
	): void {
		const infData: IPlanDataInfrastructure | undefined =
			planData.value.infrastructure.find(
				(i) => i.building === infrastructure
			);

		if (infData) {
			infData.amount = value;
		} else {
			planData.value.infrastructure.push({
				building: infrastructure,
				amount: value,
			});
		}
		modified.value = true;
	}

	/**
	 * Updates the buildings amount at specified list index
	 * @author jplacht
	 *
	 * @param {number} index Building array index
	 * @param {number} value New amount
	 */
	function handleUpdateBuildingAmount(index: number, value: number): void {
		// validate index
		if (typeof planData.value.buildings[index] === "undefined") {
			throw new Error(`Building at index '${index}' does not exist.`);
		}

		planData.value.buildings[index].amount = value;
		modified.value = true;
	}

	/**
	 * Deletes the building at specified list index
	 * @author jplacht
	 *
	 * @param {number} index Building array index
	 */
	function handleDeleteBuilding(index: number): void {
		// validate index
		if (typeof planData.value.buildings[index] === "undefined") {
			throw new Error(`Building at index '${index}' does not exist.`);
		}

		if (index === 0) {
			planData.value.buildings.shift();
		} else {
			planData.value.buildings.splice(index, 1);
		}

		modified.value = true;
	}

	/**
	 * Adds a new building to the building array from the
	 * plans available buildings
	 *
	 * @author jplacht
	 *
	 * @param {string} ticker Building Ticker to add
	 */
	async function handleCreateBuilding(ticker: string): Promise<boolean> {
		// validate building
		const building: IBuilding = await getBuilding(ticker);

		// check if building already exists
		const hasTicker: boolean = !!planData.value.buildings.find(
			(e) => e.name === ticker
		);

		// only add, if this ticker is not yet present
		if (!hasTicker) {
			planData.value.buildings.push({
				name: building.building_ticker,
				amount: 1,
				active_recipes: [],
			});

			modified.value = true;
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Creates or uses a building and adds a recipe if not yet present
	 * @author jplacht
	 *
	 * @async
	 * @param {string} ticker Building Ticker
	 * @param {string} recipeId Recipe Id
	 * @returns {Promise<void>} void
	 */
	async function handleCreateBuildingAndRecipe(
		ticker: string,
		recipeId: string
	): Promise<void> {
		// try creating the building first
		await handleCreateBuilding(ticker);

		const building = planData.value.buildings.find(
			(e) => e.name === ticker
		);

		if (building) {
			// check if the building is available and does not yet have the recipe

			// check, that the building does not hold the recipe
			const hasRecipe = building.active_recipes.find(
				(r) => r.recipeid === recipeId
			);

			if (!hasRecipe) {
				// add first option to the data
				building.active_recipes.push({
					recipeid: recipeId,
					amount: 1,
				});

				modified.value = true;
			}
		}
	}

	/**
	 * Changes the recipes amount for given building by building array
	 * index and its active recipes at the arrays index
	 * @author jplacht
	 *
	 * @param {number} buildingIndex Building Array Index
	 * @param {number} recipeIndex Building Active Recipes Array Index
	 * @param {number} value Amount to set
	 */
	function handleUpdateBuildingRecipeAmount(
		buildingIndex: number,
		recipeIndex: number,
		value: number
	): void {
		// validate building index
		if (typeof planData.value.buildings[buildingIndex] === "undefined") {
			throw new Error(
				`Building at index '${buildingIndex}' does not exist.`
			);
		}

		// validate recipe index
		if (
			typeof planData.value.buildings[buildingIndex].active_recipes[
				recipeIndex
			] === "undefined"
		) {
			throw new Error(
				`Building at index '${buildingIndex}' has no recipe at index '${recipeIndex}.`
			);
		}

		planData.value.buildings[buildingIndex].active_recipes[
			recipeIndex
		].amount = value;

		modified.value = true;
	}

	/**
	 * Deletes specified recipe by its index from a buildings (defined by
	 * the buildings index) from the list of active recipes
	 * @author jplacht
	 *
	 * @param {number} buildingIndex Building Array Index
	 * @param {number} recipeIndex Building Active Recipes Array Index
	 */
	function handleDeleteBuildingRecipe(
		buildingIndex: number,
		recipeIndex: number
	): void {
		// validate building index
		if (typeof planData.value.buildings[buildingIndex] === "undefined") {
			throw new Error(
				`Building at index '${buildingIndex}' does not exist.`
			);
		}

		// validate recipe index
		if (
			typeof planData.value.buildings[buildingIndex].active_recipes[
				recipeIndex
			] === "undefined"
		) {
			throw new Error(
				`Building at index '${buildingIndex}' has no recipe at index '${recipeIndex}.`
			);
		}

		if (recipeIndex === 0) {
			planData.value.buildings[buildingIndex].active_recipes.shift();
		} else {
			planData.value.buildings[buildingIndex].active_recipes.splice(
				recipeIndex,
				1
			);
		}

		modified.value = true;
	}

	/**
	 * Adds a new recipe to the building at specified index
	 *
	 * @remark Will throw an error if the building has no recipe
	 * options it can set, eg. an EXT building with no recipes because
	 * the planet doesn't hold resources that can be gathered with an EXT
	 *
	 * @author jplacht
	 *
	 * @param {number} buildingIndex Building Array Index
	 */
	function handleAddBuildingRecipe(buildingIndex: number): void {
		// validate building index
		if (typeof planData.value.buildings[buildingIndex] === "undefined") {
			throw new Error(
				`Building at index '${buildingIndex}' does not exist.`
			);
		}

		// ensure the building is also in the result + got recipe options
		if (
			typeof planResult.value.production.buildings[buildingIndex] ===
				"undefined" ||
			planResult.value.production.buildings[buildingIndex].recipeOptions
				.length === 0
		) {
			throw new Error(
				`Building at index '${buildingIndex} does not exist or has no recipe options.`
			);
		}

		// add first option to the data
		planData.value.buildings[buildingIndex].active_recipes.push({
			recipeid:
				planResult.value.production.buildings[buildingIndex]
					.recipeOptions[0].recipe_id,
			amount: 1,
		});

		modified.value = true;
	}

	/**
	 * Changes the Building Recipe for a building defined by its array index
	 * and its active recipes defined by index to a new recipe id
	 * @author jplacht
	 *
	 * @param {number} buildingIndex Building Array Index
	 * @param {number} recipeIndex Building Active Recipe Array Index
	 * @param {string} recipeId Recipe ID to be set
	 */
	function handleChangeBuildingRecipe(
		buildingIndex: number,
		recipeIndex: number,
		recipeId: string
	): void {
		// validate building index
		if (typeof planData.value.buildings[buildingIndex] === "undefined") {
			throw new Error(
				`Building at index '${buildingIndex}' does not exist.`
			);
		}

		// validate recipe index
		if (
			typeof planData.value.buildings[buildingIndex].active_recipes[
				recipeIndex
			] === "undefined"
		) {
			throw new Error(
				`Building at index '${buildingIndex}' has no recipe at index '${recipeIndex}.`
			);
		}

		// change recipeId at this point
		planData.value.buildings[buildingIndex].active_recipes[
			recipeIndex
		].recipeid = recipeId;

		modified.value = true;
	}

	/**
	 * Changes the plans name to the specified value
	 *
	 * @remark Name will be automatically trimmed at start and end,
	 * empty strings ("") are not allowed
	 *
	 * @author jplacht
	 *
	 * @param {string} value New Plan Name
	 */
	function handleChangePlanName(value: string): void {
		const transfValue: string = value.trimStart().trimEnd();
		planName.value = transfValue;
		modified.value = true;
	}

	return {
		modified,
		// handlers
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
		handleCreateBuildingAndRecipe,
		handleUpdateBuildingRecipeAmount,
		handleDeleteBuildingRecipe,
		handleAddBuildingRecipe,
		handleChangeBuildingRecipe,
		handleChangePlanName,
	};
}
