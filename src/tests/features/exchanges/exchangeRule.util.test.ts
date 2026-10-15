import { describe, it, expect } from "vitest";

import {
	basesFor,
	presetAverage,
	presetExchange,
	presetTradeNow,
	readRule,
	switchMode,
	toOption,
	writeRule,
	type IExchangeRuleState,
} from "@/features/exchanges/exchangeRule.util";

// Types & Interfaces
import type { CXDataExchangeOption } from "@/features/api/schemas/cxData.schemas";

const valid = (options: CXDataExchangeOption[]) => {
	const types = options.map((o) => o.type);
	return !(types.includes("BOTH") && types.length > 1);
};

describe("exchange rule controls", () => {
	it("reads and writes every stored shape", () => {
		const shapes: CXDataExchangeOption[][] = [
			[],
			[{ type: "BOTH", exchange: "NC1_30D" }],
			[{ type: "BUY", exchange: "NC1_ASK" }],
			[{ type: "SELL", exchange: "IC1_BID" }],
			[
				{ type: "BUY", exchange: "NC1_ASK" },
				{ type: "SELL", exchange: "NC1_BID" },
			],
		];
		for (const shape of shapes) {
			expect(writeRule(readRule(shape, true))).toEqual(shape);
			expect(writeRule(readRule(shape, false))).toEqual(shape);
		}
		expect(readRule([], true).mode).toBe("inherit");
		expect(readRule([], false).mode).toBe("same");
	});

	it("never writes BOTH together with BUY or SELL", () => {
		const choice = { exchange: "AI1" as const, basis: "7D" as const };
		const states: IExchangeRuleState[] = [
			{ mode: "same", both: choice, buy: choice, sell: choice },
			{ mode: "separate", both: choice, buy: choice, sell: null },
			{ mode: "inherit", both: choice, buy: choice, sell: choice },
		];
		for (const state of states) expect(valid(writeRule(state))).toBe(true);
	});

	it("'Use all-planets rule' removes the planet's exchange rules", () => {
		const state = readRule([{ type: "BOTH", exchange: "CI1_ASK" }], true);
		expect(writeRule(switchMode(state, "inherit"))).toEqual([]);
	});

	it("switches modes keeping the exchange", () => {
		const same = readRule([{ type: "BOTH", exchange: "CI1_ASK" }], false);
		expect(writeRule(switchMode(same, "separate"))).toEqual([
			{ type: "BUY", exchange: "CI1_ASK" },
			{ type: "SELL", exchange: "CI1_ASK" },
		]);
		const separate = readRule([{ type: "SELL", exchange: "IC1_BID" }], true);
		expect(writeRule(switchMode(separate, "same"))).toEqual([
			{ type: "BOTH", exchange: "IC1_BID" },
		]);
		// a planet taking its own rule starts from the inherited one
		const inherit = readRule([], true);
		expect(
			writeRule(
				switchMode(inherit, "same", { exchange: "NC1", basis: "30D" })
			)
		).toEqual([{ type: "BOTH", exchange: "NC1_30D" }]);
	});

	it("offers Universe only VWAPs, switching from Ask / Bid to VWAP 30D", () => {
		expect(basesFor("UNIVERSE")).toEqual(["7D", "30D"]);
		expect(basesFor("NC1")).toEqual(["7D", "30D", "ASK", "BID"]);
		expect(toOption({ exchange: "UNIVERSE", basis: "ASK" })).toBe(
			"UNIVERSE_30D"
		);
		expect(toOption({ exchange: "UNIVERSE", basis: "7D" })).toBe(
			"UNIVERSE_7D"
		);
	});

	it("presets write exactly the mapped rules", () => {
		expect(presetAverage("IC1")).toEqual([
			{ type: "BOTH", exchange: "IC1_30D" },
		]);
		expect(presetAverage("UNIVERSE")).toEqual([
			{ type: "BOTH", exchange: "UNIVERSE_30D" },
		]);
		expect(presetTradeNow("NC1")).toEqual([
			{ type: "BUY", exchange: "NC1_ASK" },
			{ type: "SELL", exchange: "NC1_BID" },
		]);
	});

	it("presets work on the scope's, else the all-planets, else NC1", () => {
		const all: CXDataExchangeOption[] = [
			{ type: "BOTH", exchange: "AI1_7D" },
		];
		expect(presetExchange([{ type: "SELL", exchange: "CI1_BID" }], all)).toBe(
			"CI1"
		);
		expect(presetExchange([], all)).toBe("AI1");
		expect(presetExchange([], [])).toBe("NC1");
	});
});
