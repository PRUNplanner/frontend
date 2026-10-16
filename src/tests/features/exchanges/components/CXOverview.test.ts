import { describe, it, expect, vi, beforeEach } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import CXOverview from "@/features/exchanges/components/CXOverview.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";
import { formatNumber } from "@/util/numbers";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Types & Interfaces
import type { CXData } from "@/features/api/schemas/cxData.schemas";
import type { IPriceSource } from "@/features/cx/priceBook";
import type {
	IMaterialPriceRow,
	IPlanetPrice,
} from "@/features/exchanges/useExchangePlanData.types";
import type { IExchangeNote } from "@/features/exchanges/exchangeNotes.util";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/database/services/usePlanetData", () => ({
	usePlanetData: () => ({ planetName: (id: string) => id }),
}));
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
		render: () => null,
	},
}));

const src = (
	level: IPriceSource["level"],
	exchange: IPriceSource["exchange"] = null,
	zero = false
): IPriceSource => ({
	level,
	exchange,
	key: exchange ? "vwap_30d" : null,
	zero,
	volume: exchange ?? "UNIVERSE",
});

const side = (planets: IPlanetPrice[]) => {
	const prices = planets.map((p) => p.price);
	const min = Math.min(...prices);
	const max = Math.max(...prices);
	return {
		planets,
		min,
		max,
		varies:
			min !== max ||
			new Set(planets.map((p) => p.source.level)).size > 1,
	};
};

const rows: IMaterialPriceRow[] = [
	{
		ticker: "DW",
		buy: side([
			{ planet: "A", price: 0, source: src("planet_ticker", null, true) },
			{ planet: "B", price: 87.72, source: src("empire_exchange", "NC1") },
		]),
		sell: side([
			{ planet: "C", price: 84.25, source: src("planet_exchange", "IC1") },
		]),
		planets: ["A", "B", "C"],
	},
	{
		ticker: "FE",
		buy: side([
			{ planet: "A", price: 0, source: src("empire_exchange", "NC1", true) },
		]),
		sell: null,
		planets: ["A"],
	},
	{
		ticker: "RAT",
		buy: side([
			{ planet: "A", price: 75, source: src("empire_ticker") },
			{ planet: "B", price: 75, source: src("empire_ticker") },
		]),
		sell: null,
		planets: ["A", "B"],
	},
];

const cxData: CXData = {
	cx_empire: [{ type: "BOTH", exchange: "NC1_30D" }],
	cx_planets: [],
	ticker_empire: [{ type: "BUY", ticker: "RAT", value: 75 }],
	ticker_planets: [
		{ planet: "A", preferences: [{ type: "BOTH", ticker: "DW", value: 0 }] },
	],
};

const notes: IExchangeNote[] = [
	{
		code: "exchange_gap",
		kind: "warning",
		scope: "all",
		type: "BUY",
		option: "NC1_30D",
		tickers: ["FE"],
		planets: ["A"],
	},
];

async function mountOverview(props: Record<string, unknown> = {}) {
	const { wrapper } = await mountComponent(CXOverview, {
		cxData,
		pricedData: cxData,
		rows,
		notes,
		planetCounts: [1, 3],
		...props,
	});
	return wrapper;
}

const tickers = (wrapper: VueWrapper) =>
	tableRows(wrapper).map((r) => r.material);

const pick = async (wrapper: VueWrapper, filter: string) =>
	wrapper
		.findAll("button")
		.find((b) => b.text() === `exchanges.overview.filter.${filter}`)!
		.trigger("click");

