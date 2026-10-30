import { describe, it, expect } from "vitest";

import {
	foldedPanes,
	materialIOCsv,
	materialIOTotals,
	type PlanTool,
} from "@/features/planning/planView.util";
import { io } from "@/tests/features/planning/usePlanCalculation.fixtures";

describe("foldedPanes", () => {
	it("folds Base on the production list too (only 81–100rem, by CSS)", () => {
		expect(foldedPanes(null)).toStrictEqual({ base: true, io: false });
	});

	it.each<[PlanTool, boolean]>([
		["construction-cart", false],
		["supply-cart", false],
		["visitation-frequency", false],
		["popr", false],
		["repair-analysis", true],
		["profit-breakdown", true],
		["plan-check", true],
	])("%s folds Base, Material I/O: %s", (tool, io) => {
		expect(foldedPanes(tool)).toStrictEqual({ base: true, io });
	});
});

describe("materialIOTotals", () => {
	it("splits exports and imports by the delta's sign", () => {
		expect(
			materialIOTotals([
				io("RAT", 10, { price: 500 }),
				io("H2O", -20, { price: -80 }),
				io("DW", 0),
			])
		).toStrictEqual({ exports: 500, imports: -80 });
	});
});

describe("materialIOCsv", () => {
	it("writes a header and one line per material", () => {
		const rat = io("RAT", 10, {
			price: 500,
			totalWeight: 10,
			totalVolume: 5,
		});
		expect(materialIOCsv([rat])).toBe(
			"ticker,input,output,delta,value,weight,volume\nRAT,0,10,10,500,10,5"
		);
	});
});
