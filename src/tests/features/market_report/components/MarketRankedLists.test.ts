import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import { callDataExchanges } from "@/features/api/gameData.api";
import MarketGaps from "@/features/market_report/components/MarketGaps.vue";
import MarketLeaders from "@/features/market_report/components/MarketLeaders.vue";
import MarketMoversTable from "@/features/market_report/components/MarketMoversTable.vue";
import { marketMovers } from "@/features/market_report/marketReport.util";
import PSelect from "@/ui/components/PSelect.vue";
import { formatMaterialName, materialCategoryClass } from "@/util/text";
import { mountComponent } from "@/tests/mountComponent";

import fixture from "@/tests/test_data/api_data_market_summary.json";
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/api/gameData.api", async (importOriginal) => ({
	...(await importOriginal<object>()),
	callDataExchanges: vi.fn(),
}));

const summary = fixture as MarketSummary;
type Wrapper = Awaited<ReturnType<typeof mountComponent>>["wrapper"];

const tableKeys = (w: Wrapper) =>
	w.findAll("tbody tr[data-row-key]").map((r) => r.attributes("data-row-key"));
const showAll = (w: Wrapper) => w.find("button[aria-expanded]");

describe("market report ranked lists", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("movers: top 8, Show all pages at 25, back to page 1 on a switch", async () => {
		const rising = marketMovers(summary.materials, "rising");
		const falling = marketMovers(summary.materials, "falling");
		expect(rising.length).toBeGreaterThan(50);

		const { wrapper, setProps } = await mountComponent(MarketMoversTable, {
			summary,
			direction: "rising",
		});
		expect(tableKeys(wrapper)).toEqual(
			rising.slice(0, 8).map((m) => m.ticker)
		);
		// the phone rows show the same
		expect(wrapper.findAll("ol > li")).toHaveLength(8);
		// category colours and names
		expect(wrapper.find("tbody .material-category-metals").exists()).toBe(
			true
		);
		expect(wrapper.find("tbody").text()).toContain("Iron");

		expect(showAll(wrapper).attributes("aria-expanded")).toBe("false");
		expect(showAll(wrapper).text()).toBe(
			"market_report.list.show_all.rising"
		);
		await showAll(wrapper).trigger("click");
		expect(showAll(wrapper).attributes("aria-expanded")).toBe("true");
		expect(showAll(wrapper).text()).toBe("market_report.list.show_top");
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "movers",
			view: "all",
		});
		expect(tableKeys(wrapper)).toHaveLength(25);

		await wrapper
			.findAll("nav button")
			.find((b) => b.text() === "2")!
			.trigger("click");
		expect(tableKeys(wrapper)).toEqual(
			rising.slice(25, 50).map((m) => m.ticker)
		);

		// a switch keeps the list open and goes back to page 1
		await setProps({ direction: "falling" });
		expect(showAll(wrapper).attributes("aria-expanded")).toBe("true");
		expect(tableKeys(wrapper)).toEqual(
			falling.slice(0, 25).map((m) => m.ticker)
		);

		await showAll(wrapper).trigger("click");
		expect(tableKeys(wrapper)).toHaveLength(8);
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "movers",
			view: "falling",
		});
	});

	it("movers sort the whole list before the top 8, by header or Sort by", async () => {
		const rising = marketMovers(summary.materials, "rising");
		const busiest = [...rising]
			.sort((a, b) => b.turnover_7d - a.turnover_7d)
			.slice(0, 8)
			.map((m) => m.ticker);

		const { wrapper, setProps } = await mountComponent(MarketMoversTable, {
			summary,
			direction: "rising",
		});
		const header = wrapper.find('th[data-col-key="turnover_7d"]');
		await header.find("button").trigger("click");
		expect(header.attributes("aria-sort")).toBe("descending");
		expect(tableKeys(wrapper)).toEqual(busiest);

		// the spark column doesn't sort
		expect(
			wrapper.find('th[data-col-key="spark"]').attributes("aria-sort")
		).toBeUndefined();

		// a switch resets the sort
		await setProps({ direction: "falling" });
		expect(
			wrapper.find('th[data-col-key="turnover_7d"]').attributes("aria-sort")
		).toBe("none");

		// the phone's select gives the same order
		await setProps({ direction: "rising" });
		const select = wrapper.findComponent(PSelect);
		expect(
			select.props("options").map((o: { value: unknown }) => o.value)
		).toEqual(["change_pct", "label", "vwap_7d", "turnover_7d"]);
		select.vm.$emit("update:value", "turnover_7d");
		await flushPromises();
		expect(tableKeys(wrapper)).toEqual(busiest);
		select.vm.$emit("update:value", "label");
		await flushPromises();
		expect(
			wrapper.find('th[data-col-key="label"]').attributes("aria-sort")
		).toBe("ascending");
		select.vm.$emit("update:value", "change_pct");
		await flushPromises();
		expect(tableKeys(wrapper)).toEqual(
			rising.slice(0, 8).map((m) => m.ticker)
		);
	});

	it("movers without any mover or price", async () => {
		const thin: MarketSummary = {
			...summary,
			materials: [
				{
					...summary.materials[0],
					vwap_7d: null,
					change_pct: null,
				},
			],
		};
		const { wrapper } = await mountComponent(MarketMoversTable, {
			summary: thin,
			direction: "rising",
		});
		expect(wrapper.text()).toContain("market_report.movers.empty");
		expect(showAll(wrapper).exists()).toBe(false);
	});

	it("leaders: ranked, top 10 in two columns, Show all", async () => {
		const { wrapper } = await mountComponent(MarketLeaders, { summary });
		const ranks = () =>
			wrapper.findAll("ol > li").map((li) => li.find("span").text());
		expect(ranks()).toEqual(
			Array.from({ length: 10 }, (_, i) => String(i + 1))
		);
		expect(wrapper.find("ol").classes()).toContain("lg:grid-cols-2");

		await showAll(wrapper).trigger("click");
		expect(ranks()).toHaveLength(25);
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "leaders",
			view: "all",
		});
		await showAll(wrapper).trigger("click");
		expect(ranks()).toHaveLength(10);
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "leaders",
			view: "top",
		});
	});
});

