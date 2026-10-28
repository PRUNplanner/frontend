import { describe, it, expect } from "vitest";

// Engine
import {
	decodeChain,
	encodeChain,
	type IChainState,
} from "@/features/production_chain/engine/chainUrl";

describe("chain URL", () => {
	const state: IChainState = {
		input: {
			targets: [
				{ ticker: "DW", perDay: 100 },
				{ ticker: "RAT", perDay: 12.5 },
			],
			efficiency: 120,
			rawSource: "extract",
			byproducts: "sell",
			source: { H2O: "buy", C: "extract" },
			recipeId: { RAT: "FP#1xGRN 1xALG 1xNUT=>10xRAT" },
			planetId: { H2O: "ZV-307d" },
			bases: [
				{
					id: "A",
					name: "Food: 50%, fresh",
					planetId: "XH-668c",
					cogc: "auto",
				},
				{ id: "C", name: "", planetId: null, cogc: "AGRICULTURE" },
			],
			baseOf: { RAT: "A", VEG: "C" },
		},
		cx: "abc-123",
	};

	it("round-trips a chain", () => {
		expect(decodeChain(encodeChain(state))).toEqual(state);
	});

	it("leaves empty overrides and the CX out", () => {
		const query = encodeChain({
			input: {
				...state.input,
				source: {},
				recipeId: {},
				planetId: {},
				baseOf: {},
			},
			cx: undefined,
		});
		expect(Object.keys(query).sort()).toEqual([
			"bases",
			"byp",
			"eff",
			"raw",
			"t",
		]);
	});

	it("round-trips own production amounts", () => {
		const withHave: IChainState = {
			...state,
			input: { ...state.input, have: { AL: 480, C: 110.5, BTS: "all" } },
		};
		const query = encodeChain(withHave);
		expect(query.have).toBe("AL:480,C:110.5,BTS:all");
		expect(decodeChain(query)).toEqual(withHave);
	});

	it("rounds own production up to two decimals, so a link never leaves a sliver to make", () => {
		const query = encodeChain({
			...state,
			input: { ...state.input, have: { AL: 233.62146, C: 0.004, FE: 0.07 } },
		});
		expect(query.have).toBe("AL:233.63,C:0.01,FE:0.07");
	});

	it("drops broken have amounts, and opens without have= as before", () => {
		expect(
			decodeChain({ t: "DW:1", have: "AL:0,C:-3,FE:abc,al:5,O:all,W:12" })
				?.input.have
		).toEqual({ O: "all", W: 12 });
		expect(decodeChain({ t: "DW:1" })?.input).not.toHaveProperty("have");
	});

	it("returns null without targets", () => {
		expect(decodeChain({})).toBeNull();
		expect(decodeChain({ t: "DW:0,rat:5,XYZW:1" })).toBeNull();
	});

	it("falls back on broken values", () => {
		const decoded = decodeChain({
			t: ["DW:10"],
			eff: "abc",
			raw: "steal",
			byp: "burn",
			src: "H2O:teleport,C:make",
		})!;
		expect(decoded.input.efficiency).toBe(100);
		expect(decoded.input.rawSource).toBe("buy");
		expect(decoded.input.byproducts).toBe("cover");
		expect(decoded.input.source).toEqual({ C: "make" });
		expect(decoded.cx).toBeUndefined();
	});

	it("opens a spec 1 chain as one base A (AC 14)", () => {
		const decoded = decodeChain({ t: "DW:10", base: "DW:B" })!;
		expect(decoded.input.bases).toEqual([
			{ id: "A", name: "", planetId: null, cogc: "auto" },
		]);
		// a step in an unknown base falls back to the first
		expect(decoded.input.baseOf).toEqual({});
	});

	it("drops broken bases", () => {
		const decoded = decodeChain({
			t: "DW:10",
			bases: "A:x::warp,A:dup::auto,Z:no::auto,B:%E0%A4%A::auto,C:ok:PG-899b:none",
		})!;
		expect(decoded.input.bases).toEqual([
			{ id: "A", name: "x", planetId: null, cogc: "auto" },
			{ id: "C", name: "ok", planetId: "PG-899b", cogc: "none" },
		]);
	});
});
