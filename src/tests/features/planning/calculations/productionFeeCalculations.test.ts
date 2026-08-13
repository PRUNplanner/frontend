import { describe, it, expect } from "vitest";

import { calculateProductionFeeRate } from "@/features/planning/calculations/productionFeeCalculations";

// Types & Interfaces
import { IBuilding } from "@/features/api/gameData.types";
import { IFIOProductionFeeTable } from "@/features/api/fioData.types";

const fakeBuilding = {
	ticker: "SME",
	expertise: "METALLURGY",
	pioneers: 50,
	settlers: 20,
	technicians: 0,
	engineers: 0,
	scientists: 0,
} as unknown as IBuilding;

const fakeFees: IFIOProductionFeeTable = {
	METALLURGY: {
		pioneer: 50,
		settler: 80,
		technician: 140,
		engineer: 800,
		scientist: 1500,
	},
};

describe("productionFeeCalculations", () => {
	describe("calculateProductionFeeRate", () => {
		it("amortizes the tier rates over the buildings workforce", () => {
			// (50 * 50 + 20 * 80) / 70 workers
			expect(
				calculateProductionFeeRate(fakeBuilding, fakeFees)
			).toBeCloseTo(4100 / 70, 8);
		});

		it("charges a single tier building its tier rate flat", () => {
			const singleTier = {
				...fakeBuilding,
				pioneers: 100,
				settlers: 0,
			} as IBuilding;
			expect(calculateProductionFeeRate(singleTier, fakeFees)).toBe(50);
		});

		it("is independent of the buildings worker count", () => {
			const doubled = {
				...fakeBuilding,
				pioneers: 100,
				settlers: 40,
			} as IBuilding;
			expect(calculateProductionFeeRate(doubled, fakeFees)).toBeCloseTo(
				calculateProductionFeeRate(fakeBuilding, fakeFees),
				8
			);
		});

		it("returns 0 without any workforce", () => {
			const empty = {
				...fakeBuilding,
				pioneers: 0,
				settlers: 0,
			} as IBuilding;
			expect(calculateProductionFeeRate(empty, fakeFees)).toBe(0);
		});

		it("reproduces the APEX handbook worked example", () => {
			// handbook "Local Rules": a polymer plant of 10 pioneers at 15
			// and 25 settlers at 12 pays (10 * 15 + 25 * 12) / 35 = 12.9
			const polymerPlant = {
				ticker: "POL",
				expertise: "CHEMISTRY",
				pioneers: 10,
				settlers: 25,
				technicians: 0,
				engineers: 0,
				scientists: 0,
			} as unknown as IBuilding;

			expect(
				calculateProductionFeeRate(polymerPlant, {
					CHEMISTRY: { pioneer: 15, settler: 12 },
				})
			).toBeCloseTo(450 / 35, 8);
		});

		it("returns 0 on unknown fees", () => {
			expect(calculateProductionFeeRate(fakeBuilding, null)).toBe(0);
		});

		it("returns 0 without building expertise", () => {
			const noExpertise = {
				...fakeBuilding,
				expertise: null,
			} as IBuilding;
			expect(calculateProductionFeeRate(noExpertise, fakeFees)).toBe(0);
		});

		it("returns 0 on missing industry fee table", () => {
			const otherExpertise = {
				...fakeBuilding,
				expertise: "CHEMISTRY",
			} as IBuilding;
			expect(calculateProductionFeeRate(otherExpertise, fakeFees)).toBe(
				0
			);
		});
	});
});
