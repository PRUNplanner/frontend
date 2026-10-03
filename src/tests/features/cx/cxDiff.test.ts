import { describe, expect, it } from "vitest";

import { diffCX, type ICXDiffable } from "@/features/cx/cxDiff";

function cx(): ICXDiffable {
	return {
		cx_name: "Prices",
		cx_data: {
			cx_empire: [
				{ type: "BUY", exchange: "AI1_ASK" },
				{ type: "SELL", exchange: "AI1_BID" },
			],
			cx_planets: [
				{
					planet: "KW-688c",
					preferences: [{ type: "BOTH", exchange: "NC1_7D" }],
				},
			],
			ticker_empire: [
				{ type: "BUY", ticker: "RAT", value: 120 },
				{ type: "SELL", ticker: "DW", value: 80 },
			],
			ticker_planets: [
				{
					planet: "KW-688c",
					preferences: [{ type: "BUY", ticker: "RAT", value: 120 }],
				},
			],
		},
	};
}

describe("diffCX", () => {
	it("no changes, also when lists are reordered", () => {
		const reordered = cx();
		reordered.cx_data.cx_empire.reverse();
		reordered.cx_data.ticker_empire.reverse();

		expect(diffCX(cx(), cx())).toStrictEqual([]);
		expect(diffCX(cx(), reordered)).toStrictEqual([]);
	});

	it("name, exchanges and tickers, for the empire and per planet", () => {
		const to = cx();
		to.cx_name = "New";
		to.cx_data.cx_empire = [{ type: "BUY", exchange: "CI1_ASK" }];
		to.cx_data.cx_planets = [];
		to.cx_data.ticker_empire.push({
			type: "SELL",
			ticker: "RAT",
			value: 150,
		});
		to.cx_data.ticker_planets[0].preferences[0].value = 95;

		expect(diffCX(cx(), to)).toStrictEqual([
			{
				area: "name",
				key: "name",
				params: { from: "Prices", to: "New" },
			},
			{
				area: "exchange::BUY",
				key: "exchange",
				params: { type: "BUY", from: "AI1_ASK", to: "CI1_ASK" },
			},
			{
				area: "exchange::SELL",
				key: "exchange",
				params: { type: "SELL", from: "AI1_BID", to: "—" },
			},
			{
				area: "exchange:KW-688c:BOTH",
				key: "exchange_planet",
				params: {
					type: "BOTH",
					planet: "KW-688c",
					from: "NC1_7D",
					to: "—",
				},
			},
			{
				area: "ticker:KW-688c:RAT:BUY",
				key: "ticker_planet",
				params: {
					ticker: "RAT",
					type: "BUY",
					planet: "KW-688c",
					from: 120,
					to: 95,
				},
			},
			{
				area: "ticker::RAT:SELL",
				key: "ticker",
				params: { ticker: "RAT", type: "SELL", from: "—", to: 150 },
			},
		]);
	});
});
