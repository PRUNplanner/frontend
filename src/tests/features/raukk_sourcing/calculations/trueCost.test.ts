import { describe, expect, it } from "vitest";

// Calculations
import { calculateTrueCosts } from "@/features/raukk_sourcing/calculations/trueCost";
import { TOTALMSDAY } from "@/features/planning/calculations/buildingCalculations";

// Types & Interfaces
import {
	IMaterialIO,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";
import {
	IRaukkPlanCostSource,
	IRaukkResolvedPrice,
} from "@/features/raukk_sourcing/calculations/raukkCalculations.types";

interface IMaterialSpec {
	ticker: string;
	amount: number;
}

interface IRecipeSpec {
	inputs: IMaterialSpec[];
	outputs: IMaterialSpec[];
	/** share of the buildings daily runtime */
	dailyShare?: number;
}

/**
 * Builds a material I/O entry; only ticker, input, output and delta are
 * relevant for the true cost rollup.
 */
function mio(ticker: string, input: number, output: number): IMaterialIO {
	return {
		ticker,
		input,
		output,
		delta: output - input,
		individualWeight: 0,
		individualVolume: 0,
		totalWeight: 0,
		totalVolume: 0,
		price: 0,
	};
}

/**
 * Builds a production building whose recipes run exactly one batch cycle
 * per day, so recipe output amounts equal daily units.
 */
function building(
	name: string,
	workforceDailyCost: number,
	recipes: IRecipeSpec[]
): IProductionBuilding {
	return {
		name,
		amount: 1,
		totalBatchTime: TOTALMSDAY,
		workforceDailyCost,
		activeRecipes: recipes.map((r, index) => ({
			recipeId: `${name}#${index}`,
			amount: 1,
			dailyShare: r.dailyShare ?? 1 / recipes.length,
			time: TOTALMSDAY / recipes.length,
			cogm: undefined,
			recipe: {
				inputs: r.inputs.map((i) => ({
					material_ticker: i.ticker,
					material_amount: i.amount,
				})),
				outputs: r.outputs.map((o) => ({
					material_ticker: o.ticker,
					material_amount: o.amount,
				})),
			},
		})),
	} as unknown as IProductionBuilding;
}

function planResult(
	buildings: IProductionBuilding[],
	materialio: IMaterialIO[],
	workforceMaterialIO: IMaterialIO[],
	productionMaterialIO: IMaterialIO[]
): IRaukkPlanCostSource {
	return {
		production: { buildings, materialio: [] },
		materialio,
		workforceMaterialIO,
		productionMaterialIO,
	};
}

function marketResolver(
	prices: Record<string, number>
): (ticker: string) => IRaukkResolvedPrice {
	return (ticker: string) => ({ price: prices[ticker] ?? 0 });
}

describe("Raukk Sourcing: True Cost", () => {
	describe("calculateTrueCosts", () => {
		it("rolls workforce and repair onto a single output", () => {
			const result = calculateTrueCosts({
				planResult: planResult(
					[
						building("EXT", -16986, [
							{
								inputs: [],
								outputs: [{ ticker: "ALO", amount: 100 }],
							},
						]),
					],
					[mio("ALO", 0, 100), mio("RAT", 100, 0)],
					[mio("RAT", 100, 0)],
					[mio("ALO", 0, 100)]
				),
				repairCostPerDayByBuilding: { EXT: 2884 },
				resolveInputPrice: marketResolver({ RAT: 169.86 }),
			});

			const alo = result.outputs.ALO;

			expect(alo.unitsPerDay).toBe(100);
			expect(alo.breakdown.workforce).toBeCloseTo(169.86, 8);
			expect(alo.breakdown.repair).toBeCloseTo(28.84, 8);
			expect(alo.breakdown.inputs).toBeCloseTo(0, 10);
			expect(alo.breakdown.shipping).toBe(0);
			expect(alo.costPerUnit).toBeCloseTo((16986 + 2884) / 100, 8);
			expect(result.draws).toStrictEqual({});
		});

		it("splits multi output recipes by output amount", () => {
			const result = calculateTrueCosts({
				planResult: planResult(
					[
						building("SME", 0, [
							{
								inputs: [],
								outputs: [
									{ ticker: "AL", amount: 2 },
									{ ticker: "SI", amount: 8 },
								],
							},
						]),
					],
					[mio("AL", 0, 2), mio("SI", 0, 8)],
					[],
					[mio("AL", 0, 2), mio("SI", 0, 8)]
				),
				repairCostPerDayByBuilding: { SME: 1000 },
				resolveInputPrice: marketResolver({}),
			});

			// costSplit semantics: identical cost per unit
			expect(result.outputs.AL.costPerUnit).toBeCloseTo(100, 8);
			expect(result.outputs.SI.costPerUnit).toBeCloseTo(100, 8);
			expect(result.outputs.AL.breakdown.repair).toBeCloseTo(100, 8);
		});

		it("splits building cost across recipes by runtime share", () => {
			const result = calculateTrueCosts({
				planResult: planResult(
					[
						building("FP", -1000, [
							{
								inputs: [],
								outputs: [{ ticker: "DW", amount: 10 }],
								dailyShare: 0.75,
							},
							{
								inputs: [],
								outputs: [{ ticker: "RAT", amount: 10 }],
								dailyShare: 0.25,
							},
						]),
					],
					[mio("DW", 0, 10), mio("RAT", 0, 10), mio("H2O", 50, 0)],
					[mio("H2O", 50, 0)],
					[mio("DW", 0, 10), mio("RAT", 0, 10)]
				),
				repairCostPerDayByBuilding: { FP: 400 },
				resolveInputPrice: marketResolver({ H2O: 20 }),
			});

			// repair 400 -> 300 / 100, workforce 1000 -> 750 / 250
			expect(result.outputs.DW.breakdown.repair).toBeCloseTo(30, 8);
			expect(result.outputs.RAT.breakdown.repair).toBeCloseTo(10, 8);
			expect(result.outputs.DW.breakdown.workforce).toBeCloseTo(75, 8);
			expect(result.outputs.RAT.breakdown.workforce).toBeCloseTo(25, 8);
		});

		it("charges only net inputs and allocates only net outputs", () => {
			// HYF produces 40 H2O, FP consumes 30 of them internally
			const result = calculateTrueCosts({
				planResult: planResult(
					[
						building("RIG", 0, [
							{
								inputs: [],
								outputs: [{ ticker: "H2O", amount: 40 }],
							},
						]),
						building("FP", 0, [
							{
								inputs: [{ ticker: "H2O", amount: 30 }],
								outputs: [{ ticker: "DW", amount: 20 }],
							},
						]),
					],
					[mio("H2O", 30, 40), mio("DW", 0, 20)],
					[],
					[mio("H2O", 30, 40), mio("DW", 0, 20)]
				),
				repairCostPerDayByBuilding: { RIG: 100, FP: 200 },
				resolveInputPrice: marketResolver({ H2O: 50 }),
			});

			// net H2O output is 10, no H2O is bought
			expect(result.outputs.H2O.unitsPerDay).toBe(10);
			expect(result.outputs.DW.breakdown.inputs).toBeCloseTo(0, 10);

			// RIG repair follows the net share of its H2O output
			expect(result.outputs.H2O.breakdown.repair).toBeCloseTo(
				100 / 10,
				8
			);
			expect(result.outputs.DW.breakdown.repair).toBeCloseTo(200 / 20, 8);
		});

		it("redistributes cost of fully self consumed recipes", () => {
			const result = calculateTrueCosts({
				planResult: planResult(
					[
						building("RIG", 0, [
							{
								inputs: [],
								outputs: [{ ticker: "H2O", amount: 30 }],
							},
						]),
						building("FP", 0, [
							{
								inputs: [{ ticker: "H2O", amount: 30 }],
								outputs: [{ ticker: "DW", amount: 20 }],
							},
						]),
					],
					[mio("H2O", 30, 30), mio("DW", 0, 20)],
					[],
					[mio("H2O", 30, 30), mio("DW", 0, 20)]
				),
				repairCostPerDayByBuilding: { RIG: 100, FP: 200 },
				resolveInputPrice: marketResolver({ H2O: 50 }),
			});

			expect(result.outputs.H2O).toBeUndefined();
			// RIG's 100 lands on DW as well: (100 + 200) / 20
			expect(result.outputs.DW.costPerUnit).toBeCloseTo(15, 8);
		});

		it("redistributes cost of buildings without any recipe", () => {
			// IDLE contributes no recipe row at all, its repair and
			// workforce share still has to reach the outputs
			const result = calculateTrueCosts({
				planResult: planResult(
					[
						building("EXT", -1000, [
							{
								inputs: [],
								outputs: [{ ticker: "ALO", amount: 100 }],
							},
						]),
						building("IDLE", -1000, []),
					],
					[mio("ALO", 0, 100), mio("RAT", 10, 0)],
					[mio("RAT", 10, 0)],
					[mio("ALO", 0, 100)]
				),
				repairCostPerDayByBuilding: { EXT: 500, IDLE: 300 },
				resolveInputPrice: marketResolver({ RAT: 20 }),
			});

			const alo = result.outputs.ALO;

			// workforce 200 split 100 / 100 by equal weights, repair
			// 500 + 300, everything of IDLE arrives via the residual
			expect(alo.breakdown.workforce).toBeCloseTo(2, 8);
			expect(alo.breakdown.repair).toBeCloseTo(8, 8);
			expect(alo.costPerUnit).toBeCloseTo(10, 8);
		});

		it("reconciles allocated cost with the daily cost fed in", () => {
			const result = calculateTrueCosts({
				planResult: planResult(
					[
						building("EXT", -16986, [
							{
								inputs: [{ ticker: "FLX", amount: 20 }],
								outputs: [{ ticker: "ALO", amount: 100 }],
							},
						]),
						building("IDLE", -4000, []),
					],
					[mio("ALO", 0, 100), mio("FLX", 20, 0), mio("RAT", 100, 0)],
					[mio("RAT", 100, 0)],
					[mio("ALO", 0, 100), mio("FLX", 20, 0)]
				),
				repairCostPerDayByBuilding: { EXT: 500, IDLE: 300 },
				resolveInputPrice: marketResolver({ RAT: 169.86, FLX: 50 }),
			});

			const allocated: number = Object.values(result.outputs).reduce(
				(sum, output) => sum + output.costPerUnit * output.unitsPerDay,
				0
			);

			// workforce 100 * 169.86, inputs 20 * 50, repair 500 + 300
			expect(allocated).toBeCloseTo(16986 + 1000 + 800, 6);
		});

		it("splits a shared ticker between workforce and inputs", () => {
			const result = calculateTrueCosts({
				planResult: planResult(
					[
						building("FP", 0, [
							{
								inputs: [{ ticker: "DW", amount: 30 }],
								outputs: [{ ticker: "COF", amount: 10 }],
							},
						]),
					],
					[mio("DW", 40, 0), mio("COF", 0, 10)],
					[mio("DW", 10, 0)],
					[mio("DW", 30, 0), mio("COF", 0, 10)]
				),
				repairCostPerDayByBuilding: {},
				resolveInputPrice: marketResolver({ DW: 100 }),
			});

			// 40 DW bought at 100: 25% workforce, 75% production
			expect(result.outputs.COF.breakdown.workforce).toBeCloseTo(100, 8);
			expect(result.outputs.COF.breakdown.inputs).toBeCloseTo(300, 8);
			expect(result.outputs.COF.costPerUnit).toBeCloseTo(400, 8);
		});

		it("books draws for plan sourced inputs and repair materials", () => {
			const result = calculateTrueCosts({
				planResult: planResult(
					[
						building("SME", 0, [
							{
								inputs: [{ ticker: "ALO", amount: 50 }],
								outputs: [{ ticker: "AL", amount: 25 }],
							},
						]),
					],
					[mio("ALO", 50, 0), mio("AL", 0, 25), mio("RAT", 8, 0)],
					[mio("RAT", 8, 0)],
					[mio("ALO", 50, 0), mio("AL", 0, 25)]
				),
				repairCostPerDayByBuilding: { SME: 60 },
				repairMaterialUnitsPerDay: { BSE: 2, LDE: 1 },
				resolveInputPrice: (ticker: string) => {
					if (ticker === "ALO")
						return { price: 30, fromPlanUuid: "plan-ore" };
					if (ticker === "BSE")
						return { price: 900, fromPlanUuid: "plan-base" };
					if (ticker === "RAT")
						return { price: 120, fromPlanUuid: "plan-food" };
					return { price: 500 };
				},
			});

			expect(result.draws).toStrictEqual({
				"plan-ore": { ALO: 50 },
				"plan-base": { BSE: 2 },
				"plan-food": { RAT: 8 },
			});

			// LDE is a market repair material, no draw
			expect(result.draws["plan-base"].LDE).toBeUndefined();

			expect(result.outputs.AL.breakdown.inputs).toBeCloseTo(
				(50 * 30) / 25,
				8
			);
			expect(result.outputs.AL.breakdown.repair).toBeCloseTo(60 / 25, 8);
			expect(result.outputs.AL.breakdown.workforce).toBeCloseTo(
				(8 * 120) / 25,
				8
			);
		});

		it("returns empty results without production", () => {
			const result = calculateTrueCosts({
				planResult: planResult([], [], [], []),
				repairCostPerDayByBuilding: {},
				resolveInputPrice: marketResolver({}),
			});

			expect(result.outputs).toStrictEqual({});
			expect(result.draws).toStrictEqual({});
		});

		it("skips buildings without amount or batch time", () => {
			const idle = building("EXT", -100, [
				{ inputs: [], outputs: [{ ticker: "ALO", amount: 10 }] },
			]);
			idle.amount = 0;

			const result = calculateTrueCosts({
				planResult: planResult(
					[idle],
					[mio("ALO", 0, 10)],
					[],
					[mio("ALO", 0, 10)]
				),
				repairCostPerDayByBuilding: { EXT: 50 },
				resolveInputPrice: marketResolver({}),
			});

			expect(result.outputs).toStrictEqual({});
		});

		it("spreads workforce cost evenly without workforce weights", () => {
			const result = calculateTrueCosts({
				planResult: planResult(
					[
						building("A", 0, [
							{
								inputs: [],
								outputs: [{ ticker: "X", amount: 10 }],
							},
						]),
						building("B", 0, [
							{
								inputs: [],
								outputs: [{ ticker: "Y", amount: 10 }],
							},
						]),
					],
					[mio("X", 0, 10), mio("Y", 0, 10), mio("RAT", 10, 0)],
					[mio("RAT", 10, 0)],
					[mio("X", 0, 10), mio("Y", 0, 10)]
				),
				repairCostPerDayByBuilding: {},
				resolveInputPrice: marketResolver({ RAT: 100 }),
			});

			expect(result.outputs.X.breakdown.workforce).toBeCloseTo(50, 8);
			expect(result.outputs.Y.breakdown.workforce).toBeCloseTo(50, 8);
		});

		/*
		 * Chain test — mirrors the real world two base example:
		 *
		 * base 1: 701 ALO/day, repair 2884/day, workforce 16986/day
		 *         => ~28.3 c/unit
		 * base 2: 337 ALO/day at base 1 rate, 89300 c/day market inputs,
		 *         repair 4300/day, workforce 19817/day, 224 AL/day
		 *         => ~549 c/unit (548.97 exactly)
		 */
		it("propagates a transfer price down a two plan chain", () => {
			const base1 = calculateTrueCosts({
				planResult: planResult(
					[
						building("EXT", -16986, [
							{
								inputs: [],
								outputs: [{ ticker: "ALO", amount: 701 }],
							},
						]),
					],
					[mio("ALO", 0, 701), mio("RAT", 100, 0)],
					[mio("RAT", 100, 0)],
					[mio("ALO", 0, 701)]
				),
				repairCostPerDayByBuilding: { EXT: 2884 },
				resolveInputPrice: marketResolver({ RAT: 169.86 }),
			});

			const aloCost: number = base1.outputs.ALO.costPerUnit;

			expect(base1.outputs.ALO.unitsPerDay).toBe(701);
			expect(aloCost).toBeCloseTo((16986 + 2884) / 701, 8);
			expect(aloCost).toBeCloseTo(28.345, 3);
			expect(base1.outputs.ALO.breakdown.workforce).toBeCloseTo(
				16986 / 701,
				8
			);
			expect(base1.outputs.ALO.breakdown.repair).toBeCloseTo(
				2884 / 701,
				8
			);

			const base2 = calculateTrueCosts({
				planResult: planResult(
					[
						building("SME", -19817, [
							{
								inputs: [
									{ ticker: "ALO", amount: 337 },
									{ ticker: "FLX", amount: 100 },
								],
								outputs: [{ ticker: "AL", amount: 224 }],
							},
						]),
					],
					[
						mio("ALO", 337, 0),
						mio("FLX", 100, 0),
						mio("RAT", 100, 0),
						mio("AL", 0, 224),
					],
					[mio("RAT", 100, 0)],
					[mio("ALO", 337, 0), mio("FLX", 100, 0), mio("AL", 0, 224)]
				),
				repairCostPerDayByBuilding: { SME: 4300 },
				resolveInputPrice: (ticker: string) => {
					if (ticker === "ALO")
						return { price: aloCost, fromPlanUuid: "plan-base-1" };
					if (ticker === "FLX") return { price: 893 };
					return { price: 198.17 };
				},
			});

			const al = base2.outputs.AL;

			const expectedInputs: number = 337 * aloCost + 89300;
			const expectedTotal: number = expectedInputs + 4300 + 19817;

			expect(al.unitsPerDay).toBe(224);
			expect(al.breakdown.inputs).toBeCloseTo(expectedInputs / 224, 8);
			expect(al.breakdown.repair).toBeCloseTo(4300 / 224, 8);
			expect(al.breakdown.workforce).toBeCloseTo(19817 / 224, 8);
			expect(al.breakdown.shipping).toBe(0);
			expect(al.costPerUnit).toBeCloseTo(expectedTotal / 224, 8);
			expect(al.costPerUnit).toBeCloseTo(548.97, 2);
			// the real world reference figure is "roughly 550 c/unit"
			expect(al.costPerUnit).toBeGreaterThan(540);
			expect(al.costPerUnit).toBeLessThan(560);

			expect(base2.draws).toStrictEqual({
				"plan-base-1": { ALO: 337 },
			});
		});
	});
});
