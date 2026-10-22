import { describe, expect, it } from "vitest";

import MarketInShort from "@/features/market_report/components/MarketInShort.vue";
import { mountComponent } from "@/tests/mountComponent";

import fixture from "@/tests/test_data/api_data_market_summary.json";
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

const summary = fixture as MarketSummary;
const messages = {
	market_report: {
		in_short: {
			since: "since {date}",
			pioneer_value: "{cost} a day",
			gap_note: "buy on {low}, sell on {high}",
			no_gap: "No open gap of {min} or more right now",
		},
		gaps: { ask: "ask {price}", bid: "bid {price}" },
	},
};

const book = (exchange_code: string, ask: number, bid: number) =>
	({
		ticker: "FE",
		exchange_code,
		vwap_7d: 100,
		sum_traded_7d: 10_000,
		ask,
		bid,
	}) as Exchange;

describe("MarketInShort", () => {
	it("three tiles with their start dates, the gap tile only when asked", async () => {
		const { wrapper } = await mountComponent(
			MarketInShort,
			{ summary, books: null },
			{ messages }
		);
		const tiles = wrapper.findAll("article");
		expect(tiles).toHaveLength(3);
		// each tile is named by its heading
		tiles.forEach((tile) =>
			expect(tile.attributes("aria-labelledby")).toBe(
				tile.find("h3").attributes("id")
			)
		);
		expect(tiles[0].text()).toContain("since Jul 22, 2026");
		// the pioneer cost's 15 days end on as_of (Oct 19)
		expect(tiles[2].text()).toContain("since Oct 5, 2026");
		expect(tiles[2].text()).toMatch(/ȼ a day/);
		// a sparkline per tile, hidden on phones
		expect(tiles[2].find("svg polyline").exists()).toBe(true);
		expect(wrapper.find("[data-gap-tile]").exists()).toBe(false);
	});

	it("the gap tile: a skeleton, the top open gap, or none", async () => {
		const { wrapper, setProps } = await mountComponent(
			MarketInShort,
			{ summary, books: null, showGap: true },
			{ messages }
		);
		const tile = () => wrapper.find("[data-gap-tile]");
		expect(wrapper.findAll("article")).toHaveLength(4);
		expect(tile().find("[data-skeleton]").exists()).toBe(true);

		await setProps({ books: [book("AI1", 100, 90), book("NC1", 130, 120)] });
		expect(tile().text()).toContain("FE");
		expect(tile().text()).toContain("buy on AI1, sell on NC1");
		expect(tile().text()).toContain("ask 100");
		expect(tile().text()).toContain("bid 120");
		expect(tile().text()).toContain("+20.0");

		await setProps({ books: [book("AI1", 100, 90), book("NC1", 130, 101)] });
		expect(tile().text()).toContain("No open gap of 10 % or more right now");

		await setProps({ books: null, booksFailed: true });
		expect(tile().text()).toContain("market_report.error");
	});
});
