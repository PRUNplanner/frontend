import { describe, expect, it } from "vitest";

const costs = {
	HB1: 50283.96581293734,
	HB2: 48183.93380367031,
	HB3: 171236.78856075153,
	HB4: 478742.2978713045,
	HB5: 881886.0033487707,
	HBB: 78602.69810873509,
	HBC: 191175.66459235144,
	HBM: 759867.355670017,
	HBL: 1210568.4635058648,
	STO: 63758.759930078755,
};

const workforce = {
	pioneer: {
		name: "pioneer",
		required: 100,
		capacity: 100,
		left: 0,
		lux1: true,
		lux2: true,
		efficiency: 1,
	},
	settler: {
		name: "settler",
		required: 390,
		capacity: 400,
		left: 10,
		lux1: true,
		lux2: true,
		efficiency: 1,
	},
	technician: {
		name: "technician",
		required: 490,
		capacity: 500,
		left: 10,
		lux1: true,
		lux2: true,
		efficiency: 1,
	},
	engineer: {
		name: "engineer",
		required: 0,
		capacity: 0,
		left: 0,
		lux1: false,
		lux2: false,
		efficiency: 0,
	},
	scientist: {
		name: "scientist",
		required: 0,
		capacity: 0,
		left: 0,
		lux1: false,
		lux2: false,
		efficiency: 0,
	},
};

const infrastructure = {
	HB1: 1,
	HB2: 4,
	HB3: 5,
	HB4: 0,
	HB5: 0,
	HBB: 0,
	HBC: 0,
	HBM: 0,
	HBL: 0,
	STO: 1,
	STA: 0,
	STE: 0,
	STV: 0,
	STW: 0,
};

import {
	calculateAvailableArea,
	optimizeHabs,
} from "@/features/planning/calculations/habOptimization";

describe("Planning: Hab Optimization", async () => {
	it("calculateAvailableArea", async () => {
		const result = calculateAvailableArea(500, 493, infrastructure);

		expect(result).toBe(135);
	});

	describe("optimizeHabs", async () => {
		it("auto", async () => {
			// @ts-expect-error mock
			const result = optimizeHabs("auto", costs, workforce, 500);

			expect(result.result).toBe(1099203.64383138);
			// @ts-expect-error available
			expect(result.variables.find((a) => a[0] === "HB1")[1]).toBe(1);
			// @ts-expect-error available
			expect(result.variables.find((a) => a[0] === "HB2")[1]).toBe(4);
			// @ts-expect-error available
			expect(result.variables.find((a) => a[0] === "HB3")[1]).toBe(5);
			expect(result.status).toBe("optimal");
		});

		it("area, fallback", async () => {
			// @ts-expect-error mock
			const result = optimizeHabs("auto", costs, workforce, 0, true);

			expect(result.result).toBe(118);
			expect(result.status).toBe("optimal");
		});
	});
});
