import { describe, expect, it } from "vitest";

import { hasOutputTwin } from "@/features/planning/recipeOutputs.util";

const recipe = (id: string, outputs: [string, number][]) => ({
	recipe_id: id,
	outputs: outputs.map(([material_ticker, material_amount]) => ({
		material_ticker,
		material_amount,
	})),
});

const RAT_A = recipe("FP#1xMUS 1xVEG 1xMAI=>10xRAT", [["RAT", 10]]);
const RAT_B = recipe("FP#1xBEA 1xNUT 1xGRN=>10xRAT", [["RAT", 10]]);
const DW = recipe("FP#10xH2O=>7xDW", [["DW", 7]]);
const MIX_A = recipe("X#A", [
	["COF", 1],
	["DW", 2],
]);
const MIX_B = recipe("X#B", [
	["DW", 3],
	["COF", 1],
]);

describe("hasOutputTwin", () => {
	it("is true when another recipe makes the same outputs", () => {
		expect(hasOutputTwin(RAT_A, [RAT_A, RAT_B, DW])).toBe(true);
		expect(hasOutputTwin(RAT_B, [RAT_A, RAT_B, DW])).toBe(true);
	});

	it("is false when the outputs are unique", () => {
		expect(hasOutputTwin(DW, [RAT_A, RAT_B, DW])).toBe(false);
		expect(hasOutputTwin(RAT_A, [RAT_A, DW])).toBe(false);
		expect(hasOutputTwin(RAT_A, [])).toBe(false);
	});

	it("compares the output tickers in any order", () => {
		expect(hasOutputTwin(MIX_A, [MIX_A, MIX_B])).toBe(true);
	});
});