describe("price gaps", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	// twelve materials on AI1 and IC1, every VWAP gap above the minimum
	const material = (ticker: string) =>
		summary.materials.find((m) => m.ticker === ticker)!;
	const book = (
		ticker: string,
		exchange_code: string,
		vwap_7d: number,
		ask: number,
		bid: number
	) =>
		({
			ticker,
			exchange_code,
			vwap_7d,
			sum_traded_7d: 10_000,
			ask,
			bid,
		}) as Exchange;
	const tickers = summary.materials
		.filter((m) => !m.is_flat)
		.slice(0, 12)
		.map((m) => m.ticker);
	// gaps of 20 % + i, VWAP open on even rows; books: one open gap
	const books = tickers.flatMap((t, i) => [
		book(t, "AI1", 100, 100, 90),
		book(t, "IC1", 120 + i, 150, i % 2 ? 90 : 101),
	]);

	it("both bases, top 10, headers and Books now", async () => {
		vi.mocked(callDataExchanges).mockResolvedValue(books);
		const { wrapper, setProps } = await mountComponent(MarketGaps, {
			summary,
			basis: "vwap",
		});
		await flushPromises();
		const keys = tableKeys(wrapper);
		expect(keys).toHaveLength(10);
		expect(keys[0]).toBe(tickers[11]);
		expect(wrapper.find('th[data-col-key="now"]').exists()).toBe(true);
		expect(wrapper.find("thead").text()).toContain(
			"market_report.gaps.col.low_vwap"
		);
		// row 11 (i = 10) is open, row 10 closed
		const nowCells = wrapper.findAll('td[data-col-key="now"]');
		expect(nowCells[1].text()).toContain("market_report.gaps.open");
		expect(nowCells[0].text()).toContain("market_report.gaps.closed");
		const m = material(tickers[11]);
		expect(wrapper.find("tbody").text()).toContain(
			formatMaterialName(m.name, m.ticker)
		);
		expect(wrapper.find(`tbody .${materialCategoryClass(m.category)}`).exists()).toBe(true);

		await showAll(wrapper).trigger("click");
		expect(tableKeys(wrapper)).toHaveLength(12);
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "gaps",
			view: "all",
		});

		// Books now sorts open gaps first
		await wrapper.find('th[data-col-key="now"] button').trigger("click");
		expect(
			wrapper
				.findAll('td[data-col-key="now"]')
				.slice(0, 6)
				.every((td) => td.text().includes("market_report.gaps.open"))
		).toBe(true);

		await setProps({ basis: "books" });
		// the ask 100 on AI1 against the bid 101 on IC1 is 1 %: none open
		expect(tableKeys(wrapper)).toEqual([]);
		expect(wrapper.text()).toContain("market_report.gaps.empty");
		expect(wrapper.find('th[data-col-key="now"]').exists()).toBe(false);
		expect(wrapper.find("thead").text()).toContain(
			"market_report.gaps.col.low_books"
		);
		expect(showAll(wrapper).exists()).toBe(false);
	});

	it("books basis, missing sides, prices and the phone's Sort by", async () => {
		const [a, b, c] = tickers;
		vi.mocked(callDataExchanges).mockResolvedValue([
			// open in the books: ask 50.5 on AI1, bid 60 on IC1
			book(a, "AI1", 50.25, 50.5, 40),
			book(a, "IC1", 70, 80, 60),
			// no ask on the cheap side, no bid on the dear one
			book(b, "AI1", 500, 0, 450),
			book(b, "IC1", 900.5, 950, 0),
			book(c, "AI1", 2000, 2100, 1900),
			book(c, "IC1", 3000, 3100, 2000),
		]);
		const { wrapper, setProps } = await mountComponent(MarketGaps, {
			summary,
			basis: "vwap",
		});
		await flushPromises();
		const text = wrapper.find("tbody").text();
		expect(text).toContain("market_report.gaps.no_ask");
		expect(text).toContain("market_report.gaps.no_bid");
		expect(text).toContain("market_report.gaps.ask_on");
		// whole prices without decimals, small ones with two
		expect(text).toContain("2,000");
		expect(text).toContain("50.25");
		expect(text).toContain("900.5");

		const select = wrapper.findComponent(PSelect);
		expect(
			select.props("options").map((o: { value: unknown }) => o.value)
		).toEqual(["gap", "label", "now"]);
		select.vm.$emit("update:value", "now");
		await flushPromises();
		expect(
			wrapper.find('th[data-col-key="now"]').attributes("aria-sort")
		).toBe("descending");
		expect(tableKeys(wrapper)[0]).toBe(a);
		select.vm.$emit("update:value", "label");
		await flushPromises();
		expect(
			wrapper.find('th[data-col-key="label"]').attributes("aria-sort")
		).toBe("ascending");
		select.vm.$emit("update:value", "gap");
		await flushPromises();
		expect(
			wrapper.find('th[data-col-key="label"]').attributes("aria-sort")
		).toBe("none");

		await setProps({ basis: "books" });
		expect(tableKeys(wrapper)).toEqual([a]);
		expect(wrapper.find("tbody").text()).toContain(
			"market_report.gaps.ask"
		);
		expect(wrapper.findComponent(PSelect).props("options")).toHaveLength(2);
	});

	it("collapsing sends the basis", async () => {
		vi.mocked(callDataExchanges).mockResolvedValue(books);
		const { wrapper } = await mountComponent(MarketGaps, {
			summary,
			basis: "vwap",
		});
		await flushPromises();
		await showAll(wrapper).trigger("click");
		await showAll(wrapper).trigger("click");
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "gaps",
			view: "vwap",
		});
	});

	it("a skeleton while the books load, the error with retry", async () => {
		vi.mocked(callDataExchanges).mockRejectedValue(new Error("down"));
		const { wrapper } = await mountComponent(MarketGaps, {
			summary,
			basis: "books",
		});
		await flushPromises();
		expect(wrapper.find("[role=alert]").exists()).toBe(true);

		vi.mocked(callDataExchanges).mockReturnValue(new Promise(() => {}));
		await wrapper.find("[role=alert] button").trigger("click");
		expect(wrapper.find("[data-skeleton]").exists()).toBe(true);
	});
});
