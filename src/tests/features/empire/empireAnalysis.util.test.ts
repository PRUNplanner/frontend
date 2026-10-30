import { describe, it, expect } from "vitest";

import {
	empireSplitParts,
	materialButterfly,
	revenueSplitRows,
	splitShares,
	sumSplitParts,
} from "@/features/empire/empireAnalysis.util";

// Types & Interfaces
import type {
	IEmpireMaterialIO,
	IEmpirePlanListData,
} from "@/features/empire/empire.types";

const plan = (
	uuid: string,
	profit: number,
	inputs = 100,
	workforce = 50,
	degradation = 10
): IEmpirePlanListData => ({
	uuid,
	name: uuid,
	planet: "OT-580b",
	permits: 1,
	cogc: "---",
	revenue: inputs + workforce + degradation + profit,
	inputs,
	workforce,
	degradation,
	profit,
});

const sumOfShares = (s: ReturnType<typeof splitShares>) =>
	s.inputs + s.workforce + s.degradation + s.profit + s.uncovered;

describe("revenueSplitRows", () => {
	// 14 profitable plans (profit 1..14) and 2 loss-making ones
	const plans = [
		...Array.from({ length: 14 }, (_, i) => plan(`p${i + 1}`, i + 1)),
		plan("loss-small", -5),
		plan("loss-big", -50),
	];

	it("shows the top 10 by profit, every loss and one Other row", () => {
		const rows = revenueSplitRows(plans);
		expect(rows.top.map((p) => p.uuid)).toEqual(
			Array.from({ length: 10 }, (_, i) => `p${14 - i}`)
		);
		expect(rows.losses.map((p) => p.uuid)).toEqual([
			"loss-small",
			"loss-big",
		]);
		expect(rows.rest.map((p) => p.uuid)).toEqual(["p4", "p3", "p2", "p1"]);
	});

	it("sums the rest into Other", () => {
		const { other } = revenueSplitRows(plans);
		expect(other).toEqual({
			revenue: 4 * 160 + 10,
			inputs: 400,
			workforce: 200,
			degradation: 40,
			profit: 10,
		});
	});

	it("never folds a loss-making plan into Other", () => {
		const many = [
			...plans,
			...Array.from({ length: 12 }, (_, i) => plan(`l${i}`, -1 - i)),
		];
		const rows = revenueSplitRows(many);
		expect(rows.losses).toHaveLength(14);
		expect(rows.rest.every((p) => p.profit >= 0)).toBe(true);
	});

	it("has no Other row with 10 profitable plans or fewer", () => {
		const rows = revenueSplitRows(plans.slice(4));
		expect(rows.top).toHaveLength(10);
		expect(rows.other).toBeUndefined();
	});
});

describe("splitShares", () => {
	it("splits a profitable plan's revenue, adding up to 100", () => {
		const s = splitShares(plan("a", 40));
		expect(s.inputs).toBeCloseTo(50);
		expect(s.profit).toBeCloseTo(20);
		expect(s.uncovered).toBe(0);
		expect(s.margin).toBeCloseTo(20);
		expect(sumOfShares(s)).toBeCloseTo(100, 1);
	});

	it("splits a loss-making plan's cost and hatches what revenue misses", () => {
		const s = splitShares(plan("a", -40));
		expect(s.profit).toBe(0);
		expect(s.uncovered).toBeCloseTo(25);
		expect(s.margin).toBeCloseTo(-33.33, 1);
		expect(s.inputs + s.workforce + s.degradation).toBeCloseTo(100, 1);
	});

	it("is empty without revenue or cost", () => {
		const s = splitShares(plan("a", 0, 0, 0, 0));
		expect(sumOfShares(s)).toBe(0);
		expect(s.margin).toBeNaN();
	});
});

describe("empireSplitParts", () => {
	const plans = [plan("a", 200, 300, 100, 20), plan("b", -10, 60, 20, 10)];

	it("matches the KPIs and adds up to 100 %", () => {
		// netted: 50 of the inputs were traded between the plans
		const overview = {
			totalRevenue: 650,
			totalCost: 460,
			totalProfit: 190,
			totalAreaUsed: 0,
		};
		const parts = empireSplitParts(overview, plans);
		expect(parts.degradation).toBeCloseTo(30);
		expect(parts.inputs + parts.workforce).toBeCloseTo(430);
		expect(parts.workforce / parts.inputs).toBeCloseTo(120 / 360);
		expect(sumOfShares(splitShares(parts))).toBeCloseTo(100, 1);
		expect(splitShares(parts).profit).toBeCloseTo((190 / 650) * 100);
	});

	it("adds up to 100 % for a loss-making empire", () => {
		const overview = {
			totalRevenue: 100,
			totalCost: 460,
			totalProfit: -360,
			totalAreaUsed: 0,
		};
		const s = splitShares(empireSplitParts(overview, plans));
		expect(s.inputs + s.workforce + s.degradation).toBeCloseTo(100, 1);
		expect(s.uncovered).toBeCloseTo((360 / 460) * 100);
	});

	it("sums the plans", () => {
		expect(sumSplitParts(plans).profit).toBe(190);
	});
});

describe("materialButterfly", () => {
	const io = (
		ticker: string,
		delta: number,
		deltaPrice: number
	): IEmpireMaterialIO => ({
		ticker,
		input: 0,
		output: 0,
		delta,
		deltaPrice,
		inputPlanets: [],
		outputPlanets: [],
	});
	const data = [
		...Array.from({ length: 12 }, (_, i) =>
			io(`M${i}`, i % 2 ? i : -i, (i % 2 ? 1 : -1) * i * 100)
		),
		io("ZERO", 5, 0),
	];

	it("keeps the top 10 by |¢ per day|, bought negative, sold positive", () => {
		const rows = materialButterfly(data, "price");
		expect(rows).toHaveLength(10);
		expect(rows[0]).toEqual({ ticker: "M11", value: 1100 });
		expect(rows[1]).toEqual({ ticker: "M10", value: -1000 });
		expect(rows.some((r) => r.ticker === "ZERO")).toBe(false);
	});

	it("shows units per day for the same materials", () => {
		const price = materialButterfly(data, "price");
		const amount = materialButterfly(data, "amount");
		expect(amount.map((r) => r.ticker)).toEqual(price.map((r) => r.ticker));
		expect(amount[1].value).toBe(-10);
	});

	it("leaves its input alone", () => {
		const copy = [...data];
		materialButterfly(data, "price");
		expect(data).toEqual(copy);
	});
});
