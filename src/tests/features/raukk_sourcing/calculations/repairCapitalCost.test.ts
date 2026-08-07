import { describe, expect, it } from "vitest";

// Calculations
import {
	calculateRepairAmountAtDay,
	calculateRepairCostPerDay,
	calculateRepairMaterialsPerDay,
} from "@/features/raukk_sourcing/calculations/repairCapitalCost";

// Types & Interfaces
import { IRaukkRepairBuilding } from "@/features/raukk_sourcing/calculations/raukkCalculations.types";

// Test Data
import plan_etherwind from "@/tests/test_data/api_data_plan_etherwind.json";

/**
 * Reference implementation copied from
 * src/features/repair_analysis/useRepairAnalysis.ts to prove parity.
 */
function referenceAmountAtDay(day: number, materialAmount: number): number {
	return (
		materialAmount -
		Math.floor((materialAmount * (180 - Math.min(180, day))) / 180)
	);
}

const buildings: IRaukkRepairBuilding[] = [
	{
		name: "EXT",
		amount: 2,
		constructionMaterials: [
			{ ticker: "BSE", input: 4, output: 0 },
			{ ticker: "LDE", input: 8, output: 0 },
		],
	},
	{
		name: "SME",
		amount: 1,
		constructionMaterials: [{ ticker: "BSE", input: 10, output: 0 }],
	},
];

const prices: Record<string, number> = { BSE: 1000, LDE: 500 };
const getPrice = (ticker: string): number => prices[ticker] ?? 0;

describe("Raukk Sourcing: Repair Capital Cost", () => {
	describe("calculateRepairAmountAtDay", () => {
		it("matches the repair analysis reference for all days", () => {
			for (let day = 0; day <= 180; day++) {
				for (const amount of [1, 4, 10, 57, 200]) {
					expect(calculateRepairAmountAtDay(day, amount)).toBe(
						referenceAmountAtDay(day, amount)
					);
				}
			}
		});

		it("is 0 at day 0 and full amount at day 180", () => {
			expect(calculateRepairAmountAtDay(0, 12)).toBe(0);
			expect(calculateRepairAmountAtDay(180, 12)).toBe(12);
			expect(calculateRepairAmountAtDay(90, 12)).toBe(6);
		});
	});

	describe("calculateRepairMaterialsPerDay", () => {
		it("splits material demand per building and total", () => {
			const result = calculateRepairMaterialsPerDay(buildings, 90);

			// BSE: 4 -> 2 at day 90, x2 buildings / 90 days
			expect(result.perBuilding.EXT.BSE).toBeCloseTo((2 * 2) / 90, 10);
			expect(result.perBuilding.EXT.LDE).toBeCloseTo((4 * 2) / 90, 10);
			expect(result.perBuilding.SME.BSE).toBeCloseTo(5 / 90, 10);

			expect(result.total.BSE).toBeCloseTo(4 / 90 + 5 / 90, 10);
			expect(result.total.LDE).toBeCloseTo(8 / 90, 10);
		});

		it("scales with the repair day", () => {
			const d30 = calculateRepairMaterialsPerDay(buildings, 30);
			const d120 = calculateRepairMaterialsPerDay(buildings, 120);

			// shorter cycles repair more often but with rounded down
			// material amounts, so per day demand is never lower
			expect(d30.total.BSE).toBeGreaterThan(d120.total.BSE);
		});
	});

	describe("calculateRepairCostPerDay", () => {
		it("prices repair materials per building and plan total", () => {
			const result = calculateRepairCostPerDay(buildings, 90, getPrice);

			const ext: number = ((2 * 2) / 90) * 1000 + ((4 * 2) / 90) * 500;
			const sme: number = (5 / 90) * 1000;

			expect(result.perBuilding.EXT).toBeCloseTo(ext, 8);
			expect(result.perBuilding.SME).toBeCloseTo(sme, 8);
			expect(result.total).toBeCloseTo(ext + sme, 8);
			expect(result.materialUnitsPerDay.BSE).toBeCloseTo(9 / 90, 10);
		});

		it("equals total repair cost divided by the repair day", () => {
			for (const day of [30, 60, 90, 120] as const) {
				const result = calculateRepairCostPerDay(
					buildings,
					day,
					getPrice
				);

				// total repair bill of one full cycle
				const cycleCost: number = buildings.reduce(
					(sum, b) =>
						sum +
						b.constructionMaterials.reduce(
							(inner, m) =>
								inner +
								calculateRepairAmountAtDay(day, m.input) *
									b.amount *
									getPrice(m.ticker),
							0
						),
					0
				);

				expect(result.total).toBeCloseTo(cycleCost / day, 8);
			}
		});

		it("resolves each ticker price only once", () => {
			let calls: number = 0;
			calculateRepairCostPerDay(buildings, 90, (ticker) => {
				calls++;
				return getPrice(ticker);
			});

			// BSE and LDE, despite BSE being used by two buildings
			expect(calls).toBe(2);
		});

		it("handles an empty building list", () => {
			const result = calculateRepairCostPerDay([], 90, getPrice);

			expect(result.total).toBe(0);
			expect(result.perBuilding).toStrictEqual({});
			expect(result.materialUnitsPerDay).toStrictEqual({});
		});

		it("works on the etherwind plan building layout", () => {
			// fixture supplies real building names and amounts, paired
			// with a synthetic construction material per building
			const fixtureBuildings: IRaukkRepairBuilding[] =
				plan_etherwind.plan_data.buildings.map((b) => ({
					name: b.name,
					amount: b.amount,
					constructionMaterials: [
						{ ticker: "BSE", input: 6, output: 0 },
					],
				}));

			const result = calculateRepairCostPerDay(
				fixtureBuildings,
				90,
				getPrice
			);

			const totalAmount: number =
				plan_etherwind.plan_data.buildings.reduce(
					(sum, b) => sum + b.amount,
					0
				);

			expect(Object.keys(result.perBuilding)).toHaveLength(
				plan_etherwind.plan_data.buildings.length
			);
			// 6 -> 3 at day 90, per building instance, over 90 days
			expect(result.total).toBeCloseTo(
				((3 * totalAmount) / 90) * 1000,
				6
			);
		});
	});
});
