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
		},
		cx: "abc-123",
	};

	it("round-trips a chain", () => {
		expect(decodeChain(encodeChain(state))).toEqual(state);
	});

	it("leaves empty overrides and the CX out", () => {
		const query = encodeChain({
			input: { ...state.input, source: {}, recipeId: {}, planetId: {} },
			cx: undefined,
		});
		expect(Object.keys(query).sort()).toEqual(["byp", "eff", "raw", "t"]);
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
});
