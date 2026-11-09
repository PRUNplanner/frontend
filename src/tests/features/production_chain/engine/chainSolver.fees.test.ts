import { describe, it, expect } from "vitest";

// Engine
import {
	extractionCostParts,
	siteProductionFees,
	extractionUnitCost,
	extractorRate,
	recipeCost,
	solveChain,
} from "@/features/production_chain/engine/chainSolver";
import {
	productionFeePerRun,
	weightedProductionFee,
} from "@/features/planning/engine/fees";

// Fixtures
import {
	chainInput,
	FEES,
	FOOD_PLANET,
	testContext,
	withFees,
} from "@/tests/features/production_chain/chain.fixtures";

// Types & Interfaces
import type { IChainInput } from "@/features/production_chain/engine/chainSolver.types";

const ctx = testContext();
const DW = "FP#10xH2O 1xPG=>10xDW";

const onPlanet = (
	planetId: string | null,
	over: Partial<IChainInput> = {}
): IChainInput =>
	chainInput([["DW", 100]], {
		recipeId: { DW },
		// inputs bought: only the DW step runs on the base
		source: { H2O: "buy", PG: "buy" },
		bases: [{ id: "A", name: "", planetId, cogc: "auto", experts: {} }],
		...over,
	});

describe("production fees in the chain (AC 14)", () => {
	const fp = ctx.buildings.get("FP")!;
	const recipe = ctx.recipesByOutput
		.get("DW")!
		.find((r) => r.recipe_id === DW)!;
	// FP: 40 pioneers, so the pioneer fee; per run on base time, 10 DW a run
	const perUnit = productionFeePerRun(25, recipe.time_ms) / 10;

	it("adds the base planet's fee per run ÷ output to a made row", () => {
		expect(weightedProductionFee(fp, FEES)).toBe(25);
		const plain = solveChain(onPlanet(FOOD_PLANET), ctx).rows.DW;
		const fee = solveChain(
			onPlanet(FOOD_PLANET),
			withFees(ctx, [FOOD_PLANET])
		).rows.DW;

		expect(plain.costParts!.fees).toBe(0);
		expect(fee.costParts!.fees).toBeCloseTo(perUnit, 9);
		expect(fee.unitCost - plain.unitCost).toBeCloseTo(perUnit, 9);
		// the other parts don't move
		expect(fee.costParts!.inputs).toBe(plain.costParts!.inputs);
		expect(fee.costParts!.upkeepWear).toBe(plain.costParts!.upkeepWear);
		expect(fee.unitCost).toBeCloseTo(
			fee.costParts!.inputs +
				fee.costParts!.upkeepWear +
				fee.costParts!.fees,
			9
		);
	});

	it("doesn't scale the fee by efficiency", () => {
		const feeCtx = withFees(ctx, [FOOD_PLANET]);
		const at50 = solveChain(
			onPlanet(FOOD_PLANET, { efficiency: 50 }),
			feeCtx
		).rows.DW;
		expect(at50.costParts!.fees).toBeCloseTo(perUnit, 9);
	});

	it("charges nothing on a base without a planet or without the index", () => {
		const none = solveChain(onPlanet(null), withFees(ctx, [FOOD_PLANET]))
			.rows.DW;
		expect(none.costParts!.fees).toBe(0);
		const noIndex = solveChain(onPlanet(FOOD_PLANET), testContext(false))
			.rows.DW;
		expect(noIndex.costParts!.fees).toBe(0);
	});

	it("subtracts the day's fees from the chain's profit and payback", () => {
		const plain = solveChain(onPlanet(FOOD_PLANET), ctx);
		const fee = solveChain(
			onPlanet(FOOD_PLANET),
			withFees(ctx, [FOOD_PLANET])
		);
		const dw = fee.rows.DW;

		expect(plain.totals.fees).toBe(0);
		// 100 DW a day, each carrying the fee per run ÷ output
		expect(fee.totals.fees).toBeCloseTo(dw.costParts!.fees * dw.perDay, 9);
		// = buildings at 100 % × the weighted fee
		expect(fee.totals.fees).toBeCloseTo(dw.load * 25, 9);
		expect(fee.totals.profit).toBeCloseTo(
			plain.totals.profit - fee.totals.fees,
			9
		);
		expect(fee.totals.payback).toBeCloseTo(
			fee.totals.construction / fee.totals.profit,
			9
		);
	});

	it("charges each base's piece of a split step on its own planet", () => {
		const split = solveChain(
			onPlanet(FOOD_PLANET, {
				bases: [
					{
						id: "A",
						name: "",
						planetId: FOOD_PLANET,
						cogc: "auto",
						experts: {},
					},
					{
						id: "B",
						name: "",
						planetId: null,
						cogc: "auto",
						experts: {},
					},
				],
				baseOf: { DW: { A: 1, B: 1 } },
			}),
			withFees(ctx, [FOOD_PLANET])
		);
		const dw = split.rows.DW;

		expect(dw.shares.map((s) => s.share)).toEqual([0.5, 0.5]);
		// only A's half pays
		expect(split.totals.fees).toBeCloseTo(dw.load * 0.5 * 25, 9);
	});

	it("charges no fees in the totals without a planet", () => {
		const none = solveChain(onPlanet(null), withFees(ctx, [FOOD_PLANET]));
		expect(none.totals.fees).toBe(0);
	});

	it("keeps recipeCost's callers without fees unchanged", () => {
		const unit = (t: string) => ctx.prices.getPrice(t, "BUY");
		const plain = recipeCost(ctx, recipe, "DW", 1, unit);
		const fee = recipeCost(ctx, recipe, "DW", 1, unit, "both", FEES);
		expect(plain.parts.fees).toBe(0);
		expect(fee.unit - plain.unit).toBeCloseTo(perUnit, 9);
	});
});

