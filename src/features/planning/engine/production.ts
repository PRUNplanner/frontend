// Prices
import {
	enhanceMaterialIOMaterial,
	getMaterialIOTotalPrice,
} from "@/features/cx/priceBook";

// Engine
import {
	getBuilding,
	getBuildingConstructionMaterials,
	getBuildingRecipes,
} from "@/features/planning/engine/buildings";
import { getBuildingWorkforceMaterials } from "@/features/planning/engine/workforce";
import { calculateBuildingEfficiency } from "@/features/planning/engine/efficiency";
import { calculateRecipeOptions } from "@/features/planning/engine/recipeOptions";
import { calculateCOGM } from "@/features/planning/engine/cogm";
import {
	calculateMaterialIO,
	enhanceMaterialIOMinimal,
} from "@/features/planning/engine/materialIO";

// Types & Interfaces
import { IBuilding, IRecipe } from "@/features/api/gameData.types";
import {
	IExpertRecord,
	IMaterialIOMinimal,
	IProductionBuilding,
	IProductionBuildingRecipe,
	IProductionResult,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";
import { IPlanContext, IPlanInput } from "@/features/planning/engine/engine.types";

interface IBuildingInformation {
	buildingData: IBuilding;
	buildingRecipes: IRecipe[];
	constructionMaterials: IMaterialIOMinimal[];
	// value of the construction materials, negative
	constructionCost: number;
	workforceMaterials: IMaterialIOMinimal[];
}

/**
 * Calculates plan production taking into account efficiency factors
 * for certain production lines, buildings, experts and workforce
 * based on the plans active recipes
 *
 * @remark Costs: `constructionCost` and `workforceDailyCost` keep their
 * sign as material values (negative) in the result. Where a cost is
 * needed, it is negated once (exact), so no number changes.
 *
 * @author jplacht
 *
 * @param {IPlanInput} input Plan input
 * @param {IPlanContext} ctx Plan context
 * @param {IWorkforceRecord} workforce Workforce result
 * @param {IExpertRecord} experts Plans experts
 * @returns {IProductionResult} Production Result
 */
export function calculateProduction(
	input: IPlanInput,
	ctx: IPlanContext,
	workforce: IWorkforceRecord,
	experts: IExpertRecord
): IProductionResult {
	const { plan, empire } = input;
	const { planet, prices } = ctx;
	const withRecipeOptions: boolean = input.recipeOptions ?? true;

	// building information, once per building ticker
	const information = new Map<string, IBuildingInformation>();
	for (const { name } of plan.plan_data.buildings) {
		if (information.has(name)) continue;

		const buildingData: IBuilding = getBuilding(ctx.buildings, name);
		const constructionMaterials: IMaterialIOMinimal[] =
			getBuildingConstructionMaterials(buildingData, planet);

		information.set(name, {
			buildingData,
			buildingRecipes: getBuildingRecipes(
				ctx.recipesByBuilding,
				name,
				planet.resources
			),
			constructionMaterials,
			constructionCost: getMaterialIOTotalPrice(
				prices,
				constructionMaterials,
				"BUY"
			),
			workforceMaterials: getBuildingWorkforceMaterials(
				buildingData,
				true,
				true
			),
		});
	}

	const buildings: IProductionBuilding[] = [];

	// add buildings from data
	for (const b of plan.plan_data.buildings) {
		const {
			buildingData,
			buildingRecipes,
			constructionMaterials,
			constructionCost,
			workforceMaterials,
		} = information.get(b.name)!;

		// efficiency calculation
		const { totalEfficiency, elements } = calculateBuildingEfficiency(
			buildingData,
			planet,
			plan.plan_corphq,
			plan.plan_cogc,
			workforce,
			experts,
			empire
		);

		const activeRecipes: IProductionBuildingRecipe[] = [];

		// add currently active recipes
		b.active_recipes.forEach((r) => {
			const recipeInfo: IRecipe | undefined = buildingRecipes.find(
				(ar) => ar.recipe_id == r.recipeid
			);

			if (!recipeInfo) {
				console.warn(
					`Unable to find recipe info for ${b.name} with recipe id ${r.recipeid}`
				);
			} else {
				activeRecipes.push({
					recipeId: r.recipeid,
					amount: r.amount,
					dailyShare: 1,
					// time adjusted to efficiency and amount
					time: (recipeInfo.time_ms * r.amount) / totalEfficiency,
					recipe: {
						...recipeInfo,
						dailyRevenue: 0,
						roi: 0,
						profitPerArea: 0,
					},
					cogm: undefined,
				});
			}
		});

		// calculate total batchtime and
		const totalBatchTime: number = activeRecipes.reduce(
			(sum, ar) => sum + ar.time,
			0
		);

		// update active recipes timeshare
		activeRecipes.forEach(
			(updateDailyShare) =>
				(updateDailyShare.dailyShare =
					updateDailyShare.time / totalBatchTime)
		);

		const workforceDailyCost: number = getMaterialIOTotalPrice(
			prices,
			workforceMaterials,
			"BUY"
		);

		// positive costs, exact negations of the material values
		const constructionCostPositive: number = constructionCost * -1;
		const workforceCostPositive: number = workforceDailyCost * -1;

		for (const ar of activeRecipes)
			ar.cogm = calculateCOGM(
				ar,
				totalEfficiency,
				constructionCostPositive,
				workforceCostPositive,
				input.cxUuid !== undefined,
				prices
			);

		const building: IProductionBuilding = {
			name: b.name,
			amount: b.amount,
			areaUsed: buildingData.area_cost * b.amount,
			activeRecipes: activeRecipes,
			// unless the caller never reads them
			recipeOptions: withRecipeOptions
				? calculateRecipeOptions(
						buildingData,
						buildingRecipes,
						totalEfficiency,
						constructionCostPositive,
						workforceCostPositive,
						prices
					)
				: [],
			totalEfficiency: totalEfficiency,
			efficiencyElements: elements,
			totalBatchTime: totalBatchTime,
			constructionMaterials: constructionMaterials,
			constructionCost: constructionCost,
			workforceMaterials: workforceMaterials,
			workforceDailyCost: workforceDailyCost,
			dailyRevenue: 0,
			expertise: buildingData.expertise,
		};

		// Calculating individual buildings daily contribution
		const productionRevenue: number = enhanceMaterialIOMaterial(
			prices,
			enhanceMaterialIOMinimal(
				ctx.materials,
				calculateMaterialIO([building])
			)
		).reduce((sum, element) => sum + element.price, 0);

		// WorkforceDailyCost is just per Building, so need to multiply
		building.dailyRevenue =
			productionRevenue -
			workforceCostPositive * building.amount -
			(1 / 180) * constructionCostPositive;

		buildings.push(building);
	}

	return {
		buildings: buildings,
		materialio: calculateMaterialIO(buildings),
	};
}
