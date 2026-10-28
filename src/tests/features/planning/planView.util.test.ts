import { describe, it, expect } from "vitest";

import {
	foldedPanes,
	materialIOCsv,
	materialIOTotals,
	type PlanTool,
} from "@/features/planning/planView.util";
import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

const io = (ticker: string, delta: number, price: number): IMaterialIO => ({
	ticker,
	input: delta < 0 ? -delta : 0,
	output: delta > 0 ? delta : 0,
	delta,
	price,
	individualWeight: 1,
	individualVolume: 1,
	totalWeight: delta,
	totalVolume: delta / 2,
});

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
				io("RAT", 10, 500),
				io("H2O", -20, -80),
				io("DW", 0, 0),
			])
		).toStrictEqual({ exports: 500, imports: -80 });
	});
});

describe("materialIOCsv", () => {
	it("writes a header and one line per material", () => {
		expect(materialIOCsv([io("RAT", 10, 500)])).toBe(
			"ticker,input,output,delta,value,weight,volume\nRAT,0,10,10,500,10,5"
		);
	});
});
