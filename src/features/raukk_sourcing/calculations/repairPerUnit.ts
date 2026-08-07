// Calculation Utils
import { TOTALMSDAY } from "@/features/planning/calculations/buildingCalculations";

// Types & Interfaces
import { IProductionBuilding } from "@/features/planning/usePlanCalculation.types";
import { IRaukkMaterialUnits } from "@/features/raukk_sourcing/calculations/raukkCalculations.types";

/**
 * A single active recipe reduced to its daily contribution.
 *
 * Minimal mirror of the identically named interface in
 * `src/features/raukk_sourcing/calculations/trueCost.ts`, which does not
 * export it.
 */
interface IRecipeDaily {
	buildingName: string;
	dailyShare: number;
	/** Gross output units per day, keyed by ticker */
	outputs: IRaukkMaterialUnits;
	/** Gross input units per day, keyed by ticker */
	inputs: IRaukkMaterialUnits;
}

export interface IRaukkRepairPerUnitInput {
	buildings: IProductionBuilding[];
	/** Key: building name, value: repair cost per day */
	repairCostPerDayByBuilding: Record<string, number>;
	/**
	 * Net output units per day per ticker, usually taken from
	 * `planResult.materialio` (`delta > 0`). When omitted the net units
	 * are derived from the recipes themselves as gross output minus
	 * gross input, which nets same-plan self consumption but not
	 * workforce consumption.
	 */
	netOutputUnits?: IRaukkMaterialUnits;
}

export interface IRaukkRepairOutputCost {
	ticker: string;
	/** Net units produced per day */
	unitsPerDay: number;
	/** Repair cost per day allocated to this ticker */
	costPerDay: number;
	/** Repair cost per produced unit */
	costPerUnit: number;
}

export interface IRaukkRepairPerUnitResult {
	/** Key: output material ticker */
	outputs: Record<string, IRaukkRepairOutputCost>;
	/** Sum of all handed in per building repair costs per day */
	totalCostPerDay: number;
	/** Repair cost that found no net output to carry it */
	unallocatedCostPerDay: number;
}

/**
 * Reduces production buildings to per-recipe daily gross material flows.
 *
 * Minimal mirror of `reduceRecipesDaily` of
 * `src/features/raukk_sourcing/calculations/trueCost.ts`, which keeps the
 * helper module private. Batch runs follow `calculateMaterialIO` of
 * `src/features/planning/calculations/buildingCalculations.ts`: a
 * building runs `TOTALMSDAY * amount / totalBatchTime` batches per day
 * and each active recipe contributes `amount` runs per batch.
 *
 * @author raukk
 *
 * @param {IProductionBuilding[]} buildings Plan production buildings
 * @returns {IRecipeDaily[]} Per-recipe daily flows
 */
function reduceRecipesDaily(buildings: IProductionBuilding[]): IRecipeDaily[] {
	const result: IRecipeDaily[] = [];

	buildings.forEach((building) => {
		if (building.amount <= 0 || building.totalBatchTime <= 0) return;

		const batchRuns: number =
			(TOTALMSDAY * building.amount) / building.totalBatchTime;

		building.activeRecipes.forEach((ar) => {
			if (ar.amount === 0) return;

			const runs: number = ar.amount * batchRuns;

			const outputs: IRaukkMaterialUnits = {};
			const inputs: IRaukkMaterialUnits = {};

			ar.recipe.outputs.forEach((o) => {
				outputs[o.material_ticker] =
					(outputs[o.material_ticker] ?? 0) +
					o.material_amount * runs;
			});
			ar.recipe.inputs.forEach((i) => {
				inputs[i.material_ticker] =
					(inputs[i.material_ticker] ?? 0) + i.material_amount * runs;
			});

			result.push({
				buildingName: building.name,
				dailyShare: ar.dailyShare,
				outputs,
				inputs,
			});
		});
	});

	return result;
}

/**
 * Allocates the daily repair capital cost of each building to the units
 * of output it produces.
 *
 * The allocation is the repair bucket of `calculateTrueCosts`
 * (`src/features/raukk_sourcing/calculations/trueCost.ts`) in isolation
 * and follows the same COGM share logic: a buildings cost is split
 * across its active recipes by runtime share (`dailyShare`), a recipes
 * cost is split across its outputs proportional to output amount (the
 * `costSplit` branch of `outputCOGM`).
 *
 * Only net output carries weight. A recipe whose outputs are fully
 * consumed inside the plan, a runtime share left idle and a building
 * without any active recipe therefore hold a residual, which is
 * redistributed across the plans net outputs by their weight — the same
 * documented redistribution `calculateTrueCosts` performs. Only when the
 * plan has no net output at all does the residual stay unallocated.
 *
 * @author raukk
 *
 * @param {IRaukkRepairPerUnitInput} input Buildings, costs, net outputs
 * @returns {IRaukkRepairPerUnitResult} Repair cost per unit of output
 */
