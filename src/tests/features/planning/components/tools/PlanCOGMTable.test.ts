import { describe, it, expect, vi } from "vitest";
import { RouterLinkStub } from "@vue/test-utils";

import PlanCOGMTable from "@/features/planning/components/tools/PlanCOGMTable.vue";
import { PTag } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { IPriceBook, IPriceSource } from "@/features/cx/priceBook";

vi.mock(
	"@/features/material_tile/components/MaterialTile.vue",
	async () => (await import("@/tests/stubs")).materialTile
);

const CX_UUID = "cx-1";
const PLANET = "ZV-307c";

const SOURCES: Record<string, IPriceSource> = {
	// all-planets exchange rule
	GRN: {
		level: "empire_exchange",
		exchange: "NC1",
		key: "vwap_30d",
		zero: false,
		volume: "NC1",
	},
	// planet exchange rule without a price
	NUT: {
		level: "planet_exchange",
		exchange: "NC1",
		key: "ask",
		zero: true,
		volume: "NC1",
	},
	// fixed on the planet
	H2O: {
		level: "planet_ticker",
		exchange: null,
		key: null,
		zero: false,
		volume: "NC1",
	},
};

const book: IPriceBook = {
	getPrice: () => 0,
	getPriceSource: (ticker) => SOURCES[ticker],
};

const input = (ticker: string) => ({
	ticker,
	amount: 1,
	costUnit: 10,
	costTotal: 10,
});

const DATA = {
	runtime: 43200000,
	runtimeShare: 0.5,
	efficiency: 1,
	degradation: 100,
	degradationShare: 50,
	workforceCost: 200,
	workforceCostTotal: 400,
	inputCost: ["GRN", "NUT", "H2O"].map(input),
	inputTotal: 30,
	outputCOGM: [
		{ ticker: "RAT", amount: 10, costSplit: 64.43, costTotal: 64.43 },
		{ ticker: "DW", amount: 10, costSplit: 64.43, costTotal: 64.43 },
	],
	totalCost: 644.3,
	outputRevenue: 1000,
	totalProfit: 355.7,
};

const MARKET_MESSAGE = {
	plan: {
		tools: { cogm: { table: { market: "market {price} · {diff} %" } } },
	},
};

const mountTable = (props: Record<string, unknown> = {}) =>
	mountComponent(PlanCOGMTable, { data: DATA, ...props });

describe("PlanCOGMTable", () => {
	it("tags each input with its source and links the rule's scope", async () => {
		const { wrapper } = await mountTable({
			prices: book,
			cxUuid: CX_UUID,
			planetId: PLANET,
		});

		const tags = wrapper.findAllComponents(PTag);
		expect(tags.map((t) => t.props("type"))).toEqual([
			"secondary",
			// no price on the exchange: amber
			"warning",
			"secondary",
		]);
		expect(tags[1].text()).toBe("exchanges.labels.no_price");
		expect(tags[2].text()).toBe("exchanges.labels.fixed_planet");

		const links = ["GRN", "NUT", "H2O"].map((t) =>
			wrapper
				.find(`[data-source=${t}]`)
				.findComponent(RouterLinkStub)
				.props("to")
		);
		expect(links).toEqual([
			`/exchanges/${CX_UUID}?scope=all`,
			`/exchanges/${CX_UUID}?scope=${PLANET}`,
			`/exchanges/${CX_UUID}?scope=${PLANET}`,
		]);
	});

	it("shows sources without links when there is no CX", async () => {
		const { wrapper } = await mountTable({
			prices: book,
			planetId: PLANET,
		});

		expect(wrapper.findAll("[data-source]")).toHaveLength(3);
		expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0);
	});

	it("shows no sources without prices", async () => {
		const { wrapper } = await mountTable();

		expect(wrapper.findAll("[data-source]")).toHaveLength(0);
		expect(wrapper.find("[data-market]").exists()).toBe(false);
	});

	it("compares each output's COGM with its market price", async () => {
		const { wrapper } = await mountComponent(
			PlanCOGMTable,
			{
				data: DATA,
				market: (ticker: string) => (ticker === "RAT" ? 120 : 0),
			},
			{ messages: MARKET_MESSAGE }
		);

		// (64.43 − 120) ÷ 120 = −46 %
		expect(wrapper.find("[data-market=RAT]").text()).toBe(
			"market 120.00 · -46 %"
		);
		// no market price, no comparison
		expect(wrapper.find("[data-market=DW]").exists()).toBe(false);
	});
});
