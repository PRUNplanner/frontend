import { describe, expect, it } from "vitest";

import {
	bookStats,
	changeColor,
	exchangeCards,
	formatChange,
	formatMoney,
	indexChanges,
	marketBrief,
	marketKpis,
	marketLead,
	marketMovers,
	MOVER_MIN_TURNOVER,
	MOVER_MIN_UNITS,
	sectorCards,
	seriesChange,
	squarify,
	workforceCost,
	workforceDrivers,
	workforceSeries,
	WORKFORCE_TICKERS,
} from "@/features/market_report/marketReport.util";
import {
	MarketSummarySchema,
	type MarketMaterial,
} from "@/features/api/schemas/marketSummary.schemas";
import type { Exchange } from "@/features/api/schemas/gameData.schemas";

import fixture from "@/tests/test_data/api_data_market_summary.json";

// 20 Oct snapshot (prices to 19 Oct)
const summary = MarketSummarySchema.parse(fixture);
const byTicker = new Map(summary.materials.map((m) => [m.ticker, m]));

function material(over: Partial<MarketMaterial>): MarketMaterial {
	return {
		ticker: "X",
		name: "X",
		category: "metals",
		sector: "metals_alloys",
		turnover_30d: 1e8,
		turnover_7d: 1e7,
		units_7d: 100,
		vwap_7d: 10,
		vwap_30d: 10,
		change_pct: 5,
		spark: [],
		is_flat: false,
		turnover_7d_by_exchange: {},
		...over,
	};
}

describe("workforce cost", () => {
	it("pioneers on 19 Oct: Σ need × VWAP 7D, about 2,233 ȼ", () => {
		const cost = workforceCost((t) => byTicker.get(t)?.vwap_7d, "pioneer")!;
		// 4 DW + 4 RAT + 0.5 OVE + 0.2 PWO + 0.5 COF
		expect(cost).toBeCloseTo(
			4 * 141 + 4 * 237 + 0.5 * 202 + 0.2 * 415 + 0.5 * 1080,
			6
		);
		expect(Math.abs(cost - 2233)).toBeLessThan(10);
	});

	it("is null when one price is missing", () => {
		expect(
			workforceCost((t) => (t === "COF" ? null : 1), "pioneer")
		).toBeNull();
	});

	it("per day, and the drivers of the change", () => {
		const series = {
			DW: [100, 100, 110],
			RAT: [200, null, 300],
			OVE: [100, 100, 100],
			PWO: [100, 100, 100],
			COF: [100, 100, 50],
		};
		const costs = workforceSeries(series, "pioneer", 3);
		expect(costs[1]).toBeNull();
		expect(costs[2]! - costs[0]!).toBeCloseTo(4 * 10 + 4 * 100 - 0.5 * 50);

		const drivers = workforceDrivers(series, "pioneer", 3);
		expect(drivers.map((d) => d.ticker)).toEqual(["RAT", "DW"]);
		expect(drivers[0]).toEqual({ ticker: "RAT", delta: 400, pct: 50 });
	});
});

describe("movers", () => {
	it("never lists a flat material or one below the volume floor", () => {
		for (const direction of ["rising", "falling"] as const) {
			const list = marketMovers(summary.materials, direction, 50);
			expect(list.length).toBeGreaterThan(0);
			list.forEach((m) => {
				expect(m.is_flat).toBe(false);
				expect(m.turnover_7d).toBeGreaterThanOrEqual(
					MOVER_MIN_TURNOVER
				);
				expect(m.units_7d).toBeGreaterThanOrEqual(MOVER_MIN_UNITS);
			});
		}
		// ADS rose 16.1 % on 32 units
		expect(
			marketMovers(summary.materials, "rising").map((m) => m.ticker)
		).not.toContain("ADS");
	});

	it("sorts by change, top 8 by default", () => {
		const rising = marketMovers(summary.materials, "rising");
		expect(rising).toHaveLength(8);
		expect(rising.slice(0, 3).map((m) => m.ticker)).toEqual([
			"FE",
			"THF",
			"BDE",
		]);
		const falling = marketMovers(summary.materials, "falling");
		falling.forEach((m, i) => {
			expect(m.change_pct!).toBeLessThan(0);
			if (i)
				expect(m.change_pct!).toBeGreaterThanOrEqual(
					falling[i - 1].change_pct!
				);
		});
	});

	it("skips a material without a change", () => {
		expect(
			marketMovers([material({ change_pct: null })], "rising")
		).toEqual([]);
	});
});