describe("production fees on extraction (AC 14)", () => {
	const options = ctx.extraction!.get("H2O")!;
	const site = options.sites.find(
		(s) => s.planetId !== options.typical.planetId
	)!;
	const rig = ctx.buildings.get(site.buildingTicker)!;

	it("adds the site planet's fee per run ÷ units per run, not by efficiency", () => {
		const feeCtx = withFees(ctx, [site.planetId]);
		const plain = extractionCostParts(
			ctx,
			site,
			100,
			"both",
			siteProductionFees(ctx, site, false)
		);
		const fee = extractionCostParts(
			feeCtx,
			site,
			50,
			"both",
			siteProductionFees(feeCtx, site, false)
		);
		const expected = weightedProductionFee(rig, FEES) / extractorRate(site);
		expect(plain.fees).toBe(0);
		expect(fee.fees).toBeGreaterThan(0);
		expect(fee.fees).toBeCloseTo(expected, 9);
		expect(extractionUnitCost(feeCtx, site, 100, false)).toBeCloseTo(
			plain.upkeepWear + expected,
			9
		);
	});

	it("the picker's typical row pays no fees, even when its planet charges", () => {
		const typical = options.typical;
		const feeCtx = withFees(ctx, [typical.planetId]);

		expect(siteProductionFees(feeCtx, typical, true)).toBeNull();
		expect(extractionUnitCost(feeCtx, typical, 100, true)).toBe(
			extractionUnitCost(ctx, typical, 100, true)
		);
		expect(extractionUnitCost(feeCtx, typical, 100, false)).toBeGreaterThan(
			extractionUnitCost(feeCtx, typical, 100, true)
		);
	});

	it("costs a picked site with its planet's fee, the typical site without", () => {
		const input = chainInput([["H2O", 100]], {
			rawSource: "extract",
			planetId: { H2O: site.planetId },
		});
		const feeCtx = withFees(ctx, [site.planetId, options.typical.planetId]);
		const plain = solveChain(input, ctx).rows.H2O;
		const picked = solveChain(input, feeCtx).rows.H2O;
		expect(picked.typicalSite).toBe(false);
		expect(picked.costParts!.fees).toBeCloseTo(
			weightedProductionFee(rig, FEES) / extractorRate(site),
			9
		);
		expect(picked.unitCost - plain.unitCost).toBeCloseTo(
			picked.costParts!.fees,
			9
		);
		expect(picked.costParts!.upkeepWear).toBe(plain.costParts!.upkeepWear);

		const typical = solveChain(
			chainInput([["H2O", 100]], { rawSource: "extract" }),
			feeCtx
		).rows.H2O;
		expect(typical.typicalSite).toBe(true);
		expect(typical.costParts!.fees).toBe(0);
	});

	it("counts a picked site's fees in the totals, the typical site's not", () => {
		const feeCtx = withFees(ctx, [site.planetId, options.typical.planetId]);
		const picked = solveChain(
			chainInput([["H2O", 100]], {
				rawSource: "extract",
				planetId: { H2O: site.planetId },
			}),
			feeCtx
		);
		const h2o = picked.rows.H2O;
		expect(picked.totals.fees).toBeGreaterThan(0);
		expect(picked.totals.fees).toBeCloseTo(
			h2o.costParts!.fees * h2o.perDay,
			9
		);

		const typical = solveChain(
			chainInput([["H2O", 100]], { rawSource: "extract" }),
			feeCtx
		);
		expect(typical.totals.fees).toBe(0);
	});
});
