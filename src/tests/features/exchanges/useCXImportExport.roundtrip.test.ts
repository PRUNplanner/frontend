import { describe, it, expect } from "vitest";

import { useCXImportExport } from "@/features/exchanges/useCXImportExport";

// Types & Interfaces
import type { CXData } from "@/features/api/schemas/cxData.schemas";

// real papaparse: an exported file imports back to the same rules
const cx: CXData = {
	cx_empire: [
		{ type: "BUY", exchange: "NC1_ASK" },
		{ type: "SELL", exchange: "NC1_BID" },
	],
	cx_planets: [
		{
			planet: "LS-231b",
			preferences: [{ type: "BOTH", exchange: "AI1_7D" }],
		},
		{
			planet: "ZZ-999z",
			preferences: [{ type: "BUY", exchange: "IC1_ASK" }],
		},
	],
	ticker_empire: [
		{ type: "BOTH", ticker: "H2O", value: 9 },
		{ type: "BUY", ticker: "DW", value: 94.7 },
		{ type: "SELL", ticker: "GRN", value: 0 },
	],
	ticker_planets: [
		{
			planet: "LS-231b",
			preferences: [{ type: "BUY", ticker: "RAT", value: 75 }],
		},
	],
};

describe("CSV round trip", () => {
	it("imports an export back to the same rules", async () => {
		const { generateSettingsCSV, parseSettingsCSV } = useCXImportExport();
		const csv = generateSettingsCSV(
			cx.cx_empire,
			cx.ticker_empire,
			cx.cx_planets.map((p) => ({
				planet: p.planet,
				exchanges: p.preferences,
				ticker: [],
			})),
			cx.ticker_planets.map((p) => ({
				planet: p.planet,
				exchanges: [],
				ticker: p.preferences,
			}))
		);

		const parsed = await parseSettingsCSV(
			new File([csv], "PRUNPlannerExchangePreferences.csv")
		);

		expect({
			cx_empire: parsed.empireCX,
			cx_planets: parsed.planetsCX.map((p) => ({
				planet: p.planet,
				preferences: p.exchanges,
			})),
			ticker_empire: parsed.empireTickerOptions,
			ticker_planets: parsed.plantesTickerOptions.map((p) => ({
				planet: p.planet,
				preferences: p.ticker,
			})),
		}).toEqual(cx);
	});

	it("keeps several rules of one planet together", async () => {
		const { generateSettingsCSV, parseSettingsCSV } = useCXImportExport();
		const csv = generateSettingsCSV(
			[],
			[],
			[
				{
					planet: "LS-231b",
					exchanges: [
						{ type: "BUY", exchange: "AI1_ASK" },
						{ type: "SELL", exchange: "IC1_BID" },
					],
					ticker: [],
				},
			],
			[
				{
					planet: "LS-231b",
					exchanges: [],
					ticker: [
						{ type: "BUY", ticker: "RAT", value: 75 },
						{ type: "SELL", ticker: "DW", value: 12 },
					],
				},
			]
		);

		const parsed = await parseSettingsCSV(new File([csv], "x.csv"));

		expect(parsed.planetsCX).toStrictEqual([
			{
				planet: "LS-231b",
				exchanges: [
					{ type: "BUY", exchange: "AI1_ASK" },
					{ type: "SELL", exchange: "IC1_BID" },
				],
				ticker: [],
			},
		]);
		expect(parsed.plantesTickerOptions).toStrictEqual([
			{
				planet: "LS-231b",
				exchanges: [],
				ticker: [
					{ type: "BUY", ticker: "RAT", value: 75 },
					{ type: "SELL", ticker: "DW", value: 12 },
				],
			},
		]);
	});

	it("exports only the header without rules, even for missing lists", () => {
		const { generateSettingsCSV } = useCXImportExport();
		const header = "Location;Type;CX;Ticker;Price";

		expect(generateSettingsCSV([], [], [], [])).toBe(header);
		// a store that hasn't loaded yet hands over undefined
		expect(
			generateSettingsCSV(
				undefined as never,
				undefined as never,
				undefined as never,
				undefined as never
			)
		).toBe(header);
	});
});
