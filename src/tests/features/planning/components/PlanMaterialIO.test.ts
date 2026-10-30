import { describe, it, expect, vi } from "vitest";

import PlanMaterialIO from "@/features/planning/components/PlanMaterialIO.vue";
import { mountComponent } from "@/tests/mountComponent";
import planMessages from "@/locales/en_US/plan.json";
import cxMessages from "@/locales/en_US/cx.json";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { createPriceBook } from "@/features/cx/priceBook";
import { marketCheck } from "@/features/cx/marketCheck.util";

// Types & Interfaces
import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";
import type { CXData } from "@/features/api/schemas/cxData.schemas";
import type { Exchange } from "@/features/api/schemas/gameData.schemas";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));

vi.mock(
	"@/features/material_tile/components/MaterialTile.vue",
	async () => (await import("@/tests/stubs")).materialTile
);

const ROWS: IMaterialIO[] = [
	{
		ticker: "RAT",
		input: 10,
		output: 0,
		delta: -10,
		price: -1234.5,
		individualWeight: 0.21,
		individualVolume: 0.1,
		totalWeight: -2.1,
		totalVolume: -1,
	},
];

const NUMERIC = ["input", "output", "delta", "price"];

async function mountTable(props: Record<string, unknown> = {}) {
	return mountComponent(PlanMaterialIO, {
		materialIOData: ROWS,
		...props,
	});
}

describe("PlanMaterialIO", () => {
	it("filters exports and imports by the delta's sign", async () => {
		const rows: IMaterialIO[] = [
			...ROWS,
			{ ...ROWS[0], ticker: "DW", input: 0, output: 5, delta: 5, price: 80 },
		];
		const tickers = async (filter?: string) =>
			(await mountTable({ materialIOData: rows, ...(filter ? { filter } : {}) }))
				.wrapper.findAllComponents({ name: "MaterialTile" })
				.map((c) => c.props("ticker"))
				.sort();

		expect(await tickers()).toEqual(["DW", "RAT"]);
		expect(await tickers("exports")).toEqual(["DW"]);
		expect(await tickers("imports")).toEqual(["RAT"]);
	});

	it("shows ȼ, t or m³ per day in the value column", async () => {
		const cols = async (props: Record<string, unknown> = {}) =>
			(await mountTable(props)).wrapper
				.findAll("th[data-col-key]")
				.map((th) => th.attributes("data-col-key"));

		expect(await cols()).toEqual([
			"ticker",
			"input",
			"output",
			"delta",
			"price",
		]);
		expect((await cols({ value: "weight" })).at(-1)).toBe("totalWeight");
		expect((await cols({ value: "volume" })).at(-1)).toBe("totalVolume");
	});

	it("right-aligns every numeric column, header and cells", async () => {
		const { wrapper } = await mountTable();

		const numeric = (cell: "th" | "td") =>
			wrapper
				.findAll(`${cell}[data-col-key]`)
				.map((c) => [c.attributes("data-col-key"), c.classes("numeric")]);
		const expected = [["ticker", false], ...NUMERIC.map((k) => [k, true])];

		expect(numeric("th")).toEqual(expected);
		expect(numeric("td")).toEqual(expected);
	});

	it("labels the ticker column", async () => {
		const { wrapper } = await mountTable();

		expect(
			wrapper.find('th[data-col-key="ticker"] button').text()
		).toBe("terms.material_ticker");
	});

	it("titles the price column, its cell holds only the number", async () => {
		const { wrapper } = await mountTable();

		expect(wrapper.find('th[data-col-key="price"]').text()).toBe(
			"plan.components.materialio.table.cost_day"
		);
		expect(wrapper.find('td[data-col-key="price"]').text()).toBe(
			"-1,234.50"
		);
	});

	it("limits the body under its header when given a max height", async () => {
		const box = ".p-data-table-box";

		expect(
			(await mountTable()).wrapper.find(box).attributes("style") ?? ""
		).not.toContain("max-height");
		expect(
			(await mountTable({ maxHeight: "300px" })).wrapper
				.find(box)
				.attributes("style")
		).toContain("max-height: calc(302px)");
	});
});