describe("summary numbers", () => {
	it("flags the six flat materials of 20 Oct", () => {
		expect(
			summary.materials
				.filter((m) => m.is_flat)
				.map((m) => m.ticker)
				.sort()
		).toEqual(["AIR", "CBL", "CBS", "CCD", "IDC", "RED"]);
		expect(marketKpis(summary).flatCount).toBe(6);
	});

	it("KPIs", () => {
		const kpis = marketKpis(summary);
		expect(kpis.index).toBe(summary.index.combined.at(-1));
		expect(kpis.indexChange).toBeCloseTo(
			summary.index.combined.at(-1)! - 100
		);
		expect(kpis.traded30d).toBe(summary.materials.length);
		expect(kpis.turnover7d).toBeGreaterThan(0);
		expect(kpis.flatShare).toBeGreaterThan(10);
		expect(kpis.flatShare).toBeLessThan(20);
	});

	it("In short: index, leading sector, pioneer cost", () => {
		const brief = marketBrief(summary);
		expect(brief.indexChange).toBeCloseTo(7.9, 0);
		const best = Math.max(
			...Object.values(summary.index.per_sector).map((v) =>
				seriesChange(v)!
			)
		);
		expect(brief.sectorChange).toBe(best);
		expect(brief.sector).toBe("ships_fuel");
		expect(brief.pioneerCost).toBeCloseTo(2236);
		// against the first spark day: 4 × 153 + 4 × 231 + 0.5 × 189 + 0.2 × 422 + 0.5 × 1030
		const then = 4 * 153 + 4 * 231 + 0.5 * 189 + 0.2 * 422 + 0.5 * 1030;
		expect(brief.pioneerChange).toBeCloseTo((2236 / then - 1) * 100);
	});

	it("exchange cards: shares add up to 100 %", () => {
		const cards = exchangeCards(summary);
		expect(cards.map((c) => c.code)).toEqual(["AI1", "CI1", "IC1", "NC1"]);
		expect(cards.reduce((a, c) => a + c.share, 0)).toBeCloseTo(100);
		cards.forEach((c) => expect(c.turnover7d).toBeLessThan(c.turnover30d));
	});

	it("book stats: median spread of books with both sides", () => {
		const book = (bid: number, ask: number, exchange_code = "AI1") =>
			({ bid, ask, exchange_code }) as Exchange;
		const stats = bookStats(
			[
				book(90, 110),
				book(0, 10),
				book(5, 0),
				book(95, 105),
				book(1, 2, "CI1"),
			],
			"AI1"
		);
		expect(stats.noBid).toBe(1);
		expect(stats.noAsk).toBe(1);
		// 20 % and 10 % of the mid
		expect(stats.spreadMedian).toBeCloseTo(15);
		expect(bookStats([], "NC1").spreadMedian).toBeNull();
	});
});

describe("squarify", () => {
	const values = [50, 30, 10, 6, 3, 1];
	const rects = squarify(
		values.map((value, i) => ({ value, item: i })),
		0,
		0,
		400,
		200
	);

	it("areas are proportional to the values", () => {
		expect(rects).toHaveLength(values.length);
		rects.forEach((r) =>
			expect(r.w * r.h).toBeCloseTo((values[r.item] / 100) * 400 * 200, 6)
		);
	});

	it("boxes stay inside and never overlap", () => {
		const eps = 1e-6;
		rects.forEach((a, i) => {
			expect(a.x).toBeGreaterThanOrEqual(-eps);
			expect(a.y).toBeGreaterThanOrEqual(-eps);
			expect(a.x + a.w).toBeLessThanOrEqual(400 + eps);
			expect(a.y + a.h).toBeLessThanOrEqual(200 + eps);
			rects.slice(i + 1).forEach((b) => {
				const overlapX =
					Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
				const overlapY =
					Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
				expect(overlapX <= eps || overlapY <= eps).toBe(true);
			});
		});
	});

	it("skips empty input", () => {
		expect(squarify([], 0, 0, 10, 10)).toEqual([]);
		expect(squarify([{ value: 1, item: 0 }], 0, 0, 0, 10)).toEqual([]);
	});
});

