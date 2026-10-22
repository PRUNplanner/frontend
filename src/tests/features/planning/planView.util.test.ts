import { describe, it, expect } from "vitest";

import {
	cogcShare,
	foldedPanes,
	materialIOCsv,
	materialIOTotals,
	type PlanTool,
} from "@/features/planning/planView.util";
import type {
	IMaterialIO,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";

const building = (
	name: string,
	dailyRevenue: number,
	cogc: boolean
): IProductionBuilding =>
	({
		name,
		dailyRevenue,
		efficiencyElements: cogc
			? [{ efficiencyType: "COGC", value: 1.25 }]
			: [{ efficiencyType: "WORKFORCE", value: 1 }],
	}) as IProductionBuilding;

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
	it("keeps both panes open on the production list", () => {
		expect(foldedPanes(null)).toStrictEqual({ base: false, io: false });
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

describe("cogcShare", () => {
	it("sums the boosted buildings' revenue share", () => {
		expect(
			cogcShare([
				building("EXT", 300, true),
				building("RIG", 100, true),
				building("FP", 600, false),
			])
		).toStrictEqual({ tickers: ["EXT", "RIG"], share: 0.4 });
	});

	it("ignores losses and has no share without revenue", () => {
		expect(cogcShare([building("EXT", -50, true)])).toStrictEqual({
			tickers: ["EXT"],
			share: 0,
		});
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