describe("CXOverview", () => {
	beforeEach(() => vi.mocked(trackEvent).mockClear());

	it("shows the summary", async () => {
		const wrapper = await mountOverview();
		const values = wrapper.findAll("dd").map((d) => d.text());

		// rule label, own planets, fixed price rows
		expect(values).toEqual([
			"exchanges.labels.exchange_basis",
			"exchanges.overview.summary.own_value",
			"2",
		]);
	});

	it("shows one row per material, a range when planets differ", async () => {
		const wrapper = await mountOverview();
		const [dw, fe, rat] = tableRows(wrapper);

		expect(tickers(wrapper)).toEqual(["DW", "FE", "RAT"]);
		expect(dw.buy).toBe(`${formatNumber(0)}–${formatNumber(87.72)}`);
		expect(dw.buy_source).toBe("exchanges.overview.varies");
		expect(dw.sell).toBe(formatNumber(84.25));
		expect(dw.planets).toBe("A, B, C");
		expect(fe.sell).toBe("–");
		expect(rat.buy).toBe(formatNumber(75));
		expect(rat.buy_source).toBe("exchanges.labels.fixed_all");
	});

	it.each([
		["fixed", ["DW", "RAT"]],
		["no_price", ["FE"]],
		["varies", ["DW"]],
		["all", ["DW", "FE", "RAT"]],
	])("filters %s", async (filter, expected) => {
		const wrapper = await mountOverview();

		await pick(wrapper, filter);

		expect(tickers(wrapper)).toEqual(expected);
	});

	it("searches materials", async () => {
		const wrapper = await mountOverview();

		await wrapper.find("input").setValue("ra");

		expect(tickers(wrapper)).toEqual(["RAT"]);
	});

	it("expands a row to a ladder per planet and side", async () => {
		const wrapper = await mountOverview();

		await wrapper.find("tbody [aria-expanded]").trigger("click");

		const ladders = wrapper
			.findAllComponents({ name: "CXPriceLadder" })
			.map((l) => `${l.props("type")}#${l.props("planet")}`);
		expect(ladders).toEqual(["BUY#A", "BUY#B", "SELL#C"]);
		expect(trackEvent).toHaveBeenCalledWith("exchange:price_detail", {
			location: "exchanges_view",
			material_ticker: "DW",
		});
	});

	it("shows progress instead of the table while plans calculate", async () => {
		const wrapper = await mountOverview({
			calculating: true,
			progress: [1, 4],
		});

		expect(wrapper.find("table").exists()).toBe(false);
		expect(wrapper.text()).toContain("1 / 4");
	});

	it("opens a note's scope", async () => {
		const onOpen = vi.fn();
		const wrapper = await mountOverview({ onOpen });

		// notes start collapsed behind their count
		const toggle = wrapper.find("button[aria-expanded]");
		expect(toggle.attributes("aria-expanded")).toBe("false");
		expect(wrapper.text()).not.toContain("exchanges.notes.exchange_gap.title");
		await toggle.trigger("click");

		await wrapper
			.findAll("button")
			.find((b) => b.text() === "exchanges.notes.open")!
			.trigger("click");

		expect(onOpen).toHaveBeenCalledWith("all");
	});

	it("groups COGM drifts into one table with Use COGM", async () => {
		const drift = {
			code: "cogm_drift",
			kind: "info",
			scope: "all",
			tickers: ["RAT"],
			planets: ["A"],
			value: 75,
			cogm: 90,
		} as IExchangeNote;
		// a smaller gap, listed after RAT's
		const small = { ...drift, tickers: ["DW"], value: 95, cogm: 100 };
		const onUseCogm = vi.fn();
		const wrapper = await mountOverview({
			notes: [...notes, small, drift],
			onUseCogm,
		});
		await wrapper.find("button[aria-expanded]").trigger("click");

		const table = wrapper.findAll("table").at(0)!;
		const [rat, dw] = table.findAll("tbody tr");
		expect(rat.text()).toContain("RAT");
		expect(rat.text()).toContain(formatNumber(90));
		// fixed minus COGM, and in % of the COGM
		expect(rat.text()).toContain(formatNumber(-15));
		expect(rat.text()).toContain(formatNumber(-17, 0));
		expect(dw.text()).toContain("DW");
		await table.find("button").trigger("click");

		expect(onUseCogm).toHaveBeenCalledWith(drift);
	});

	it("shortens Used on to three planets", async () => {
		const many = { ...rows[2], planets: ["A", "B", "C", "D", "E"] };
		const wrapper = await mountOverview({ rows: [many] });

		expect(tableRows(wrapper)[0].planets).toBe(
			"A, B, C exchanges.overview.used_on_more"
		);
	});
});