describe("PlanMaterialIO market flags", () => {
	// an ASK preference on an exchange without offers prices RAT at 0
	const cx: CXData = {
		cx_empire: [{ type: "BOTH", exchange: "AI1_ASK" }],
		cx_planets: [],
		ticker_empire: [],
		ticker_planets: [],
	};
	const exchange = {
		ask: 0,
		bid: 90,
		sum_traded_30d: 3000,
		sum_traded_7d: 700,
		exchange_status: "ACTIVE",
	} as Exchange;
	const checks = () =>
		new Map(
			marketCheck(
				ROWS,
				createPriceBook(() => cx, undefined, () => exchange),
				() => exchange
			).map((c) => [c.ticker, c])
		);

	async function mountFlagged() {
		const onOpen = vi.fn();
		const { wrapper } = await mountComponent(
			PlanMaterialIO,
			{
				materialIOData: ROWS,
				checks: checks(),
				"onOpen:planCheck": onOpen,
			},
			{ messages: { cx: cxMessages }, attach: true }
		);
		return { wrapper, onOpen };
	}

	it("shows no price for a material without offers, as a title on hover", async () => {
		const { wrapper } = await mountFlagged();
		const flag = wrapper.find("[data-market-flag]");

		expect(flag.attributes("title")).toBe("RAT: No price");
		await flag.trigger("mouseenter");
		expect(document.body.querySelector("[role=dialog]")).toBeNull();
		expect(wrapper.find("[data-market-summary]").text()).toContain(
			"1 material can't trade as planned."
		);
	});

	/** the flag, its details opened by a click */
	async function openFlag(wrapper: VueWrapper) {
		const flag = wrapper.find("[data-market-flag]");
		(flag.element as HTMLElement).focus();
		await flag.trigger("click");
		await flushPromises();
		return flag;
	}
	const panel = () => document.body.querySelector("[role=dialog]");

	it("opens the details on click and tracks it", async () => {
		const { wrapper } = await mountFlagged();
		await openFlag(wrapper);

		expect(panel()!.textContent).toContain("No price");
		expect(panel()!.textContent).toContain("You buy");
		expect(trackEvent).toHaveBeenCalledWith("plan:market_flag_open", {
			where: "plan",
			level: "red",
		});
	});

	it("closes the details on Esc and returns focus to the flag", async () => {
		const { wrapper } = await mountFlagged();
		const flag = await openFlag(wrapper);
		// tabbed into the details
		panel()!.querySelector("button")!.focus();
		expect(document.activeElement).not.toBe(flag.element);

		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
		);
		await flushPromises();

		expect(panel()).toBeNull();
		expect(document.activeElement).toBe(flag.element);
	});

	it("closes the details on a click outside", async () => {
		const { wrapper } = await mountFlagged();
		await openFlag(wrapper);

		document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		await flushPromises();

		expect(panel()).toBeNull();
	});

	it("asks the view to open Plan check", async () => {
		const { wrapper, onOpen } = await mountFlagged();
		await openFlag(wrapper);

		(
			[...panel()!.querySelectorAll("button")].find((b) =>
				b.textContent?.includes("Open Plan check")
			) as HTMLElement
		).click();

		expect(onOpen).toHaveBeenCalledOnce();
	});

	it("shows no flag and no summary without checks", async () => {
		const { wrapper } = await mountTable();
		expect(wrapper.find("[data-market-flag]").exists()).toBe(false);
		expect(wrapper.find("[data-market-summary]").exists()).toBe(false);
		expect(wrapper.find("[data-share-note]").exists()).toBe(false);
	});

	it("shows Δ as a 7d and 30d market share, coloured and sortable", async () => {
		const rows: IMaterialIO[] = [
			// 10 a day of 70 in 7 days (14 %) and 600 in 30 days (50 %)
			ROWS[0],
			{ ...ROWS[0], ticker: "DW", input: 0, output: 1, delta: 1 },
			// not traded at all
			{ ...ROWS[0], ticker: "OVE", delta: -3 },
		];
		const market = new Map(
			[
				{ ticker: "RAT", traded7d: 70, traded30d: 600 },
				{ ticker: "DW", traded7d: 700, traded30d: 3000 },
				{ ticker: "OVE", traded7d: 0, traded30d: 0 },
			].map((c) => [c.ticker, { ...c, exchange: "NC1" }])
		);
		const { wrapper } = await mountComponent(
			PlanMaterialIO,
			{ materialIOData: rows, market, value: "share" },
			{ messages: { plan: planMessages } }
		);
		const cell = (row: number, key: string) =>
			wrapper.findAll("tbody tr").at(row)!.find(`td[data-col-key="${key}"]`);

		expect(
			wrapper.findAll("th[data-col-key]").map((th) => th.attributes("data-col-key"))
		).toEqual(["ticker", "input", "output", "delta", "share7d", "share30d"]);
		expect(cell(0, "share7d").text()).toBe("100 %");
		expect(cell(0, "share7d").find("span").classes()).toEqual([
			"text-negative",
		]);
		expect(cell(0, "share30d").text()).toBe("50.0 %");
		expect(cell(1, "share7d").text()).toBe("1.0 %");
		expect(cell(1, "share7d").find("span").classes()).toEqual([]);
		expect(cell(2, "share7d").text()).toBe("—");
		expect(wrapper.find("[data-share-note]").text()).toContain("NC1");

		const sortBy30d = () =>
			wrapper.find('th[data-col-key="share30d"] button').trigger("click");
		const order = () =>
			wrapper
				.findAllComponents({ name: "MaterialTile" })
				.map((c) => c.props("ticker"));
		// largest share first, then smallest, untraded last/first
		await sortBy30d();
		expect(order()).toEqual(["RAT", "DW", "OVE"]);
		await sortBy30d();
		expect(order()).toEqual(["OVE", "DW", "RAT"]);
	});
});
