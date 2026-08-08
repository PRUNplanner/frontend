import { describe, expect, it } from "vitest";

// Calculations
import { calculateRepairPerUnit } from "@/features/raukk_sourcing/calculations/repairPerUnit";
import { calculateRepairCostPerDay } from "@/features/raukk_sourcing/calculations/repairCapitalCost";
import { TOTALMSDAY } from "@/features/planning/calculations/buildingCalculations";

// Types & Interfaces
import { IProductionBuilding } from "@/features/planning/usePlanCalculation.types";
import { RAUKK_REPAIR_DAY } from "@/features/raukk_sourcing/raukkSourcing.types";

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
 * Builds a production building whose recipes run exactly one batch cycle
 * per day, so recipe output amounts equal daily units.
 */
function building(
	name: string,
	recipes: IRecipeSpec[],
	constructionMaterials: IMaterialSpec[] = []
): IProductionBuilding {
	return {
		name,
		amount: 1,
		totalBatchTime: TOTALMSDAY,
		workforceDailyCost: 0,
		constructionMaterials: constructionMaterials.map((m) => ({
			ticker: m.ticker,
			input: m.amount,
			output: 0,
		})),
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

describe("Raukk Sourcing: Repair per Unit", () => {
	describe("calculateRepairPerUnit", () => {
		it("attributes a single recipe building to its output", () => {
			const result = calculateRepairPerUnit({
				buildings: [
					building("EXT", [
						{
							inputs: [],
							outputs: [{ ticker: "ALO", amount: 100 }],
						},
					]),
				],
				repairCostPerDayByBuilding: { EXT: 2884 },
			});

			expect(result.totalCostPerDay).toBe(2884);
			expect(result.unallocatedCostPerDay).toBe(0);
			expect(result.outputs.ALO.unitsPerDay).toBe(100);
			expect(result.outputs.ALO.costPerDay).toBeCloseTo(2884, 8);
			expect(result.outputs.ALO.costPerUnit).toBeCloseTo(28.84, 8);
		});

		it("amortizes multiple recipes by runtime share", () => {
			const result = calculateRepairPerUnit({
				buildings: [
					building("CHP", [
						{
							dailyShare: 0.75,
							inputs: [],
							outputs: [{ ticker: "AAR", amount: 10 }],
						},
						{
							dailyShare: 0.25,
							inputs: [],
							outputs: [{ ticker: "ABH", amount: 10 }],
						},
					]),
				],
				repairCostPerDayByBuilding: { CHP: 1000 },
			});

			// runtime share drives the cost, not the unit count
			expect(result.outputs.AAR.costPerDay).toBeCloseTo(750, 8);
			expect(result.outputs.ABH.costPerDay).toBeCloseTo(250, 8);
			expect(result.outputs.AAR.unitsPerDay).toBeCloseTo(10, 8);
			expect(result.outputs.ABH.unitsPerDay).toBeCloseTo(10, 8);
			expect(result.outputs.AAR.costPerUnit).toBeCloseTo(75, 8);
			expect(result.outputs.ABH.costPerUnit).toBeCloseTo(25, 8);
		});

		it("splits multi output recipes by output amount", () => {
			const result = calculateRepairPerUnit({
				buildings: [
					building("SME", [
						{
							inputs: [],
							outputs: [
								{ ticker: "FEO", amount: 30 },
								{ ticker: "LST", amount: 10 },
							],
						},
					]),
				],
				repairCostPerDayByBuilding: { SME: 400 },
			});

			expect(result.outputs.FEO.costPerDay).toBeCloseTo(300, 8);
			expect(result.outputs.LST.costPerDay).toBeCloseTo(100, 8);
			expect(result.outputs.FEO.costPerUnit).toBeCloseTo(10, 8);
			expect(result.outputs.LST.costPerUnit).toBeCloseTo(10, 8);
		});

		it("redistributes fully self consumed intermediates", () => {
			const result = calculateRepairPerUnit({
				buildings: [
					// HYF output is entirely consumed by the refinery
					building("FRM", [
						{
							inputs: [],
							outputs: [{ ticker: "HYF", amount: 50 }],
						},
					]),
					building("REF", [
						{
							inputs: [{ ticker: "HYF", amount: 50 }],
							outputs: [{ ticker: "RAT", amount: 20 }],
						},
					]),
				],
				repairCostPerDayByBuilding: { FRM: 100, REF: 300 },
			});

			expect(result.outputs.HYF).toBeUndefined();
			expect(result.outputs.RAT.unitsPerDay).toBeCloseTo(20, 8);
			// the farms cost carries over onto the only net output
			expect(result.outputs.RAT.costPerDay).toBeCloseTo(400, 8);
			expect(result.outputs.RAT.costPerUnit).toBeCloseTo(20, 8);
			expect(result.unallocatedCostPerDay).toBe(0);
		});

		it("honours handed in net output units", () => {
			const result = calculateRepairPerUnit({
				buildings: [
					building("FRM", [
						{
							inputs: [],
							outputs: [{ ticker: "RAT", amount: 100 }],
						},
					]),
				],
				repairCostPerDayByBuilding: { FRM: 500 },
				// workforce eats half of the output
				netOutputUnits: { RAT: 50 },
			});

			expect(result.outputs.RAT.unitsPerDay).toBe(50);
			expect(result.outputs.RAT.costPerDay).toBeCloseTo(500, 8);
			expect(result.outputs.RAT.costPerUnit).toBeCloseTo(10, 8);
		});

		it("keeps cost unallocated without any net output", () => {
			const result = calculateRepairPerUnit({
				buildings: [
					building("FRM", [
						{
							inputs: [],
							outputs: [{ ticker: "HYF", amount: 10 }],
						},
					]),
				],
				repairCostPerDayByBuilding: { FRM: 120 },
				netOutputUnits: {},
			});

			expect(result.outputs).toStrictEqual({});
			expect(result.unallocatedCostPerDay).toBeCloseTo(120, 8);
		});

		it("redistributes idle runtime share and idle buildings", () => {
			const result = calculateRepairPerUnit({
				buildings: [
					building("EXT", [
						{
							dailyShare: 0.5,
							inputs: [],
							outputs: [{ ticker: "ALO", amount: 100 }],
						},
					]),
					// no active recipe at all
					building("COL", []),
				],
				repairCostPerDayByBuilding: { EXT: 200, COL: 60 },
			});

			expect(result.totalCostPerDay).toBe(260);
			expect(result.outputs.ALO.costPerDay).toBeCloseTo(260, 8);
			expect(result.unallocatedCostPerDay).toBe(0);
		});

		it("holds the totals identity for all repair days", () => {
			const buildings: IProductionBuilding[] = [
				building(
					"CHP",
					[
						{
							dailyShare: 0.6,
							inputs: [],
							outputs: [
								{ ticker: "FEO", amount: 30 },
								{ ticker: "LST", amount: 10 },
							],
						},
						{
							dailyShare: 0.4,
							inputs: [],
							outputs: [{ ticker: "HYF", amount: 40 }],
						},
					],
					[
						{ ticker: "BSE", amount: 32 },
						{ ticker: "BDE", amount: 16 },
					]
				),
				building(
					"REF",
					[
						{
							inputs: [{ ticker: "HYF", amount: 16 }],
							outputs: [{ ticker: "RAT", amount: 25 }],
						},
					],
					[{ ticker: "BSE", amount: 12 }]
				),
			];

			const prices: Record<string, number> = { BSE: 120, BDE: 300 };
			const days: RAUKK_REPAIR_DAY[] = [30, 60, 90, 120];

			days.forEach((day) => {
				const cost = calculateRepairCostPerDay(
					buildings,
					day,
					(ticker) => prices[ticker] ?? 0
				);

				const result = calculateRepairPerUnit({
					buildings,
					repairCostPerDayByBuilding: cost.perBuilding,
				});

				expect(cost.total).toBeGreaterThan(0);
				expect(result.totalCostPerDay).toBeCloseTo(cost.total, 8);

				// sum over outputs of costPerUnit * units equals the plans
				// per building repair cost per day
				const allocated: number = Object.values(result.outputs).reduce(
					(sum, o) => sum + o.costPerUnit * o.unitsPerDay,
					0
				);

				expect(allocated + result.unallocatedCostPerDay).toBeCloseTo(
					cost.total,
					6
				);
				expect(result.unallocatedCostPerDay).toBe(0);
				// self consumed HYF holds no allocation of its own
				expect(result.outputs.HYF.unitsPerDay).toBeCloseTo(24, 8);
				expect(Object.keys(result.outputs).sort()).toStrictEqual([
					"FEO",
					"HYF",
					"LST",
					"RAT",
				]);
			});
		});

		it("returns an empty result without buildings", () => {
			const result = calculateRepairPerUnit({
				buildings: [],
				repairCostPerDayByBuilding: {},
			});

			expect(result.outputs).toStrictEqual({});
			expect(result.totalCostPerDay).toBe(0);
			expect(result.unallocatedCostPerDay).toBe(0);
		});
	});
});
