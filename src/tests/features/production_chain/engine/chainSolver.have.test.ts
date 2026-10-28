import { describe, it, expect } from "vitest";

// Engine
import { solveChain } from "@/features/production_chain/engine/chainSolver";

// Fixtures
import {
	chainInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

const gross = (r: { perDay: number; covered: number; have: number }) =>
	r.perDay + r.covered + r.have;

describe("solveChain with own production (Have)", () => {
	const ctx = testContext();
	const plain = solveChain(chainInput([["RAT", 100]]), ctx);

	it("turns a fully covered material into a Have row and drops its inputs (AC 1)", () => {
		const r = solveChain(chainInput([["RAT", 100]], { have: { GRN: "all" } }), ctx);
		const grn = r.rows.GRN;
		expect(grn).toMatchObject({
			source: "have",
			perDay: 0,
			recipe: null,
			buildingTicker: null,
			base: null,
			buildings: 0,
			haveAvailable: null,
			cheaper: false,
			market: null,
		});
		expect(grn.have).toBeCloseTo(plain.rows.GRN.perDay, 6);
		expect(grn.unitCost).toBe(grn.price);
		expect(r.links.some((l) => l.consumer === "GRN")).toBe(false);
		// GRN's water is gone, NUT's stays
		expect(r.rows.H2O.perDay).toBeLessThan(plain.rows.H2O.perDay);
		expect(r.totals.built).toBeLessThan(plain.totals.built);
		expect(r.totals.construction).toBeLessThan(plain.totals.construction);
		expect(r.totals.area).toBeLessThan(plain.totals.area);
		expect(r.bases[0].materials).not.toContain("GRN");
	});

	it("drops rows nothing needs any more", () => {
		const r = solveChain(chainInput([["RAT", 100]], { have: { NUT: "all", MUS: "all" } }), ctx);
		// NS only feeds NUT and MUS
		expect(r.order).not.toContain("NS");
		expect(r.rows.NS).toBeUndefined();
		for (const t of r.order)
			expect(r.rows[t].target || gross(r.rows[t]) > 0).toBe(true);
		expect(r.links.every((l) => l.perDay > 0)).toBe(true);
	});

	it("makes the rest of a partly covered step, with its stage and recipe (AC 3)", () => {
		const r = solveChain(chainInput([["RAT", 100]], { have: { GRN: 4 } }), ctx);
		const grn = r.rows.GRN;
		expect(grn.source).toBe("make");
		expect(grn.recipe?.recipe_id).toBe(plain.rows.GRN.recipe?.recipe_id);
		expect(grn.have).toBeCloseTo(4, 6);
		expect(grn.haveAvailable).toBe(4);
		expect(grn.perDay).toBeCloseTo(plain.rows.GRN.perDay - 4, 6);
		expect(grn.buildings).toBeCloseTo(
			(plain.rows.GRN.buildings * grn.perDay) / plain.rows.GRN.perDay,
			6
		);
	});

	it("buys only what Have leaves of a bought input (AC 2)", () => {
		const lst = plain.rows.LST.perDay;
		const r = solveChain(chainInput([["RAT", 100]], { have: { LST: lst / 4 } }), ctx);
		expect(r.rows.LST.source).toBe("buy");
		expect(r.rows.LST.perDay).toBeCloseTo((lst * 3) / 4, 6);
		expect(r.totals.bought).toBeCloseTo(
			plain.totals.bought - (lst / 4) * r.rows.LST.price,
			6
		);
		expect(r.totals.own).toBeCloseTo((lst / 4) * r.rows.LST.price, 6);
		expect(r.totals.ownCount).toBe(1);
	});

	it("never uses Have for a target (AC 4)", () => {
		const r = solveChain(chainInput([["RAT", 100]], { have: { RAT: "all" } }), ctx);
		expect(r.rows.RAT).toMatchObject({
			source: "make",
			have: 0,
			haveAvailable: 0,
			perDay: 100,
		});
	});

	it("covers with byproducts before Have (AC 5)", () => {
		// with "all" first, byproducts would cover nothing
		const r = solveChain(chainInput([["GWS", 1]], { have: { SIO: "all", AL: 5 } }), ctx);
		for (const t of ["SIO", "AL"]) {
			const row = r.rows[t];
			const b = r.byproducts.find((x) => x.ticker === t)!;
			expect(row.covered).toBeGreaterThan(0);
			expect(row.covered).toBeCloseTo(b.used, 6);
		}
		expect(r.rows.SIO.source).toBe("have");
		expect(r.rows.SIO.perDay).toBe(0);
		expect(r.rows.AL.have).toBeCloseTo(5, 6);
		expect(r.rows.AL.source).toBe("make");
		// a step byproducts cover fully keeps no zero links
		expect(r.links.every((l) => l.perDay > 0)).toBe(true);
	});

	it("counts own production at the CX price in the profit (AC 6)", () => {
		const r = solveChain(chainInput([["RAT", 100]], { have: { GRN: "all", LST: 0.5 } }), ctx);
		const t = r.totals;
		const own = r.order.reduce((s, m) => s + r.rows[m].have * r.rows[m].price, 0);
		expect(t.own).toBeCloseTo(own, 6);
		expect(t.ownCount).toBe(2);
		expect(t.profit).toBeCloseTo(
			t.outputValue - t.bought - t.own - t.upkeep - t.wear,
			6
		);
		expect(r.warnings.cheaper).not.toContain("GRN");
	});

	it("solves as before without Have", () => {
		const r = solveChain(chainInput([["RAT", 100]], { have: {} }), ctx);
		expect(r.totals).toEqual(plain.totals);
		expect(r.totals.own).toBe(0);
		expect(r.order.every((t) => r.rows[t].have === 0)).toBe(true);
	});
});
