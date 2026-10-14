import { describe, it, expect } from "vitest";

import { exchangeLines } from "@/features/market_exploration/marketExploration.util";

// Types & Interfaces
import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";

const DAY = 86400000;
const D0 = 1790294400000; // 2026-09-25 00:00 UTC

function row(
	exchange_code: string,
	day: number,
	volume: number,
	traded: number
): Exploration {
	return {
		ticker: "RAT",
		exchange_code,
		// not midnight-aligned, as FIO sometimes sends
		date_epoch: D0 + day * DAY + 3600000,
		open_p: 1,
		close_p: 1,
		high_p: 10 + day,
		low_p: 5 + day,
		volume,
		traded,
	};
}

const DATA = {
	AI1: [row("AI1", 0, 100, 10), row("AI1", 3, 300, 10)],
	CI1: [row("CI1", 1, 50, 5), row("CI1", 2, 0, 0)],
};

describe("exchangeLines", () => {
	it("fills days continuously, with null for days without trades", () => {
		const lines = exchangeLines(DATA, "vwap", null);

		expect(lines.days).toEqual([D0, D0 + DAY, D0 + 2 * DAY, D0 + 3 * DAY]);
		expect(lines.values.AI1).toEqual([10, null, null, 30]);
		expect(lines.values.CI1).toEqual([null, 10, null, null]);
		expect(lines.volume).toEqual([10, 5, 0, 10]);
	});

	it("reads low and high", () => {
		expect(exchangeLines(DATA, "low", null).values.AI1).toEqual([
			5,
			null,
			null,
			8,
		]);
		expect(exchangeLines(DATA, "high", null).values.CI1).toEqual([
			null,
			11,
			null,
			null,
		]);
	});

	it("keeps the last n days", () => {
		const lines = exchangeLines(DATA, "vwap", 2);

		expect(lines.days).toEqual([D0 + 2 * DAY, D0 + 3 * DAY]);
		expect(lines.values.AI1).toEqual([null, 30]);
	});

	it("is empty without trades", () => {
		expect(exchangeLines({ AI1: [] }, "vwap", 30)).toEqual({
			days: [],
			values: {},
			volume: [],
		});
	});
});