describe("formatting", () => {
	it("changes carry arrow and sign", () => {
		expect(formatChange(7.94)).toBe("▲\u00a0+7.9\u00a0%");
		expect(formatChange(-2.5)).toBe("▼\u00a0−2.5\u00a0%");
		expect(formatChange(0.01)).toBe("■\u00a00.0\u00a0%");
		expect(formatChange(null)).toBe("–");
	});

	it("money", () => {
		expect(formatMoney(412)).toBe("412 ȼ");
		expect(formatMoney(18_400)).toBe("18.4 k ȼ");
		expect(formatMoney(37_250_000)).toBe("37.3 M ȼ");
		expect(formatMoney(8_970_000_000)).toBe("8.97 B ȼ");
	});

	it("change colour saturates at ±12 %", () => {
		expect(changeColor(30)).toBe(changeColor(12));
		expect(changeColor(-12)).toContain("--color-negative");
		expect(changeColor(null)).toContain(" 0%");
	});
});

describe("an empty or thin summary", () => {
	const empty = {
		...summary,
		turnover_daily: { AI1: [null, null] },
		index: { ...summary.index, combined: [null], per_sector: {} },
		materials: [],
	};

	it("KPIs have no change, index or share", () => {
		expect(marketKpis(empty)).toMatchObject({
			turnover7d: 0,
			turnover7dChange: null,
			index: null,
			indexChange: null,
			flatShare: 0,
			traded30d: 0,
		});
	});

	it("In short leaves out what it can't say", () => {
		expect(marketBrief(empty)).toEqual({
			index: null,
			indexChange: null,
			sector: null,
			sectorChange: null,
			pioneerCost: null,
			pioneerChange: null,
		});
	});

	it("exchange cards without turnover share nothing", () => {
		const cards = exchangeCards(empty);
		expect(cards.map((c) => c.share)).toEqual([0, 0, 0, 0]);
		expect(cards[1].daily).toEqual([]);
	});

	it("an odd number of books takes the middle spread", () => {
		const book = (bid: number, ask: number) =>
			({ bid, ask, exchange_code: "AI1" }) as Exchange;
		expect(
			bookStats([book(90, 110), book(95, 105), book(99, 101)], "AI1")
				.spreadMedian
		).toBeCloseTo(10);
	});

	it("squarify puts equal values in one row", () => {
		const rects = squarify(
			[1, 1, 1, 1].map((value, item) => ({ value, item })),
			0,
			0,
			100,
			100
		);
		expect(rects).toHaveLength(4);
		rects.forEach((r) => expect(r.w * r.h).toBeCloseTo(2500, 6));
	});
});

describe("landing section", () => {
	it("index changes over 7, 30 and 90 days", () => {
		const values = Array.from({ length: 90 }, (_, i) => 100 + i);
		const c = indexChanges(values);
		expect(c.d90).toBeCloseTo((189 / 100 - 1) * 100);
		expect(c.d30).toBeCloseTo((189 / 159 - 1) * 100);
		expect(c.d7).toBeCloseTo((189 / 182 - 1) * 100);
		expect(indexChanges([null])).toEqual({
			d7: null,
			d30: null,
			d90: null,
		});
	});

	it("sector cards: one per sector, largest change first, shares add up", () => {
		const cards = sectorCards(summary);
		expect(cards.map((c) => c.key).sort()).toEqual(
			summary.sectors.map((s) => s.key).sort()
		);
		const changes = cards.map((c) => c.change!);
		expect(changes).toEqual([...changes].sort((a, b) => b - a));
		expect(cards[0].key).toBe(marketBrief(summary).sector);
		expect(cards.reduce((t, c) => t + c.share, 0)).toBeCloseTo(100, 6);
		expect(cards[0].values).toBe(summary.index.per_sector[cards[0].key]);
	});

	it("lead: index since its base, leading sector, pioneer cost from the series", () => {
		const prices = Object.fromEntries(
			WORKFORCE_TICKERS.map((t) => [
				t,
				Array.from({ length: summary.days }, (_, i) =>
					i < 2 ? null : 10 + (t === "RAT" ? i : 0)
				),
			])
		);
		const lead = marketLead(summary, prices);
		const brief = marketBrief(summary);
		expect(lead).toMatchObject({
			change: brief.indexChange,
			change30: indexChanges(summary.index.combined).d30,
			start: summary.index.base,
			sector: brief.sector,
			sectorChange: brief.sectorChange,
		});
		const costs = workforceSeries(prices, "pioneer", summary.days);
		expect(lead.pioneerCost).toBe(costs.at(-1));
		expect(lead.pioneerChange).toBeCloseTo(seriesChange(costs)!);
		expect(lead.pioneerStart).toBe(
			summary.as_of - (summary.days - 3) * 86_400_000
		);
	});

	it("lead without prices leaves out the pioneer cost", () => {
		expect(marketLead(summary, null)).toMatchObject({
			pioneerCost: null,
			pioneerChange: null,
			pioneerStart: null,
		});
	});
});
