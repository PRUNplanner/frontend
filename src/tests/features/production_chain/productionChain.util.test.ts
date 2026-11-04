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
		expect(list.groups[0].items.map((i) => i.ticker).sort()).toEqual(
			bought.sort()
		);
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
		const csv = chainCsv(
			result,
			["A", "B", "C", "D", "E", "F", "G", "H"],
			(s) => s,
			"nothing"
		);
		const lines = csv.split("\n");
		expect(lines[0]).toBe("A,B,C,D,E,F,G,H");
		expect(lines.length).toBe(result.order.length + 1);
		expect(lines[1].startsWith(result.order[result.order.length - 1])).toBe(
			true
		);
		expect(csv).toContain("buy");
	});

	it("keeps the CSV bytes, quoting cells with a comma or quote", () => {
		expect(chainCsv(result, ["A,1", 'B"', "C"], (s) => s, "nothing"))
			.toMatchInlineSnapshot(`
			""A,1","B""",C
			OVE,50.0000,make,50 PE + 1 RCO → 20 OVE,BMP,0.7500,74.93,122.04,0.0000
			RCO,2.5000,make,2 H2O → 1 RCO,FRM,1.5000,667.57,1408.68,0.0000
			PE,125.0000,make,1 C + 2 H → 200 PE,BMP,0.1750,5.45,11.08,0.0000
			RAT,100.0000,make,1 GRN + 1 NUT + 1 MUS → 10 RAT,FP,2.5000,62.35,163.22,0.0000
			MUS,10.0000,make,4 NS → 12 MUS,HYF,0.4167,168.90,293.63,0.0000
			NS,3.3333,make,1 LST + 2 H2O + 2 N → 4 NS,CHP,0.1667,259.72,399.73,0.0000
			N,1.6667,buy,,,0.0000,160.18,160.18,0.0000
			LST,0.8333,buy,,,0.0000,150.85,150.85,0.0000
			NUT,10.0000,make,1 H2O → 12 NUT,FRM,1.2500,123.37,366.84,0.0000
			GRN,10.0000,make,1 H2O → 4 GRN,FRM,1.2500,131.22,408.23,0.0000
			DW,100.0000,make,10 H2O + 1 PG → 10 DW,FP,2.0000,65.10,112.73,0.0000
			PG,10.0000,make,1 C + 1 MG + 1 H → 50 PG,POL,0.0700,19.70,47.86,0.0000
			H,1.4500,buy,,,0.0000,111.91,111.91,0.0000
			MG,0.2000,make,1 MGS → 6 MG,BMP,0.0040,72.91,118.58,0.0000
			MGS,0.0333,buy,,,0.0000,213.99,213.99,0.0000
			C,0.8250,make,4 HCP → 4 C,INC,0.2062,344.23,971.11,0.0000
			HCP,0.8250,make,2 H2O → 4 HCP,FRM,0.1031,143.00,408.13,0.0000
			H2O,110.4125,buy,,,0.0000,47.13,47.13,0.0000"
		`);
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
		expect(formatShare(Infinity)).toBe("—");
		expect(formatShare(-0.05)).toBe("-5.0 %");
		expect(formatShare(0.0999)).toBe("10.0 %");
		expect(formatShare(0.1)).toBe("10 %");
		expect(formatShare(0)).toBe("0.0 %");
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
