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
import {
	calculateBuildingEfficiency,
	zeroEfficiencyReason,
} from "@/features/planning/engine/efficiency";
import { calculateRecipeOptions } from "@/features/planning/engine/recipeOptions";
import { calculateCOGM } from "@/features/planning/engine/cogm";
import {
	calculateMaterialIO,
	enhanceMaterialIOMinimal,
} from "@/features/planning/engine/materialIO";

// Types & Interfaces
import type { IPriceBook } from "@/features/cx/priceBook";
import type { Building, Recipe } from "@/features/api/schemas/gameData.schemas";
import type {
	IExpertRecord,
	IMaterialIOMinimal,
	IProductionBuilding,
	IProductionBuildingRecipe,
	IProductionResult,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";
import type {
	IPlanContext,
	IPlanInput,
	IPlanTracer,
} from "@/features/planning/engine/engine.types";
import type { IBuildingEfficiency } from "@/features/planning/calculations/bonusCalculations.types";

interface IBuildingInformation {
	buildingData: Building;
	buildingRecipes: Recipe[];
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
 * @param {IPriceBook} [optionPrices] Price book for recipe options, the
 * untraced one when tracing (options are not traced)
 * @returns {IProductionResult} Production Result
 */
export function calculateProduction(
	input: IPlanInput,
	ctx: IPlanContext,
	workforce: IWorkforceRecord,
	experts: IExpertRecord,
	optionPrices: IPriceBook = ctx.prices
): IProductionResult {
	const { plan, empire } = input;
	const { planet, prices, trace } = ctx;
	const withRecipeOptions: boolean = input.recipeOptions ?? true;

	// building information, built once per building ticker; it lives for
	// this call only, so the plan workforce is fixed
	const information = new Map<string, IBuildingInformation>();
	const informationFor = (name: string): IBuildingInformation => {
		const known = information.get(name);
		if (known) return known;

		const buildingData: Building = getBuilding(ctx.buildings, name);
		const constructionMaterials: IMaterialIOMinimal[] =
			getBuildingConstructionMaterials(buildingData, planet);

		const built: IBuildingInformation = {
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
				workforce
			),
		};
		information.set(name, built);
		return built;
	};

	const buildings: IProductionBuilding[] = [];

	// one building row, a trace group per row when tracing
	const row = (b: (typeof plan.plan_data.buildings)[number]): void => {
		const {
			buildingData,
			buildingRecipes,
			constructionMaterials,
			constructionCost,
			workforceMaterials,
		} = informationFor(b.name);

		if (trace) traceBuildingData(trace, buildingData, b.amount);

		// efficiency calculation
		const { totalEfficiency, elements } = calculateBuildingEfficiency(
			buildingData,
			planet,
			plan.plan_corphq,
			plan.plan_cogc,
			workforce,
			experts,
			empire,
			trace
		);

		const activeRecipes: IProductionBuildingRecipe[] = [];

		// add currently active recipes
		b.active_recipes.forEach((r) => {
			const recipeInfo: Recipe | undefined = buildingRecipes.find(
				(ar) => ar.recipe_id == r.recipeid
			);

			if (!recipeInfo) {
				if (import.meta.env.DEV)
					console.warn(
						`Unable to find recipe info for ${b.name} with recipe id ${r.recipeid}`
					);
			} else {
				activeRecipes.push({
					recipeId: r.recipeid,
					amount: r.amount,
					dailyShare: 1,
					// time adjusted to efficiency and amount, an amount of 0
					// takes no time even at 0% efficiency (0 / 0 is NaN)
					time:
						r.amount === 0
							? 0
							: (recipeInfo.time_ms * r.amount) / totalEfficiency,
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

		// update active recipes timeshare, none when nothing runs (all
		// amounts 0) or nothing finishes (0% efficiency, infinite time)
		const runs: boolean =
			Number.isFinite(totalBatchTime) && totalBatchTime > 0;
		activeRecipes.forEach(
			(updateDailyShare) =>
				(updateDailyShare.dailyShare = runs
					? updateDailyShare.time / totalBatchTime
					: 0)
		);

		if (trace)
			traceRecipes(
				trace,
				b.name,
				elements,
				totalEfficiency,
				activeRecipes,
				totalBatchTime
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
				prices,
				trace
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
						optionPrices
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
				calculateMaterialIO([building], trace)
			)
		).reduce((sum, element) => sum + element.price, 0);

		// workforce and construction costs are per building, so multiply
		building.dailyRevenue =
			productionRevenue -
			workforceCostPositive * building.amount -
			(1 / 180) * constructionCostPositive * building.amount;

		if (trace)
			traceBuilding(
				trace,
				building,
				productionRevenue,
				workforceCostPositive,
				constructionCostPositive
			);

		buildings.push(building);
	};

	// add buildings from data
	for (const b of plan.plan_data.buildings) {
		if (trace)
			trace.group(
				"production",
				`${b.name} × ${b.amount}`,
				{ building: b.name },
				() => row(b)
			);
		else row(b);
	}

	return {
		buildings: buildings,
		materialio: calculateMaterialIO(buildings),
	};
}

/** a building's recipe times and daily shares, for the trace */
function traceRecipes(
	trace: IPlanTracer,
	name: string,
	elements: IBuildingEfficiency[],
	totalEfficiency: number,
	activeRecipes: IProductionBuildingRecipe[],
	totalBatchTime: number
): void {
	if (totalEfficiency === 0)
		trace.step({
			phase: "production",
			label: "building does not run",
			value: 0,
			scope: { building: name },
			level: "warn",
			note: `0 % efficiency: ${zeroEfficiencyReason(elements)}`,
		});
	for (const ar of activeRecipes)
		trace.step({
			phase: "production",
			label: `${ar.recipeId} time`,
			formula: "time_ms × amount ÷ efficiency",
			inputs: {
				time_ms: ar.recipe.time_ms,
				amount: ar.amount,
				efficiency: totalEfficiency,
			},
			value: ar.time,
			unit: "ms",
			scope: { building: name, recipeId: ar.recipeId },
			note: `${ar.recipe.recipe_name}: ${recipeIO(ar.recipe)}`,
		});
	trace.step({
		phase: "production",
		label: "total batch time",
		formula: "Σ recipe time",
		value: totalBatchTime,
		unit: "ms",
		scope: { building: name },
	});
	for (const ar of activeRecipes)
		trace.step({
			phase: "production",
			label: `${ar.recipeId} daily share`,
			formula: "time ÷ total_batch_time",
			inputs: { time: ar.time, total_batch_time: totalBatchTime },
			value: ar.dailyShare,
			scope: { building: name, recipeId: ar.recipeId },
		});
}

/** a building's workforce and construction cost and daily revenue */
function traceBuilding(
	trace: IPlanTracer,
	building: IProductionBuilding,
	productionRevenue: number,
	workforceCost: number,
	constructionCost: number
): void {
	const scope = { building: building.name };
	trace.step({
		phase: "production",
		label: "workforce cost per building",
		formula: "Σ consumption × BUY price",
		inputs: Object.fromEntries(
			building.workforceMaterials.map((m) => [m.ticker, m.input])
		),
		value: building.workforceDailyCost,
		unit: "/day",
		scope,
	});
	trace.step({
		phase: "production",
		label: "construction cost per building",
		formula: "Σ material × BUY price",
		inputs: Object.fromEntries(
			building.constructionMaterials.map((m) => [m.ticker, m.input])
		),
		value: building.constructionCost,
		scope,
	});
	trace.step({
		phase: "production",
		label: "daily revenue",
		formula:
			"production_value − workforce_cost × amount − construction_cost ÷ 180 × amount",
		inputs: {
			production_value: productionRevenue,
			workforce_cost: workforceCost,
			construction_cost: constructionCost,
			amount: building.amount,
		},
		value: building.dailyRevenue,
		unit: "/day",
		scope,
	});
}

/** a recipe's materials per run, e.g. "1×H2O → 12×NUT" */
function recipeIO(recipe: Recipe): string {
	const list = (m: Recipe["inputs"]) =>
		m.map((x) => `${x.material_amount}×${x.material_ticker}`).join(" + ");
	return `${list(recipe.inputs) || "—"} → ${list(recipe.outputs) || "—"}`;
}

/** a building's game data, first in its trace group */
function traceBuildingData(
	trace: IPlanTracer,
	building: Building,
	amount: number
): void {
	const inputs: Record<string, number | string> = {
		type: building.building_type,
		expertise: building.expertise ?? "none",
		area_cost: building.area_cost,
	};
	for (const [name, count] of [
		["pioneers", building.pioneers],
		["settlers", building.settlers],
		["technicians", building.technicians],
		["engineers", building.engineers],
		["scientists", building.scientists],
	] as const)
		if (count > 0) inputs[name] = count;
	trace.step({
		phase: "production",
		label: "building",
		inputs,
		value: amount,
		unit: "buildings",
		scope: { building: building.building_ticker },
		note: building.building_name,
	});
}
