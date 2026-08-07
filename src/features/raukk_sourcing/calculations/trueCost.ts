// Calculation Utils
import { TOTALMSDAY } from "@/features/planning/calculations/buildingCalculations";

// Types & Interfaces
import {
	IMaterialIO,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";
import {
	IRaukkCostBreakdown,
	IRaukkOutputCost,
} from "@/features/raukk_sourcing/raukkSourcing.types";
import {
	IRaukkMaterialUnits,
	IRaukkResolvedPrice,
	IRaukkTrueCostInput,
	IRaukkTrueCostResult,
} from "@/features/raukk_sourcing/calculations/raukkCalculations.types";

/**
 * A single active recipe reduced to its daily contribution.
 *
 * `dailyShare` is the recipes share of its buildings runtime, taken
 * straight from the plan result — the same share the upstream COGM uses
 * to split building costs across recipes.
 */
interface IRecipeDaily {
	buildingName: string;
	dailyShare: number;
	/** Gross output units per day, keyed by ticker */
	outputs: IRaukkMaterialUnits;
	/** Gross input units per day, keyed by ticker */
	inputs: IRaukkMaterialUnits;
}

/** Cost buckets accumulated per output ticker */
interface ICostBuckets {
	workforce: number;
	repair: number;
	inputs: number;
}

/**
 * Reduces a plans production buildings to per-recipe daily gross
 * material flows.
 *
 * Batch runs mirror `calculateMaterialIO` of
 * `src/features/planning/calculations/buildingCalculations.ts`:
 * a building runs `TOTALMSDAY * amount / totalBatchTime` batches per day
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
 * Sums the `input` side of a material I/O array per ticker.
 *
 * @author raukk
 *
 * @param {IMaterialIO[]} materialIO Material I/O
 * @returns {IRaukkMaterialUnits} Gross input units per day per ticker
 */
function grossInputs(materialIO: IMaterialIO[]): IRaukkMaterialUnits {
	const result: IRaukkMaterialUnits = {};

	materialIO.forEach((e) => {
		if (e.input > 0) result[e.ticker] = (result[e.ticker] ?? 0) + e.input;
	});

	return result;
}

/**
 * Calculates a plans true break-even cost per output unit.
 *
 * Cost buckets per day are workforce consumables, repair capital cost
 * and production inputs; shipping stays 0 until the stretch goal. They
 * are allocated to output tickers with the same share logic the upstream
 * COGM uses (`usePlanCalculation.ts`): a buildings cost is split across
 * its active recipes by runtime share, a recipes cost is split across
 * its outputs proportional to output amount (the `costSplit` branch of
 * `outputCOGM`).
 *
 * Self consumption is already netted in `planResult.materialio`: only
 * net inputs (`delta < 0`) are paid for and only net outputs
 * (`delta > 0`) receive an allocation. A recipe whose outputs are fully
 * consumed inside the plan carries no weight; its cost is redistributed
 * across the plans net outputs.
 *
 * Prices are supplied by the caller through `resolveInputPrice`, which
 * decides market mode versus another plans transfer price. Whenever it
 * reports a `fromPlanUuid` the daily units are recorded in `draws`.
 *
 * @author raukk
 *
 * @param {IRaukkTrueCostInput} inputs Plan result, repair cost, resolver
 * @returns {IRaukkTrueCostResult} Output costs and cross-plan draws
 */
export function calculateTrueCosts(
	inputs: IRaukkTrueCostInput
): IRaukkTrueCostResult {
	const {
		planResult,
		repairCostPerDayByBuilding,
		repairMaterialUnitsPerDay = {},
		resolveInputPrice,
	} = inputs;

	const draws: Record<string, IRaukkMaterialUnits> = {};
	const priceCache: Map<string, IRaukkResolvedPrice> = new Map();

	/**
	 * Resolves a tickers price once and books the drawn units onto the
	 * source plan when the resolver reports one.
	 */
	function priceOf(ticker: string, unitsPerDay: number): number {
		let resolved: IRaukkResolvedPrice | undefined = priceCache.get(ticker);

		if (resolved === undefined) {
			resolved = resolveInputPrice(ticker);
			priceCache.set(ticker, resolved);
		}

		if (resolved.fromPlanUuid !== undefined && unitsPerDay > 0) {
			const planDraws: IRaukkMaterialUnits =
				draws[resolved.fromPlanUuid] ?? {};
			planDraws[ticker] = (planDraws[ticker] ?? 0) + unitsPerDay;
			draws[resolved.fromPlanUuid] = planDraws;
		}

		return resolved.price;
	}

	// repair materials are sourcable tickers as well; their cost already
	// arrives pre-computed per building, only the draws are booked here
	Object.entries(repairMaterialUnitsPerDay).forEach(([ticker, unitsPerDay]) =>
		priceOf(ticker, unitsPerDay)
	);

	/*
	 * Net material flows
	 *
	 * materialio carries the netted plan flows. Net inputs are split into
	 * a workforce and a production part by their gross demand share, so
	 * a ticker used by both buckets (e.g. self-produced food) is charged
	 * proportionally.
	 */

	const workforceGross: IRaukkMaterialUnits = grossInputs(
		planResult.workforceMaterialIO
	);
	const productionGross: IRaukkMaterialUnits = grossInputs(
		planResult.productionMaterialIO
	);

	const netOutputUnits: IRaukkMaterialUnits = {};
	const netProductionInput: IRaukkMaterialUnits = {};
	let workforceCostTotal: number = 0;

	planResult.materialio.forEach((e) => {
		if (e.delta > 0) {
			netOutputUnits[e.ticker] = e.delta;
			return;
		}
		if (e.delta >= 0) return;

		const netUnits: number = e.delta * -1;
		const wGross: number = workforceGross[e.ticker] ?? 0;
		const pGross: number = productionGross[e.ticker] ?? 0;
		const grossTotal: number = wGross + pGross;

		const workforceShare: number = grossTotal > 0 ? wGross / grossTotal : 0;
		const price: number = priceOf(e.ticker, netUnits);

		workforceCostTotal += netUnits * workforceShare * price;
		netProductionInput[e.ticker] = netUnits * (1 - workforceShare);
	});

	/*
	 * Input netting factor
	 *
	 * Recipes know their gross input demand only. Charging the plans net
	 * demand means scaling every recipes gross demand by the tickers
	 * net/gross ratio.
	 */

	const recipes: IRecipeDaily[] = reduceRecipesDaily(
		planResult.production.buildings
	);

	const recipeGrossInput: IRaukkMaterialUnits = {};
	const recipeGrossOutput: IRaukkMaterialUnits = {};

	recipes.forEach((r) => {
		Object.entries(r.inputs).forEach(([ticker, units]) => {
			recipeGrossInput[ticker] = (recipeGrossInput[ticker] ?? 0) + units;
		});
		Object.entries(r.outputs).forEach(([ticker, units]) => {
			recipeGrossOutput[ticker] =
				(recipeGrossOutput[ticker] ?? 0) + units;
		});
	});

	/*
	 * Workforce cost per building
	 *
	 * The plans workforce consumable cost is distributed over buildings
	 * by their upstream workforce cost weight, matching the COGM notion
	 * of a buildings own workforce cost, then over recipes by runtime
	 * share.
	 */

	const buildingWeights: Record<string, number> = {};
	let buildingWeightTotal: number = 0;

	planResult.production.buildings.forEach((b) => {
		const weight: number = Math.abs(b.workforceDailyCost) * b.amount;
		buildingWeights[b.name] = (buildingWeights[b.name] ?? 0) + weight;
		buildingWeightTotal += weight;
	});

	const runningBuildings: string[] = Array.from(
		new Set(recipes.map((r) => r.buildingName))
	);

	function buildingWorkforceCost(name: string): number {
		if (buildingWeightTotal > 0) {
			return (
				workforceCostTotal *
				((buildingWeights[name] ?? 0) / buildingWeightTotal)
			);
		}
		// no workforce weights available, spread evenly
		return runningBuildings.length > 0
			? workforceCostTotal / runningBuildings.length
			: 0;
	}

	/*
	 * Allocation to outputs
	 */

	const buckets: Record<string, ICostBuckets> = {};
	const weightByTicker: IRaukkMaterialUnits = {};
	const residual: ICostBuckets = { workforce: 0, repair: 0, inputs: 0 };

	function addBucket(ticker: string, key: keyof ICostBuckets, v: number) {
		const current: ICostBuckets = buckets[ticker] ?? {
			workforce: 0,
			repair: 0,
			inputs: 0,
		};
		current[key] += v;
		buckets[ticker] = current;
	}

	recipes.forEach((r) => {
		const workforce: number =
			buildingWorkforceCost(r.buildingName) * r.dailyShare;
		const repair: number =
			(repairCostPerDayByBuilding[r.buildingName] ?? 0) * r.dailyShare;

		const inputCost: number = Object.entries(r.inputs).reduce(
			(sum, [ticker, units]) => {
				const gross: number = recipeGrossInput[ticker] ?? 0;
				if (gross <= 0) return sum;

				const netFactor: number =
					(netProductionInput[ticker] ?? 0) / gross;

				return (
					sum +
					units * netFactor * (priceCache.get(ticker)?.price ?? 0)
				);
			},
			0
		);

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
			residual.workforce += workforce;
			residual.repair += repair;
			residual.inputs += inputCost;
			return;
		}

		Object.entries(weights).forEach(([ticker, weight]) => {
			const share: number = weight / weightTotal;

			addBucket(ticker, "workforce", workforce * share);
			addBucket(ticker, "repair", repair * share);
			addBucket(ticker, "inputs", inputCost * share);

			weightByTicker[ticker] = (weightByTicker[ticker] ?? 0) + weight;
		});
	});

	// redistribute the cost of fully self consumed recipes
	const residualTotal: number =
		residual.workforce + residual.repair + residual.inputs;
	const residualWeight: number = Object.values(weightByTicker).reduce(
		(sum, w) => sum + w,
		0
	);

	if (residualTotal !== 0 && residualWeight > 0) {
		Object.entries(weightByTicker).forEach(([ticker, weight]) => {
			const share: number = weight / residualWeight;

			addBucket(ticker, "workforce", residual.workforce * share);
			addBucket(ticker, "repair", residual.repair * share);
			addBucket(ticker, "inputs", residual.inputs * share);
		});
	}

	/*
	 * Per unit result
	 */

	const outputs: Record<string, IRaukkOutputCost> = {};

	Object.entries(buckets).forEach(([ticker, bucket]) => {
		const unitsPerDay: number = netOutputUnits[ticker] ?? 0;
		if (unitsPerDay <= 0) return;

		const breakdown: IRaukkCostBreakdown = {
			workforce: bucket.workforce / unitsPerDay,
			repair: bucket.repair / unitsPerDay,
			inputs: bucket.inputs / unitsPerDay,
			shipping: 0,
		};

		outputs[ticker] = {
			ticker,
			unitsPerDay,
			costPerUnit:
				breakdown.workforce +
				breakdown.repair +
				breakdown.inputs +
				breakdown.shipping,
			breakdown,
		};
	});

	return { outputs, draws };
}
