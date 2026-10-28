import { describe, it, expect } from "vitest";

// Util
import {
	buyList,
	chainCsv,
	formatMoney,
	formatQty,
	formatShare,
	recipeLabel,
} from "@/features/production_chain/productionChain.util";
import { solveChain } from "@/features/production_chain/engine/chainSolver";

import messages from "@/locales/en_US/production_chains.json";

// Fixtures
import {
	chainInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

describe("productionChain.util", () => {
	const ctx = testContext();
	const result = solveChain(
		chainInput([
			["DW", 100],
			["RAT", 100],
			["OVE", 50],
		]),
		ctx
	);

	it("buys whole units of the bought rows for n days (AC 13)", () => {
		const list = buyList(result, ctx.materials, 10);
		const bought = result.order.filter(
			(t) => result.rows[t].source === "buy" && result.rows[t].perDay > 0
		);
		expect(list.groups[0].items.map((i) => i.ticker).sort()).toEqual(bought.sort());
		for (const i of list.groups[0].items) {
			const row = result.rows[i.ticker];
			const m = ctx.materials.get(i.ticker)!;
			expect(i.units).toBe(Math.ceil(row.perDay * 10 - 1e-9));
			expect(i.weight).toBeCloseTo(i.units * m.weight, 9);
			expect(i.volume).toBeCloseTo(i.units * m.volume, 9);
			expect(i.cost).toBeCloseTo(i.units * row.price, 9);
		}
		expect(list.cost).toBeCloseTo(
			list.groups[0].items.reduce((s, i) => s + i.cost, 0),
			9
		);
		const dw = ctx.materials.get("DW")!;
		expect(list.targetsWeight).toBeGreaterThan(100 * 10 * dw.weight);
	});

	it("writes the steps as CSV, targets first", () => {
		const csv = chainCsv(result, ["A", "B", "C", "D", "E", "F", "G", "H"], (s) => s, "nothing");
		const lines = csv.split("\n");
		expect(lines[0]).toBe("A,B,C,D,E,F,G,H");
		expect(lines.length).toBe(result.order.length + 1);
		expect(lines[1].startsWith(result.order[result.order.length - 1])).toBe(true);
		expect(csv).toContain("buy");
	});

	it("counts the Buy list and the CSV with own production (AC 2)", () => {
		const had = solveChain(
			chainInput(
				[
					["DW", 100],
					["RAT", 100],
					["OVE", 50],
				],
				{ have: { H2O: 100, GRN: "all" } }
			),
			ctx
		);
		const h2o = buyList(had, ctx.materials, 1).groups[0].items.find(
			(i) => i.ticker === "H2O"
		)!;
		// only the bought share
		expect(h2o.units).toBe(Math.ceil(had.rows.H2O.perDay - 1e-9));
		expect(had.rows.H2O.have).toBe(100);
		const csv = chainCsv(had, Array(9).fill("x"), (s) => s, "nothing");
		const grn = csv.split("\n").find((l) => l.startsWith("GRN,"))!;
		expect(grn.split(",")[2]).toBe("have");
		expect(Number(grn.split(",")[8])).toBeCloseTo(had.rows.GRN.have, 3);
	});

	it("has a source label for every row source", () => {
		for (const source of ["make", "buy", "extract", "have"])
			expect(messages.table).toHaveProperty(source);
	});

	it("formats numbers", () => {
		expect(formatQty(117.2)).toBe("117");
		expect(formatQty(10.04)).toBe("10.0");
		expect(formatQty(0.833)).toBe("0.83");
		expect(formatMoney(918_500)).toBe("918.5k");
		expect(formatMoney(6_200_000)).toBe("6.20M");
		expect(formatMoney(7796.2)).toBe("7,796");
		expect(formatShare(0.45)).toBe("45 %");
		expect(formatShare(0.002)).toBe("0.2 %");
		expect(formatShare(NaN)).toBe("—");
		expect(
			recipeLabel(
				{
					recipe_id: "x",
					recipe_name: "x",
					building_ticker: "SE",
					time_ms: 1,
					inputs: [],
					outputs: [{ material_ticker: "DV", material_amount: 1 }],
				},
				"nothing"
			)
		).toBe("nothing → 1 DV");
	});
});

describe("productionChain.util edge cases", () => {
	it("weighs nothing for unknown materials and quotes CSV cells", () => {
		const ctx = testContext();
		const result = solveChain(chainInput([["DW", 10]]), ctx);
		const list = buyList(result, new Map(), 3);
		expect(list.groups[0].items.length).toBeGreaterThan(0);
		expect(list.weight).toBe(0);
		expect(list.targetsVolume).toBe(0);

		const csv = chainCsv(result, ['Per "day"', "a,b"], () => "x", "-");
		expect(csv.split("\n")[0]).toBe('"Per ""day""","a,b"');
	});
});
