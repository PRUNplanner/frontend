import { describe, it, expect } from "vitest";

// Engine
import {
	defaultRecipe,
	extractionUnitCost,
	recipeEffects,
	solveChain,
} from "@/features/production_chain/engine/chainSolver";
import { layoutChain } from "@/features/production_chain/engine/chainLayout";
import { createPriceBook } from "@/features/cx/priceBook";

// Types & Interfaces
import type {
	Building,
	Exchange,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import type { IChainContext } from "@/features/production_chain/engine/chainSolver.types";

// Fixtures
import { chainInput } from "@/tests/features/production_chain/chain.fixtures";

const recipe = (
	building: string,
	inputs: [string, number][],
	outputs: [string, number][],
	hours = 24
): Recipe => ({
	recipe_id: `${building}#${inputs.map(([t, a]) => `${a}x${t}`).join(" ")}=>${outputs.map(([t, a]) => `${a}x${t}`).join(" ")}`,
	recipe_name: "",
	building_ticker: building,
	time_ms: hours * 3_600_000,
	inputs: inputs.map(([t, a]) => ({ material_ticker: t, material_amount: a })),
	outputs: outputs.map(([t, a]) => ({ material_ticker: t, material_amount: a })),
});

const BLD = {
	building_ticker: "BLD",
	building_name: "Test",
	expertise: "CHEMISTRY",
	pioneers: 10,
	settlers: 0,
	technicians: 0,
	engineers: 0,
	scientists: 0,
	area_cost: 10,
	costs: [{ material_ticker: "X", material_amount: 1 }],
	habitations: null,
	building_type: "PRODUCTION",
} as unknown as Building;

/**
 * A tiny world: A and B make each other (a loop), C and D come out of one
 * recipe with no prices, E's building is unknown, no habs, no exchanges
 */
function edgeContext(): IChainContext {
	const recipes = [
		recipe("BLD", [["B", 1]], [["A", 1]]),
		recipe("BLD", [["A", 1]], [["B", 1]]),
		recipe("BLD", [], [["C", 1], ["D", 1]]),
		recipe("ZZZ", [], [["E", 1]]),
	];
	const byOutput = new Map<string, Recipe[]>();
	for (const r of recipes)
		for (const o of r.outputs)
			byOutput.set(o.material_ticker, [
				...(byOutput.get(o.material_ticker) ?? []),
				r,
			]);
	const getExchange = (id: string): Exchange => {
		throw new Error(`no ${id}`);
	};
	return {
		recipesByOutput: byOutput,
		buildings: new Map([["BLD", BLD]]),
		materials: new Map(),
		prices: createPriceBook(undefined, undefined, getExchange),
		getExchange,
		resources: new Set(),
	};
}

describe("solveChain edge cases", () => {
	const ctx = edgeContext();

	it("stops a recipe loop at the repeated material and reports it", () => {
		const r = solveChain(chainInput([["A", 10]]), ctx);
		expect(r.warnings.cycles).toEqual(["A"]);
		expect(r.order).toEqual(["B", "A"]);
		// B's way back into A is left out
		expect(r.links).toEqual([{ input: "B", consumer: "A", perDay: 10 }]);
		expect(r.rows.B.perDay).toBe(10);
	});

	it("shares a joint output's cost by quantity without prices", () => {
		const r = solveChain(chainInput([["C", 5]]), ctx);
		expect(r.rows.C.costParts!.share).toBe(0.5);
		expect(r.rows.C.unitCost).toBe(0);
		expect(r.byproducts).toMatchObject([
			{ ticker: "D", produced: 5, used: 0, sold: 5, from: ["C"] },
		]);
		// sold without trades: red
		expect(r.byproducts[0].market).toMatchObject({
			sharePct: null,
			level: "red",
		});
	});

	it("counts an unknown building as free, with no expertise", () => {
		const r = solveChain(chainInput([["E", 24]]), ctx);
		const zzz = r.buildingTypes.find((b) => b.ticker === "ZZZ")!;
		expect(zzz).toMatchObject({ exact: 24, built: 24, expertise: null });
		expect(r.totals.construction).toBe(0);
		expect(r.totals.area).toBe(0);
		expect(r.totals.habs).toEqual([]);
	});

	it("houses workers without hab buildings and skips empty targets", () => {
		const r = solveChain(
			chainInput([
				["A", 1],
				["Q", 0],
			]),
			ctx
		);
		expect(r.rows.Q).toBeUndefined();
		// A and B each take one BLD a day
		expect(r.totals.workforce.pioneer).toBe(20);
		expect(r.totals.expertise).toEqual({ CHEMISTRY: 2 });
		// unknown habs add no area
		expect(r.totals.habArea).toBe(0);
		expect(layoutChain(r).stages).toBe(2);
	});

	it("has no default recipe or options without recipes", () => {
		expect(defaultRecipe(ctx, "NOPE", 1)).toBeNull();
		expect(recipeEffects(chainInput([["A", 1]]), ctx, "NOPE")).toEqual([]);
	});

	it("costs nothing to extract without a rate or a known extractor", () => {
		const site = {
			planetId: "P",
			planetName: "P",
			dailyExtraction: 0,
			buildingTicker: "RIG",
		};
		expect(extractionUnitCost(ctx, site, 100)).toBe(0);
		expect(
			extractionUnitCost(
				ctx,
				{ ...site, dailyExtraction: 10, buildingTicker: "XYZ" },
				100
			)
		).toBe(0);
	});
});
