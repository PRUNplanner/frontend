import { describe, it, expect, vi } from "vitest";

import {
	createPriceBook,
	explainPrice,
	type PriceType,
} from "@/features/cx/priceBook";

// Types & Interfaces
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type {
	CXData,
	CXDataExchangeOption,
	CXDataTickerOption,
} from "@/features/api/schemas/cxData.schemas";

const PLANET = "KW-688c";

const row = (v: Partial<Exchange>) =>
	({ vwap_7d: 0, vwap_30d: 0, ask: 0, bid: 0, ...v }) as Exchange;

// RAT has every price, GAP no NC1 asks (0) and a null bid, MISS no NC1 row,
// NONE no exchange data at all
const exchanges: Record<string, Exchange> = {};
for (const cx of ["AI1", "CI1", "IC1", "NC1", "UNIVERSE"])
	exchanges[`RAT.${cx}`] = row({
		vwap_7d: 11,
		vwap_30d: 12,
		ask: 13,
		bid: 14,
	});
for (const cx of ["AI1", "CI1", "IC1", "UNIVERSE"])
	exchanges[`GAP.${cx}`] = row({ vwap_7d: 21, vwap_30d: 22, ask: 23 });
exchanges["GAP.NC1"] = row({
	vwap_7d: 25,
	vwap_30d: 26,
	ask: 0,
	bid: null as unknown as number,
});
for (const cx of ["AI1", "CI1", "IC1", "UNIVERSE"])
	exchanges[`MISS.${cx}`] = row({ vwap_7d: 31, vwap_30d: 32, bid: 34 });

const getExchange = (id: string) => {
	if (!exchanges[id]) throw new Error(`Exchange '${id}' not found.`);
	return exchanges[id];
};

const planetTickers: CXDataTickerOption[][] = [
	[],
	[{ type: "BUY", ticker: "RAT", value: 1 }],
	[{ type: "BOTH", ticker: "GAP", value: 0 }],
	[{ type: "SELL", ticker: "MISS", value: 3 }],
];
const empireTickers: CXDataTickerOption[][] = [
	[],
	[{ type: "BOTH", ticker: "RAT", value: 5 }],
	[
		{ type: "BUY", ticker: "MISS", value: 0 },
		{ type: "SELL", ticker: "NONE", value: 7 },
	],
];
const planetExchanges: CXDataExchangeOption[][] = [
	[],
	[{ type: "BOTH", exchange: "NC1_ASK" }],
	[{ type: "BUY", exchange: "IC1_BID" }],
	[{ type: "SELL", exchange: "NC1_BID" }],
];
const empireExchanges: CXDataExchangeOption[][] = [
	[],
	[{ type: "BOTH", exchange: "NC1_30D" }],
	[
		{ type: "BUY", exchange: "CI1_ASK" },
		{ type: "SELL", exchange: "AI1_7D" },
	],
];

describe("explainPrice", () => {
	it("agrees with the price book for every step combination", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		let checked = 0;

		for (const pt of planetTickers)
			for (const et of empireTickers)
				for (const pe of planetExchanges)
					for (const ee of empireExchanges) {
						const cx: CXData = {
							cx_empire: ee,
							cx_planets: [{ planet: PLANET, preferences: pe }],
							ticker_empire: et,
							ticker_planets: [{ planet: PLANET, preferences: pt }],
						};
						for (const data of [cx, undefined])
							for (const planet of [PLANET, undefined])
								for (const ticker of ["RAT", "GAP", "MISS", "NONE"])
									for (const type of ["BUY", "SELL"] as PriceType[]) {
										const book = createPriceBook(
											data ? () => data : undefined,
											planet,
											getExchange
										);
										const source = book.getPriceSource(ticker, type);
										const { steps, winner } = explainPrice(
											data,
											planet,
											ticker,
											type,
											getExchange
										);

										const label = `${ticker} ${type} ${planet} ${JSON.stringify(data)}`;
										if (source.level === "unresolved") {
											expect(winner, label).toBe(-1);
											continue;
										}
										expect(steps[winner].level, label).toBe(source.level);
										expect(steps[winner].value, label).toBe(
											book.getPrice(ticker, type)
										);
										if (source.exchange && source.key) {
											expect(steps[winner].exchange).toBe(source.exchange);
											expect(steps[winner].key).toBe(source.key);
										}
										checked++;
									}
					}

		error.mockRestore();
		expect(checked).toBeGreaterThan(1000);
	});

	it("lists every level, the winner's lower levels after it", () => {
		const cx: CXData = {
			cx_empire: [{ type: "BOTH", exchange: "NC1_ASK" }],
			cx_planets: [],
			ticker_empire: [],
			ticker_planets: [],
		};
		const { steps, winner } = explainPrice(
			cx,
			PLANET,
			"GAP",
			"BUY",
			getExchange
		);

		expect(steps.map((s) => s.level)).toEqual([
			"planet_ticker",
			"empire_ticker",
			"planet_exchange",
			"empire_exchange",
			"fallback",
		]);
		// the matching exchange rule wins with 0, Universe is not used
		expect(winner).toBe(3);
		expect(steps[3]).toMatchObject({
			matched: true,
			value: 0,
			exchange: "NC1",
			key: "ask",
		});
		expect(steps[4].value).toBe(22);
	});

	it("shows a missing exchange row as no value", () => {
		const { steps, winner } = explainPrice(
			{
				cx_empire: [{ type: "BOTH", exchange: "NC1_30D" }],
				cx_planets: [],
				ticker_empire: [],
				ticker_planets: [],
			},
			undefined,
			"MISS",
			"SELL",
			getExchange
		);
		expect(winner).toBe(-1);
		expect(steps[3].value).toBeNull();
	});
});
