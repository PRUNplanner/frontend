import { describe, it, expect } from "vitest";

import {
	formatMarketPrice,
	formatQuantity,
	isRare,
	marketRows,
	marketSummary,
	planLine,
	sharedDomain,
	shareVerdict,
	translateRef,
} from "@/features/material_tile/materialMarket.util";
import { makeOverview } from "@/tests/features/material_tile/marketOverview";

// Types & Interfaces
import type {
	EXCHANGES_TYPE,
	IMaterialExchangeOverview,
} from "@/database/services/useExchangeData.types";
import type { IMarketCheck } from "@/features/cx/marketCheck.types";

const CXS: EXCHANGES_TYPE[] = ["AI1", "CI1", "IC1", "NC1", "UNIVERSE"];

const row = (
	o: IMaterialExchangeOverview,
	cx: EXCHANGES_TYPE,
	daily?: number
) => marketRows(o, daily).find((r) => r.cx === cx)!;

const check = (over: Partial<IMarketCheck> = {}): IMarketCheck => ({
	ticker: "RAT",
	delta: -12,
	exchange: "IC1",
	sharePct: 0.05,
	traded30d: 3000,
	traded7d: 700,
	bid: 98,
	ask: 102,
	spreadPct: 3.9,
	flags: [],
	level: null,
	...over,
});