export function calculateRepairPerUnit(
	input: IRaukkRepairPerUnitInput
): IRaukkRepairPerUnitResult {
	const { buildings, repairCostPerDayByBuilding } = input;

	const recipes: IRecipeDaily[] = reduceRecipesDaily(buildings);

	const totalCostPerDay: number = Object.values(
		repairCostPerDayByBuilding
	).reduce((sum, cost) => sum + cost, 0);

	/*
	 * Gross flows
	 */

	const recipeGrossOutput: IRaukkMaterialUnits = {};
	const recipeGrossInput: IRaukkMaterialUnits = {};

	recipes.forEach((r) => {
		Object.entries(r.outputs).forEach(([ticker, units]) => {
			recipeGrossOutput[ticker] =
				(recipeGrossOutput[ticker] ?? 0) + units;
		});
		Object.entries(r.inputs).forEach(([ticker, units]) => {
			recipeGrossInput[ticker] = (recipeGrossInput[ticker] ?? 0) + units;
		});
	});

	const netOutputUnits: IRaukkMaterialUnits = {};

	if (input.netOutputUnits !== undefined) {
		Object.entries(input.netOutputUnits).forEach(([ticker, units]) => {
			if (units > 0) netOutputUnits[ticker] = units;
		});
	} else {
		Object.entries(recipeGrossOutput).forEach(([ticker, units]) => {
			const net: number = units - (recipeGrossInput[ticker] ?? 0);
			if (net > 0) netOutputUnits[ticker] = net;
		});
	}

	/*
	 * Allocation to outputs
	 */

	const costByTicker: IRaukkMaterialUnits = {};
	const weightByTicker: IRaukkMaterialUnits = {};
	const coveredShare: Record<string, number> = {};
	let residual: number = 0;

	recipes.forEach((r) => {
		coveredShare[r.buildingName] =
			(coveredShare[r.buildingName] ?? 0) + r.dailyShare;

		const cost: number =
			(repairCostPerDayByBuilding[r.buildingName] ?? 0) * r.dailyShare;

		// weight net outputs only, self consumed units carry no weight
		const weights: IRaukkMaterialUnits = {};
		let weightTotal: number = 0;

		Object.entries(r.outputs).forEach(([ticker, units]) => {
			const gross: number = recipeGrossOutput[ticker] ?? 0;
			const netFraction: number =
				gross > 0 ? (netOutputUnits[ticker] ?? 0) / gross : 0;

			const weight: number = units * Math.min(netFraction, 1);
			if (weight <= 0) return;

			weights[ticker] = weight;
			weightTotal += weight;
		});

		if (weightTotal <= 0) {
			residual += cost;
			return;
		}

		Object.entries(weights).forEach(([ticker, weight]) => {
			const share: number = weight / weightTotal;

			costByTicker[ticker] = (costByTicker[ticker] ?? 0) + cost * share;
			weightByTicker[ticker] = (weightByTicker[ticker] ?? 0) + weight;
		});
	});

	// runtime shares left idle and buildings without an active recipe
	Object.entries(repairCostPerDayByBuilding).forEach(([name, cost]) => {
		const uncovered: number = 1 - (coveredShare[name] ?? 0);
		if (uncovered > 0) residual += cost * uncovered;
	});

	// redistribute what no recipe output could carry
	const residualWeight: number = Object.values(weightByTicker).reduce(
		(sum, weight) => sum + weight,
		0
	);

	if (residual !== 0 && residualWeight > 0) {
		Object.entries(weightByTicker).forEach(([ticker, weight]) => {
			costByTicker[ticker] += residual * (weight / residualWeight);
		});
		residual = 0;
	}

	/*
	 * Per unit result
	 */

	const outputs: Record<string, IRaukkRepairOutputCost> = {};

	Object.entries(costByTicker).forEach(([ticker, costPerDay]) => {
		const unitsPerDay: number = netOutputUnits[ticker] ?? 0;
		if (unitsPerDay <= 0) return;

		outputs[ticker] = {
			ticker,
			unitsPerDay,
			costPerDay,
			costPerUnit: costPerDay / unitsPerDay,
		};
	});

	return {
		outputs,
		totalCostPerDay,
		unallocatedCostPerDay: residual,
	};
}
