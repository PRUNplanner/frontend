import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

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

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));
vi.mock("@/database/services/usePlanetData", () => ({
	usePlanetData: () => ({ planetName: (id: string) => id }),
}));
vi.mock(
	"@/features/material_tile/components/MaterialTile.vue",
	async () => (await import("@/tests/stubs")).materialTile
);
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
			min !== max || new Set(planets.map((p) => p.source.level)).size > 1,
	};
};

const rows: IMaterialPriceRow[] = [
	{
		ticker: "DW",
		buy: side([
			{ planet: "A", price: 0, source: src("planet_ticker", null, true) },
			{
				planet: "B",
				price: 87.72,
				source: src("empire_exchange", "NC1"),
			},
		]),
		sell: side([
			{
				planet: "C",
				price: 84.25,
				source: src("planet_exchange", "IC1"),
			},
		]),
		planets: ["A", "B", "C"],
	},
	{
		ticker: "FE",
		buy: side([
			{
				planet: "A",
				price: 0,
				source: src("empire_exchange", "NC1", true),
			},
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
		{
			planet: "A",
			preferences: [{ type: "BOTH", ticker: "DW", value: 0 }],
		},
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

async function mountOverview(
	props: Record<string, unknown> = {},
	messages?: Record<string, unknown>
) {
	const { wrapper } = await mountComponent(
		CXOverview,
		{
			cxData,
			pricedData: cxData,
			rows,
			notes,
			planetCounts: [1, 3],
			...props,
		},
		{ messages }
	);
	return wrapper;
}

const tickers = (wrapper: VueWrapper) =>
	tableRows(wrapper).map((r) => r.material);

const pick = async (wrapper: VueWrapper, filter: string) =>
	wrapper
		.findAll("button")
		.find((b) => b.text() === `exchanges.overview.filter.${filter}`)!
		.trigger("click");

// labels spelled out, to tell the rules apart
const labels = {
	exchanges: {
		labels: {
			exchange_basis: "{exchange} {basis}",
			universe: "Universe",
			basis: { vwap_30d: "VWAP 30D", ask: "Ask" },
		},
		rule: {
			inherited_part: "{type}: {rule}",
			side: { buy: "Buy", sell: "Sell" },
		},
	},
};

type MediaListener = (e: { matches: boolean }) => void;
const media = { listener: undefined as MediaListener | undefined, removed: 0 };

// the layout switches at 1024px
function screen(wide: boolean) {
	vi.stubGlobal("matchMedia", () => ({
		matches: wide,
		addEventListener: (_: string, cb: MediaListener) =>
			(media.listener = cb),
		removeEventListener: () => media.removed++,
	}));
}

describe("CXOverview", () => {
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
		media.listener = undefined;
		media.removed = 0;
	});
	afterEach(() => vi.unstubAllGlobals());

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
		// the source sits under the price
		expect(dw.buy).toBe(
			`${formatNumber(0)}–${formatNumber(87.72)}exchanges.overview.varies`
		);
		expect(dw.sell).toContain(formatNumber(84.25));
		expect(dw.planets).toBe("A, B, C");
		expect(fe.sell).toBe("–");
		expect(rat.buy).toBe(`${formatNumber(75)} exchanges.labels.fixed_all`);
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
		expect(wrapper.text()).not.toContain(
			"exchanges.notes.exchange_gap.title"
		);
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

	it("shows the hidden planets in a tooltip", async () => {
		const many = { ...rows[2], planets: ["A", "B", "C", "D", "E"] };
		const wrapper = await mountOverview({ rows: [many] });

		await wrapper.find("tbody [tabindex='0']").trigger("focusin");

		expect(
			document.body.querySelector("[role=tooltip]")?.textContent?.trim()
		).toBe("A, B, C, D, E");
	});

	it("shows a sell-only material with its varying sources", async () => {
		const sellOnly: IMaterialPriceRow = {
			ticker: "BSE",
			buy: null,
			sell: side([
				{ planet: "A", price: 10, source: src("empire_ticker") },
				{
					planet: "B",
					price: 10,
					source: src("empire_exchange", "NC1"),
				},
			]),
			planets: ["A", "B"],
		};
		const wrapper = await mountOverview({ rows: [sellOnly] });
		const [row] = tableRows(wrapper);

		expect(row.buy).toBe("–");
		expect(row.sell).toBe(`${formatNumber(10)}exchanges.overview.varies`);
	});

	it("shortens Used on to three planets", async () => {
		const many = { ...rows[2], planets: ["A", "B", "C", "D", "E"] };
		const wrapper = await mountOverview({ rows: [many] });

		expect(tableRows(wrapper)[0].planets).toBe(
			"A, B, Cexchanges.overview.used_on_more"
		);
	});

	it("keeps each planet of Used on on one line", async () => {
		const wrapper = await mountOverview();
		const planets = wrapper
			.find('td[data-col-key="planets"]')
			.findAll("span.whitespace-nowrap")
			.map((s) => s.text());

		expect(planets).toEqual(["A", "B", "C"]);
	});

	describe("all planets rule", () => {
		const ruleText = async (cx_empire: CXData["cx_empire"]) => {
			const wrapper = await mountOverview(
				{ cxData: { ...cxData, cx_empire } },
				labels
			);
			return wrapper.find("dd").text();
		};

		it("names the single rule for both sides", async () => {
			expect(
				await ruleText([{ type: "BOTH", exchange: "NC1_30D" }])
			).toBe("NC1 VWAP 30D");
		});

		it("falls back to the Universe without rules", async () => {
			expect(await ruleText([])).toBe("Universe VWAP 30D");
		});

		it("lists a rule per side otherwise", async () => {
			expect(
				await ruleText([
					{ type: "BUY", exchange: "NC1_30D" },
					{ type: "SELL", exchange: "IC1_ASK" },
				])
			).toBe("Buy: NC1 VWAP 30D · Sell: IC1 Ask");
		});
	});

	it("counts fixed prices of the empire and every planet", async () => {
		const wrapper = await mountOverview({
			cxData: {
				...cxData,
				ticker_planets: [
					{
						planet: "A",
						preferences: [
							{ type: "BUY", ticker: "DW", value: 1 },
							{ type: "SELL", ticker: "DW", value: 2 },
						],
					},
					{
						planet: "B",
						preferences: [{ type: "BOTH", ticker: "FE", value: 3 }],
					},
				],
			},
		});

		// one row per ticker: RAT, DW (its buy and sell price), FE
		expect(wrapper.findAll("dd")[2].text()).toBe("3");
	});

	it("explains an empty table", async () => {
		const wrapper = await mountOverview({ rows: [] });
		expect(wrapper.text()).toContain("exchanges.overview.empty");

		const other = await mountOverview();
		await other.find("input").setValue("zzz");
		expect(other.text()).toContain("exchanges.overview.no_match");
	});

	it("expands only the sides a material has", async () => {
		const wrapper = await mountOverview();
		const fe = wrapper.findAll("tbody [aria-expanded]")[1];

		await fe.trigger("click");

		expect(
			wrapper
				.findAllComponents({ name: "CXPriceLadder" })
				.map((l) => `${l.props("type")}#${l.props("planet")}`)
		).toEqual(["BUY#A"]);
	});

	it("passes a ladder's open on", async () => {
		const wrapper = await mountOverview();
		await wrapper.find("tbody [aria-expanded]").trigger("click");

		wrapper
			.findAllComponents({ name: "CXPriceLadder" })[0]
			.vm.$emit("open", "B");

		expect(wrapper.findComponent(CXOverview).emitted("open")).toEqual([
			["B"],
		]);
	});

	describe("narrow screens", () => {
		const phone = async (props: Record<string, unknown> = {}) => {
			screen(false);
			return mountOverview(props);
		};
		const sideButton = (wrapper: VueWrapper, side: string) =>
			wrapper
				.findAll("button")
				.find((b) => b.text() === `exchanges.overview.side.${side}`)!;

		it("shows one side with its price and source under it", async () => {
			const wrapper = await phone();

			expect(
				wrapper.findAll("thead th[data-col-key]").map((th) => th.text())
			).toEqual([
				"exchanges.overview.columns.material",
				"exchanges.overview.columns.buy",
			]);
			expect(tableRows(wrapper).map((r) => r.buy)).toEqual([
				`${formatNumber(0)}–${formatNumber(87.72)}exchanges.overview.varies`,
				expect.stringContaining(formatNumber(0)),
				expect.stringContaining(formatNumber(75)),
			]);
			expect(sideButton(wrapper, "BUY").attributes("aria-pressed")).toBe(
				"true"
			);
		});

		it("switches to the sell side and leaves out materials without it", async () => {
			const wrapper = await phone();

			await sideButton(wrapper, "SELL").trigger("click");

			expect(tickers(wrapper)).toEqual(["DW"]);
			expect(tableRows(wrapper)[0].sell).toContain(formatNumber(84.25));
			expect(wrapper.findAll("thead th[data-col-key]")[1].text()).toBe(
				"exchanges.overview.columns.sell"
			);
		});

		it("expands the ladders of the shown side only", async () => {
			const wrapper = await phone();
			await sideButton(wrapper, "SELL").trigger("click");

			await wrapper.find("tbody [aria-expanded]").trigger("click");

			expect(
				wrapper
					.findAllComponents({ name: "CXPriceLadder" })
					.map((l) => `${l.props("type")}#${l.props("planet")}`)
			).toEqual(["SELL#C"]);
		});

		it("follows the screen width", async () => {
			const wrapper = await phone();
			expect(wrapper.find("th[data-col-key=planets]").exists()).toBe(
				false
			);

			media.listener!({ matches: true });
			await flushPromises();
			expect(wrapper.find("th[data-col-key=planets]").exists()).toBe(
				true
			);
			expect(wrapper.text()).not.toContain(
				"exchanges.overview.side_label"
			);

			media.listener!({ matches: false });
			await flushPromises();
			expect(wrapper.find("th[data-col-key=planets]").exists()).toBe(
				false
			);
		});

		it("stops listening when it unmounts", async () => {
			const wrapper = await phone();

			wrapper.unmount();

			expect(media.removed).toBe(1);
		});
	});

	it("lays out wide without matchMedia", async () => {
		vi.stubGlobal("matchMedia", undefined);
		const wrapper = await mountOverview();

		expect(wrapper.find("th[data-col-key=planets]").exists()).toBe(true);
	});
});
