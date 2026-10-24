import { describe, it, expect } from "vitest";

// Engine
import {
	defaultRecipe,
	recipeEffects,
	solveChain,
} from "@/features/production_chain/engine/chainSolver";

// Fixtures
import {
	chainInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

const RAT_NUT = "FP#1xGRN 1xALG 1xNUT=>10xRAT";

describe("solveChain", () => {
	const ctx = testContext();

	it("counts buildings per day and shares a building type (AC 1)", () => {
		const rat = solveChain(
			chainInput([["RAT", 100]], { recipeId: { RAT: RAT_NUT } }),
			ctx
		);
		expect(rat.rows.RAT.buildingTicker).toBe("FP");
		expect(rat.rows.RAT.buildings).toBeCloseTo(2.5, 6);

		const both = solveChain(
			chainInput(
				[
					["DW", 100],
					["RAT", 100],
				],
				{ recipeId: { RAT: RAT_NUT } }
			),
			ctx
		);
		const fp = both.buildingTypes.find((b) => b.ticker === "FP")!;
		expect(fp.exact).toBeCloseTo(4.5, 6);
		expect(fp.built).toBe(5);
		expect(fp.materials.sort()).toEqual(["DW", "RAT"]);
	});

	it("adds up shared intermediates, each link keeps its own amount (AC 2)", () => {
		const r = solveChain(
			chainInput([
				["DW", 100],
				["RAT", 100],
			]),
			ctx
		);
		const h2oLinks = r.links.filter((l) => l.input === "H2O");
		expect(h2oLinks.length).toBeGreaterThan(1);
		const sum = h2oLinks.reduce((s, l) => s + l.perDay, 0);
		expect(r.rows.H2O.perDay).toBeCloseTo(sum, 6);
		expect(new Set(h2oLinks.map((l) => l.perDay)).size).toBeGreaterThan(1);
		expect(r.rows.H2O.users.length).toBe(h2oLinks.length);
		// each material once
		expect(new Set(r.order).size).toBe(r.order.length);
	});

	it("takes the footprint from built buildings, not materials (AC 3)", () => {
		const r = solveChain(chainInput([["RAT", 100]]), ctx);
		const built = r.buildingTypes.reduce((s, b) => s + b.built, 0);
		expect(r.totals.built).toBe(built);
		const fp = ctx.buildings.get("FP")!;
		const fpBuilt = r.buildingTypes.find((b) => b.ticker === "FP")!.built;
		expect(r.totals.workforce.pioneer).toBeGreaterThanOrEqual(
			fp.pioneers * fpBuilt
		);
		const expertise = Object.values(r.totals.expertise).reduce(
			(a, b) => a + b,
			0
		);
		expect(expertise).toBe(built);
		expect(r.totals.habs.length).toBeGreaterThan(0);
		expect(r.totals.habArea).toBeGreaterThan(0);
		expect(r.totals.area).toBeGreaterThan(r.totals.habArea);
		expect(r.totals.construction).toBeGreaterThan(0);
	});

	it("solves GWS fast (AC 4)", () => {
		solveChain(chainInput([["GWS", 1]]), ctx);
		const start = performance.now();
		const r = solveChain(chainInput([["GWS", 1]]), ctx);
		expect(performance.now() - start).toBeLessThan(50);
		expect(r.order.length).toBeGreaterThan(50);
		expect(r.rows.GWS.target).toBe(true);
	});

	it("defaults to single-output recipes (AC 5)", () => {
		const fe = defaultRecipe(ctx, "FE", 1)!;
		expect(fe.startsWith("AML")).toBe(false);
		expect(ctx.recipesByOutput.get("FE")!.find((r) => r.recipe_id === fe)!
			.outputs.length).toBe(1);

		const c = defaultRecipe(ctx, "C", 1);
		// inputs bought: the chain cost is the local cost the default uses
		const input = chainInput([["C", 10]], {
			source: { GRN: "buy", HCP: "buy", MAI: "buy" },
		});
		const r = solveChain(input, ctx);
		expect(r.rows.C.recipe!.recipe_id).toBe(c);
		// no other single-output C recipe is cheaper
		for (const option of recipeEffects(input, ctx, "C"))
			if (option.recipe.outputs.length === 1)
				expect(option.unitCost).toBeGreaterThanOrEqual(
					r.rows.C.unitCost - 1e-9
				);
	});

	it("buys raw resources by default, extracts at the typical planet (AC 6)", () => {
		const buy = solveChain(chainInput([["DW", 100]]), ctx);
		expect(buy.rows.H2O.source).toBe("buy");
		expect(buy.rows.H2O.buildings).toBe(0);

		const ext = solveChain(chainInput([["DW", 100]], { rawSource: "extract" }), ctx);
		const h2o = ext.rows.H2O;
		const typical = ctx.extraction!.get("H2O")!.typical;
		expect(h2o.source).toBe("extract");
		expect(h2o.typicalSite).toBe(true);
		expect(h2o.site).toEqual(typical);
		expect(h2o.buildingTicker).toBe(typical.buildingTicker);
		expect(h2o.buildings).toBeCloseTo(h2o.perDay / typical.dailyExtraction, 1);

		const one = solveChain(
			chainInput([["DW", 100]], { source: { H2O: "extract" } }),
			ctx
		);
		expect(one.rows.H2O.source).toBe("extract");

		// a picked planet changes extractor, rate and buildings
		const other = ctx
			.extraction!.get("H2O")!
			.sites.find((s) => s.buildingTicker !== typical.buildingTicker)!;
		const picked = solveChain(
			chainInput([["DW", 100]], {
				source: { H2O: "extract" },
				planetId: { H2O: other.planetId },
			}),
			ctx
		);
		expect(picked.rows.H2O.buildingTicker).toBe(other.buildingTicker);
		expect(picked.rows.H2O.typicalSite).toBe(false);
	});

	it("extracting without the planet index is pending", () => {
		const r = solveChain(
			chainInput([["DW", 100]], { rawSource: "extract" }),
			testContext(false)
		);
		expect(r.rows.H2O.pending).toBe(true);
		expect(r.rows.H2O.buildings).toBe(0);
	});

	it("covers demand with byproducts (AC 8)", () => {
		const targets: [string, number][] = [
			["NA", 100],
			["CL", 100],
		];
		const chp = (mode: "cover" | "sell") =>
			solveChain(chainInput(targets, { byproducts: mode }), ctx)
				.buildingTypes.find((b) => b.ticker === "CHP")!.exact;
		expect(chp("cover")).toBeLessThan(chp("sell"));

		const cover = solveChain(chainInput(targets), ctx);
		const na = cover.byproducts.find((b) => b.ticker === "NA")!;
		expect(na.produced).toBeCloseTo(na.used + na.sold, 6);
		expect(na.used).toBeGreaterThan(0);

		const sell = solveChain(chainInput(targets, { byproducts: "sell" }), ctx);
		expect(sell.byproducts.every((b) => b.used === 0)).toBe(true);
		expect(sell.totals.byproductsValue).toBeGreaterThan(0);
	});

	it("never gives a joint output a negative unit cost (AC 9)", () => {
		const r = solveChain(
			chainInput([
				["NA", 100],
				["CL", 100],
				["TA", 10],
			]),
			ctx
		);
		for (const t of r.order) expect(r.rows[t].unitCost).toBeGreaterThanOrEqual(0);
		const parts = r.rows.CL.costParts!;
		expect(parts.share).toBeGreaterThan(0);
		expect(parts.share).toBeLessThan(1);
	});

	it("flags cheaper-to-buy and thin markets", () => {
		const r = solveChain(chainInput([["GWS", 1]]), ctx);
		for (const t of r.warnings.cheaper) {
			const row = r.rows[t];
			expect(row.source).not.toBe("buy");
			expect(row.target).toBe(false);
			expect(row.unitCost).toBeGreaterThan(row.price);
		}
		for (const t of r.warnings.thin) {
			expect(r.rows[t].source).toBe("buy");
			expect(r.rows[t].market!.level).not.toBeNull();
		}
		expect(r.warnings.cheaper.length + r.warnings.thin.length).toBeGreaterThan(0);

		// buying the cheaper ones clears that warning
		const source = Object.fromEntries(
			r.warnings.cheaper.map((t) => [t, "buy" as const])
		);
		const bought = solveChain(chainInput([["GWS", 1]], { source }), ctx);
		for (const t of r.warnings.cheaper)
			expect(bought.rows[t].source).toBe("buy");
	});

	it("adds up the totals", () => {
		const r = solveChain(
			chainInput([
				["DW", 100],
				["RAT", 100],
				["OVE", 50],
			]),
			ctx
		);
		const t = r.totals;
		expect(t.profit).toBeCloseTo(t.outputValue - t.bought - t.upkeep - t.wear, 6);
		expect(t.wear).toBeCloseTo(t.construction / 180, 6);
		expect(t.outputValue).toBeCloseTo(t.targetsValue + t.byproductsValue, 6);
		const bought = r.order
			.map((m) => r.rows[m])
			.filter((row) => row.source === "buy");
		expect(t.bought).toBeCloseTo(
			bought.reduce((s, row) => s + row.perDay * row.price, 0),
			6
		);
		expect(t.payback).toBe(t.profit > 0 ? t.construction / t.profit : null);
		expect(r.rows.DW.target).toBe(true);
		expect(r.rows.H2O.users).toContain("DW");
	});

	it("efficiency scales buildings", () => {
		const full = solveChain(chainInput([["RAT", 100]], { recipeId: { RAT: RAT_NUT } }), ctx);
		const half = solveChain(
			chainInput([["RAT", 100]], { recipeId: { RAT: RAT_NUT }, efficiency: 50 }),
			ctx
		);
		expect(half.rows.RAT.buildings).toBeCloseTo(full.rows.RAT.buildings * 2, 6);
	});

	it("never buys a target and ignores invalid overrides", () => {
		const r = solveChain(
			chainInput([["RAT", 100]], {
				source: { RAT: "buy", GRN: "extract" },
				recipeId: { RAT: "nope" },
			}),
			ctx
		);
		expect(r.rows.RAT.source).toBe("make");
		expect(r.rows.RAT.recipe!.recipe_id).toBe(r.rows.RAT.defaultRecipeId);
		expect(r.rows.GRN.source).toBe("make");
	});

	it("returns an empty chain without targets", () => {
		const r = solveChain(chainInput([]), ctx);
		expect(r.order).toEqual([]);
		expect(r.totals.profit).toBe(0);
		expect(r.totals.habs).toEqual([]);
	});
});

describe("recipeEffects", () => {
	const ctx = testContext();

	it("re-solves each option with its effect (AC 10)", () => {
		const input = chainInput([["RAT", 100]]);
		const base = solveChain(input, ctx);
		const options = recipeEffects(input, ctx, "RAT", base);
		expect(options.length).toBe(ctx.recipesByOutput.get("RAT")!.length);
		expect(options[0].inUse).toBe(true);
		expect(options[0].deltaProfit).toBe(0);
		for (let i = 2; i < options.length; i++)
			expect(options[i - 1].deltaProfit).toBeGreaterThanOrEqual(
				options[i].deltaProfit
			);

		const pick = options[1];
		const picked = solveChain(
			chainInput([["RAT", 100]], {
				recipeId: { RAT: pick.recipe.recipe_id },
			}),
			ctx
		);
		expect(picked.totals.profit - base.totals.profit).toBeCloseTo(
			pick.deltaProfit,
			6
		);
		expect(picked.totals.built - base.totals.built).toBe(pick.deltaBuilt);
	});
});
