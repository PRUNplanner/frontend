import { describe, it, expect, vi, beforeEach } from "vitest";
import { h } from "vue";

import CXPlanetPrices from "@/features/exchanges/components/CXPlanetPrices.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";
import { formatNumber } from "@/util/numbers";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Types & Interfaces
import type { CXData } from "@/features/api/schemas/cxData.schemas";
import type { IPriceSource } from "@/features/cx/priceBook";
import type {
	IMaterialPriceRow,
	IMaterialSide,
} from "@/features/exchanges/useExchangePlanData.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render: (ctx: { ticker: string }) => h("span", ctx.ticker),
	},
}));
// the ladder has its own test
vi.mock("@/features/exchanges/components/CXPriceLadder.vue", () => ({
	default: {
		name: "CXPriceLadder",
		props: ["cxData", "planet", "ticker", "type"],
		emits: ["open"],
		render: () => null,
	},
}));

const source: IPriceSource = {
	level: "empire_exchange",
	exchange: "NC1",
	key: "vwap_30d",
	zero: false,
	volume: "NC1",
};

const side = (planet: string, price: number): IMaterialSide => ({
	planets: [{ planet, price, source }],
	min: price,
	max: price,
	varies: false,
});

// DW: both sides on planet A; FE: buys on B only; RAT: sells on A only
const rows: IMaterialPriceRow[] = [
	{
		ticker: "DW",
		buy: side("A", 87.72),
		sell: side("A", 84.25),
		planets: ["A"],
	},
	{ ticker: "FE", buy: side("B", 10), sell: null, planets: ["B"] },
	{ ticker: "RAT", buy: null, sell: side("A", 75), planets: ["A"] },
];

const pricedData: CXData = {
	cx_empire: [],
	cx_planets: [],
	ticker_empire: [],
	ticker_planets: [],
};

async function mountPrices(props: Record<string, unknown> = {}) {
	const { wrapper } = await mountComponent(CXPlanetPrices, {
		planet: "A",
		planetLabel: "Alpha",
		rows,
		pricedData,
		...props,
	});
	return wrapper;
}

describe("CXPlanetPrices", () => {
	beforeEach(() => vi.mocked(trackEvent).mockClear());

	it("lists the planet's buy and sell prices, one row each", async () => {
		const wrapper = await mountPrices();

		expect(wrapper.find("h3").text()).toBe("exchanges.rules.prices_on");
		expect(
			tableRows(wrapper).map((r) => [r.ticker, r.type, r.price])
		).toEqual([
			["DW", "exchanges.overview.side.BUY", formatNumber(87.72)],
			["DW", "exchanges.overview.side.SELL", formatNumber(84.25)],
			["RAT", "exchanges.overview.side.SELL", formatNumber(75)],
		]);
	});

	it("leaves out materials other planets use", async () => {
		const wrapper = await mountPrices({ planet: "B" });

		expect(tableRows(wrapper).map((r) => r.ticker)).toEqual(["FE"]);
	});

	it("shows the empty hint without prices", async () => {
		const wrapper = await mountPrices({ planet: "Z" });

		expect(tableRows(wrapper)).toEqual([]);
		expect(wrapper.text()).toContain("exchanges.rules.prices_empty");
	});

	it("expands a row to its ladder and tracks the opened material", async () => {
		const wrapper = await mountPrices();

		await wrapper.findAll("tbody [aria-expanded]")[1].trigger("click");

		const ladder = wrapper.getComponent({ name: "CXPriceLadder" });
		expect(ladder.props()).toMatchObject({
			cxData: pricedData,
			planet: "A",
			ticker: "DW",
			type: "SELL",
		});
		expect(trackEvent).toHaveBeenCalledTimes(1);
		expect(trackEvent).toHaveBeenCalledWith("exchange:price_detail", {
			location: "exchanges_view",
			material_ticker: "DW",
		});

		// collapsing is not an opening
		await wrapper.findAll("tbody [aria-expanded]")[1].trigger("click");
		expect(wrapper.findComponent({ name: "CXPriceLadder" }).exists()).toBe(
			false
		);
		expect(trackEvent).toHaveBeenCalledTimes(1);
	});

	it("passes the ladder's open to its parent", async () => {
		const wrapper = await mountPrices();
		await wrapper.find("tbody [aria-expanded]").trigger("click");

		wrapper.getComponent({ name: "CXPriceLadder" }).vm.$emit("open", "all");

		expect(wrapper.findComponent(CXPlanetPrices).emitted("open")).toEqual([
			["all"],
		]);
	});
});