describe("materialMarket.util", () => {
	describe("marketRows", () => {
		it("lists the four exchanges in fixed order, then Universe", () => {
			expect(marketRows(makeOverview()).map((r) => r.cx)).toEqual(CXS);
		});

		it("computes spread % from the ask and marks it wide above 10 %", () => {
			const o = makeOverview({
				ask: { AI1: 100, CI1: 100, IC1: 100, NC1: 100, UNIVERSE: 0 },
				bid: { AI1: 95, CI1: 85, IC1: 0, NC1: 100, UNIVERSE: 0 },
			});
			expect(row(o, "AI1").spreadPct).toBeCloseTo(5);
			expect(row(o, "AI1").spreadState).toBe("ok");
			expect(row(o, "CI1").spreadState).toBe("wide");
			expect(row(o, "NC1").spread).toBe(0);
		});

		it("shows no bids instead of a spread of the ask", () => {
			const o = makeOverview({
				ask: { AI1: 1_000_000, CI1: 0, IC1: 1, NC1: 1, UNIVERSE: 0 },
				bid: { AI1: 0, CI1: 5, IC1: 1, NC1: 1, UNIVERSE: 0 },
			});
			expect(row(o, "AI1")).toMatchObject({
				spread: null,
				spreadPct: null,
				spreadState: "no_bids",
			});
			expect(row(o, "CI1").spreadState).toBe("no_asks");
			expect(row(o, "UNIVERSE")).toMatchObject({
				ask: 0,
				bid: 0,
				spreadState: null,
			});
		});

		it("labels inactive and stale exchanges", () => {
			const o = makeOverview({
				exchange_status: {
					AI1: "INACTIVE",
					CI1: "STALE",
					IC1: "ACTIVE",
					NC1: "ACTIVE",
					UNIVERSE: "ACTIVE",
				},
			});
			expect(marketRows(o).map((r) => r.status)).toEqual([
				"INACTIVE",
				"STALE",
				null,
				null,
				null,
			]);
		});

		it("takes trend levels from the VWAP analysis", () => {
			const o = makeOverview({
				vwap_analysis: {
					AI1: { significance: "STABLE", percentChange: 0.01 },
					CI1: { significance: "SIGNIFICANT", percentChange: -0.03 },
					IC1: {
						significance: "HIGHLY-SIGNIFICANT",
						percentChange: 0.08,
					},
					NC1: {
						significance: "HIGHLY-SIGNIFICANT",
						percentChange: -0.06,
					},
					UNIVERSE: { significance: "STABLE", percentChange: NaN },
				},
			});
			expect(
				marketRows(o).map((r) => [r.trend.level, r.trend.glyph])
			).toEqual([
				[0, "▲"],
				[1, "▼"],
				[2, "▲▲"],
				[2, "▼▼"],
				[0, "■"],
			]);
		});

		it("divides 30 days of volume by 30 and shares the plan against it", () => {
			const r = row(makeOverview(), "AI1", -12);
			expect(r.perDay).toBe(100);
			expect(r.share).toBeCloseTo(12);
			expect(r.share7).toBeCloseTo((12 * 7 * 100) / 700);
			expect(r.verdict).toBe("watch");
			expect(row(makeOverview(), "AI1").verdict).toBeNull();
		});

		it("compares each VWAP 7D with Universe", () => {
			const o = makeOverview({
				vwap_7d: { AI1: 110, CI1: 90, IC1: 100, NC1: 0, UNIVERSE: 100 },
			});
			expect(row(o, "AI1").vsUniverse).toBeCloseTo(10);
			expect(row(o, "CI1").vsUniverse).toBeCloseTo(-10);
			expect(row(o, "NC1").vsUniverse).toBeNull();
			expect(row(o, "UNIVERSE").vsUniverse).toBeNull();
		});

		it("counts wanted per offered, none without supply", () => {
			const o = makeOverview({
				supply: { AI1: 0, CI1: 100, IC1: 1, NC1: 1, UNIVERSE: 102 },
				demand: { AI1: 5, CI1: 50, IC1: 1, NC1: 1, UNIVERSE: 57 },
			});
			expect(row(o, "AI1").wantedPerOffered).toBeNull();
			expect(row(o, "CI1").wantedPerOffered).toBe(0.5);
		});
	});

	describe("shareVerdict", () => {
		it("uses Market check's limits: watch at 10 %, too big at 50 %", () => {
			expect(shareVerdict(0)).toBe("fine");
			expect(shareVerdict(9.99)).toBe("fine");
			expect(shareVerdict(10)).toBe("watch");
			expect(shareVerdict(49.9)).toBe("watch");
			expect(shareVerdict(50)).toBe("too_big");
			expect(shareVerdict(null)).toBe("too_big");
		});
	});

	describe("isRare", () => {
		it("is rare below one unit a day on all four exchanges", () => {
			const by = (u: number) =>
				makeOverview({
					sum_traded_30d: {
						AI1: 1,
						CI1: 2,
						IC1: 5,
						NC1: 3,
						UNIVERSE: u,
					},
				});
			expect(isRare(by(11))).toBe(true);
			expect(isRare(by(30))).toBe(false);
		});
	});

	describe("planLine", () => {
		// AI1 100/day, CI1 20/day, IC1 1000/day, NC1 10/day
		const spread = makeOverview({
			sum_traded_30d: {
				AI1: 3000,
				CI1: 600,
				IC1: 30000,
				NC1: 300,
				UNIVERSE: 33900,
			},
		});

		it("without a check names the exchanges at the worst verdict", () => {
			const line = planLine(marketRows(spread, -6));
			expect(line.checkExchange).toBeNull();
			expect(line.level).toBe("red");
			expect(line.chip).toEqual({
				key: "material_tile.card.cross.too_big",
				params: { list: "NC1" },
			});
			expect(line.detail).toEqual({
				key: "material_tile.card.cross.largest",
				params: { share: "60.0 %", cx: "NC1" },
			});

			const watch = planLine(marketRows(spread, 3));
			expect(watch.level).toBe("amber");
			expect(watch.chip.params).toEqual({ list: "CI1, NC1" });

			const fine = planLine(marketRows(spread, 0.5));
			expect(fine.level).toBe("fine");
			expect(fine.chip).toEqual({ key: "material_tile.card.cross.fine" });
		});

		it("without volume on an exchange names it as the largest", () => {
			const none = makeOverview({
				sum_traded_30d: { AI1: 0, CI1: 1, IC1: 1, NC1: 1, UNIVERSE: 3 },
			});
			expect(planLine(marketRows(none, 1)).detail).toEqual({
				key: "material_tile.card.cross.largest_none",
				params: { cx: "AI1" },
			});
		});

		it("with a fine check shows its share and the other exchanges", () => {
			const c = check({ exchange: "IC1", sharePct: 0.6 });
			const line = planLine(marketRows(spread, -6), c);
			expect(line.checkExchange).toBe("IC1");
			expect(line.level).toBe("fine");
			expect(line.chip).toEqual({
				key: "material_tile.card.chip.fine",
				params: { share: "0.6 %", cx: "IC1" },
			});
			expect(line.detail).toEqual({
				key: "material_tile.card.others.mixed",
				params: { red: "NC1", amber: "CI1" },
			});
		});

		it("takes the check's level and share as they are", () => {
			const c = check({
				exchange: "AI1",
				sharePct: 12,
				flags: ["large_share"],
				level: "amber",
			});
			// the rows would say otherwise: the check wins
			const line = planLine(marketRows(spread, -0.1), c);
			expect(line.level).toBe("amber");
			// in the flag's own words, with the share
			expect(line.chip).toEqual({
				key: "material_tile.card.chip.flag_share",
				params: { share: "12.0 %", cx: "AI1" },
				paramKeys: { flag: "cx.market_flags.flags.large_share" },
			});
			expect(
				translateRef(
					(key, named) => `${key}${JSON.stringify(named)}`,
					line.chip
				)
			).toBe(
				'material_tile.card.chip.flag_share{"share":"12.0 %","cx":"AI1","flag":"cx.market_flags.flags.large_share{}"}'
			);
			expect(line.detail).toEqual({
				key: "material_tile.card.others.fine",
			});
		});

		it("shows a flag's own words", () => {
			const c = check({ flags: ["no_offers"], level: "red" });
			const line = planLine(marketRows(spread, -6), c);
			expect(line.level).toBe("red");
			expect(line.chip).toEqual({
				key: "cx.market_flags.flags.no_offers",
			});
		});

		it("names the other exchanges by verdict", () => {
			const c = (exchange: EXCHANGES_TYPE) => check({ exchange });
			expect(planLine(marketRows(spread, -6), c("NC1")).detail).toEqual({
				key: "material_tile.card.others.watch",
				params: { list: "CI1" },
			});
			expect(planLine(marketRows(spread, 6), c("CI1")).detail).toEqual({
				key: "material_tile.card.others.too_big",
				params: { list: "NC1" },
			});
		});

		it("against Universe gives the verdict across all four", () => {
			const c = check({
				exchange: "UNIVERSE",
				flags: ["all_exchanges"],
				level: "muted",
				sharePct: 0.02,
			});
			const line = planLine(marketRows(spread, -6), c);
			expect(line.checkExchange).toBe("UNIVERSE");
			expect(line.chip.key).toBe("material_tile.card.chip.fine");
			expect(line.detail).toEqual({
				key: "material_tile.card.cross.too_big",
				params: { list: "NC1" },
			});
		});
	});

	describe("marketSummary", () => {
		const summary = (
			health: Partial<IMaterialExchangeOverview["systemic_health"]>,
			over = {}
		) =>
			marketSummary(
				makeOverview({
					systemic_health: {
						diffusionIndex: 75,
						liquidityRatio: 1,
						weightedTrend: 0.012,
						priceCohesion: 1,
						...health,
					},
					...over,
				})
			);

		it("counts rising exchanges and the volume-weighted trend", () => {
			const s = summary({});
			expect(s.rising).toBe(3);
			expect(s.trend).toEqual({
				key: "material_tile.card.summary.trend",
				params: { rising: 3, trend: "+1.2 %" },
			});
			expect(summary({ weightedTrend: NaN }).trend).toEqual({
				key: "material_tile.card.summary.trend_none",
				params: { rising: 3 },
			});
		});

		it("reads the order books' balance", () => {
			const book = (supply: number, demand: number) =>
				summary(
					{},
					{
						supply: {
							AI1: 0,
							CI1: 0,
							IC1: 0,
							NC1: 0,
							UNIVERSE: supply,
						},
						demand: {
							AI1: 0,
							CI1: 0,
							IC1: 0,
							NC1: 0,
							UNIVERSE: demand,
						},
					}
				).balanceText.key;
			expect(book(100, 59)).toBe("material_tile.health.balance.buyers");
			expect(book(100, 100)).toBe("material_tile.health.balance.even");
			expect(book(100, 130)).toBe("material_tile.health.balance.sellers");
			expect(book(0, 5)).toBe("material_tile.health.balance.buyers");
		});

		it("bands price cohesion and names the cheapest and dearest", () => {
			const over = {
				vwap_7d: {
					AI1: 238,
					CI1: 244,
					IC1: 227,
					NC1: 247,
					UNIVERSE: 236,
				},
			};
			const at = (c: number) =>
				summary({ priceCohesion: c }, over).cohesionText;
			expect(at(1.4)).toEqual({
				key: "material_tile.card.summary.cohesion.together",
				params: { pct: "1.4 %", cheapest: "IC1", dearest: "NC1" },
			});
			expect(at(3).key).toBe(
				"material_tile.card.summary.cohesion.little"
			);
			expect(at(5.1).key).toBe(
				"material_tile.card.summary.cohesion.apart"
			);
		});
	});

	describe("formatQuantity and formatMarketPrice", () => {
		it("shortens large numbers and keeps small ones readable", () => {
			expect(formatQuantity(1_564_881)).toBe("1.6M");
			expect(formatQuantity(36_213)).toBe("36.2k");
			expect(formatQuantity(360)).toBe("360");
			expect(formatQuantity(4.24)).toBe("4.2");
			expect(formatQuantity(0.05)).toBe("0.05");
			expect(formatQuantity(0)).toBe("0");
			expect(formatMarketPrice(0)).toBe("—");
			expect(formatMarketPrice(238)).toBe("238");
			expect(formatMarketPrice(237.894)).toBe("237.89");
			expect(formatMarketPrice(958_000)).toBe("958k");
		});
	});

	describe("sharedDomain", () => {
		it("spans all series and widens a flat one", () => {
			expect(
				sharedDomain([
					[1, null, 3],
					[2, 5],
				])
			).toEqual([1, 5]);
			expect(sharedDomain([[null], []])).toBeUndefined();
			const [lo, hi] = sharedDomain([[100, 100]])!;
			expect(lo).toBeCloseTo(97);
			expect(hi).toBeCloseTo(103);
		});
	});
});
