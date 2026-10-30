import { describe, it, expect } from "vitest";

import {
	ALL_PLANETS,
	buildPayload,
	changedScopes,
	planetsWithRules,
	setPlanetRules,
} from "@/features/exchanges/cxEdit.util";

// Types & Interfaces
import type { CXData } from "@/features/api/schemas/cxData.schemas";

const loaded: CXData = {
	cx_empire: [{ type: "BOTH", exchange: "NC1_30D" }],
	cx_planets: [
		{ planet: "A", preferences: [{ type: "BOTH", exchange: "AI1_7D" }] },
		// a planet no plan uses any more
		{ planet: "OLD", preferences: [{ type: "BUY", exchange: "IC1_ASK" }] },
	],
	ticker_empire: [
		{ type: "BUY", ticker: "RAT", value: 75 },
		{ type: "BOTH", ticker: "H2O", value: 9 },
	],
	ticker_planets: [
		{
			planet: "B",
			preferences: [{ type: "BOTH", ticker: "DW", value: 0 }],
		},
	],
};

describe("CX edit state", () => {
	it("counts no change for the loaded data, in any order", () => {
		expect(changedScopes(loaded, structuredClone(loaded))).toEqual([]);
		const reordered = structuredClone(loaded);
		reordered.ticker_empire.reverse();
		expect(changedScopes(loaded, reordered)).toEqual([]);
	});

	it("counts scopes whose rules differ", () => {
		let edit = structuredClone(loaded);
		edit.ticker_empire[0].value = 64.43;
		edit = setPlanetRules(edit, "A", "cx_planets", []);
		edit = setPlanetRules(edit, "C", "ticker_planets", [
			{ type: "SELL", ticker: "FE", value: 1 },
		]);
		expect(changedScopes(loaded, edit).sort()).toEqual(
			[ALL_PLANETS, "A", "C"].sort()
		);
	});

	it("lists planets with their own rules", () => {
		expect(planetsWithRules(loaded).sort()).toEqual(["A", "B", "OLD"]);
	});

	it("keeps planets without a plan in the payload (C2)", () => {
		const edit = setPlanetRules(
			structuredClone(loaded),
			"A",
			"cx_planets",
			[{ type: "BOTH", exchange: "CI1_30D" }]
		);
		const payload = buildPayload(edit);
		expect(payload.cx_planets.map((p) => p.planet).sort()).toEqual([
			"A",
			"OLD",
		]);
		expect(payload.ticker_planets).toEqual(loaded.ticker_planets);
	});

	it("leaves out emptied planet entries", () => {
		const edit = setPlanetRules(
			structuredClone(loaded),
			"B",
			"ticker_planets",
			[]
		);
		expect(buildPayload(edit).ticker_planets).toEqual([]);
	});
});
