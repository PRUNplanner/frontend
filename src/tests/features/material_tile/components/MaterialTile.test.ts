import { describe, it, expect, beforeEach, vi } from "vitest";
import { h } from "vue";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";

import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { reportError, trackEvent } from "@/lib/analytics/useAnalytics";
import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
import MaterialMarketCard from "@/features/material_tile/components/MaterialMarketCard.vue";
import { mountComponent } from "@/tests/mountComponent";
import { useUserStore } from "@/stores/userStore";
import { createPinia, setActivePinia } from "pinia";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";

// counts the overview builds, which happen on the first open only
const overviewCalls = vi.hoisted(() => vi.fn());
vi.mock("@/database/services/useExchangeData", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("@/database/services/useExchangeData")
		>();
	return {
		useExchangeData: () => {
			const api = actual.useExchangeData();
			return {
				...api,
				getMaterialExchangeOverview: (ticker: string) => {
					overviewCalls(ticker);
					return api.getMaterialExchangeOverview(ticker);
				},
			};
		},
	};
});
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));
// the card's sparklines
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: () => ({
		execute: async () => ({ exchange: "AI1", days: 30, series: {} }),
	}),
}));
// the chart loads market data, tested on its own
vi.mock(
	"@/features/market_exploration/components/MaterialDataChart.vue",
	() => ({
		default: {
			name: "MaterialDataChart",
			props: { materialTicker: String, metric: String },
			render: () => h("div"),
		},
	})
);
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const RED = "rgb(255, 0, 0)";
const ORANGE = "rgb(255, 165, 0)";
const YELLOW = "rgb(255, 255, 71)";
const GREEN = "rgb(60, 179, 113)";

const gradient = (empty: string, color: string) =>
	`background: linear-gradient(transparent ${empty}%, ${color} 0%);`;

async function mountTile(
	props: Record<string, unknown> = {},
	options: Parameters<typeof mountComponent>[2] = {}
) {
	const mounted = await mountComponent(
		MaterialTile,
		{ key: "tile", ticker: "FE", ...props },
		options
	);
	// the material loads in onMounted
	await vi.waitFor(() =>
		expect(mounted.wrapper.find(".material-category-metals").exists()).toBe(
			true
		)
	);
	return mounted;
}

/** the hover card's trigger around the ticker */
const trigger = (wrapper: VueWrapper) => wrapper.find("[role=button]");
const tile = (wrapper: VueWrapper) => wrapper.find(".material-tile");
const indicator = (wrapper: VueWrapper) =>
	wrapper.find(".material-tile div[style]");
const body = () => new DOMWrapper(document.body);
const drawer = () => body().find("[role=dialog]");
const card = () => body().find("[data-material-market-card]");

/** keyboard focus opens the card at once */
async function openCard(wrapper: VueWrapper) {
	await trigger(wrapper).trigger("focusin");
	await vi.waitFor(() => expect(card().exists()).toBe(true));
}

describe("MaterialTile", () => {
	beforeEach(async () => {
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	beforeEach(() => {
		overviewCalls.mockClear();
		vi.mocked(trackEvent).mockClear();
	});

	it("shows the ticker in its category colour", async () => {
		const { wrapper } = await mountTile();

		expect(tile(wrapper).text()).toBe("FE");
		expect(tile(wrapper).classes()).toContain("material-category-metals");
	});

	it("prefixes the amount", async () => {
		const { wrapper, setProps } = await mountTile({ amount: 1234.5 });

		expect(tile(wrapper).text()).toBe("1,234.50x FE");

		// whole amounts drop the decimals
		await setProps({ amount: 10 });
		expect(tile(wrapper).text()).toBe("10x FE");
	});

	it("fills the indicator with the share of max", async () => {
		const { wrapper, setProps } = await mountTile({ amount: 10, max: 100 });

		// 10 of 100 -> 90 % stays empty
		expect(indicator(wrapper).attributes("style")).toBe(
			gradient("90.0000", RED)
		);

		// 1 of 3 -> 100 - 33.3333 = 66.6667
		await setProps({ amount: 1, max: 3 });
		expect(indicator(wrapper).attributes("style")).toBe(
			gradient("66.6667", ORANGE)
		);
	});

	it.each([
		// amount of 100: empty share -> colour
		[24, "76.0000", RED],
		[25, "75.0000", ORANGE],
		[49, "51.0000", ORANGE],
		[50, "50.0000", YELLOW],
		[74, "26.0000", YELLOW],
		[75, "25.0000", GREEN],
		[100, "0.0000", GREEN],
		// over max overflows to a negative empty share
		[150, "-50.0000", GREEN],
	])("colours %s of 100 by the empty share", async (amount, empty, color) => {
		const { wrapper } = await mountTile({ amount, max: 100 });

		expect(indicator(wrapper).attributes("style")).toBe(
			gradient(empty, color)
		);
	});

	it("shows an empty indicator without amount", async () => {
		const { wrapper } = await mountTile({ max: 100 });

		expect(indicator(wrapper).attributes("style")).toBe(
			gradient("100.0000", RED)
		);
	});

	it("has no indicator without max", async () => {
		const { wrapper } = await mountTile({ amount: 10 });

		expect(indicator(wrapper).exists()).toBe(false);
	});

	it("builds no market overview before a card opens", async () => {
		const { wrapper } = await mountComponent({
			render: () =>
				h(
					"div",
					Array.from({ length: 50 }, (_, i) =>
						h(MaterialTile, { key: i, ticker: "FE", daily: -5 })
					)
				),
		});
		await vi.waitFor(() =>
			expect(wrapper.findAll(".material-category-metals")).toHaveLength(50)
		);
		await flushPromises();

		expect(overviewCalls).not.toHaveBeenCalled();
	});

	it("opens the market card with the row's data, built once", async () => {
		const check = {
			ticker: "FE",
			delta: -5,
			exchange: "IC1",
			sharePct: 0.2,
			traded30d: 1,
			traded7d: 1,
			bid: 1,
			ask: 1,
			spreadPct: null,
			flags: [],
			level: null,
		};
		const { wrapper } = await mountTile({
			daily: -5,
			marketCheck: check,
			dailyContext: "empire",
		});
		expect(trigger(wrapper).attributes("aria-expanded")).toBe("false");

		await openCard(wrapper);
		const props = wrapper.findComponent(MaterialMarketCard).props();
		expect(props).toMatchObject({
			ticker: "FE",
			daily: -5,
			dailyContext: "empire",
			marketCheck: check,
			pinned: false,
			clickOnly: false,
			sheet: false,
		});
		expect(trigger(wrapper).attributes("aria-expanded")).toBe("true");
		expect(trigger(wrapper).attributes("aria-controls")).toBe(
			body().find("[role=region]").attributes("id")
		);
		expect(trigger(wrapper).attributes("aria-describedby")).toBeUndefined();

		await trigger(wrapper).trigger("focusout");
		await openCard(wrapper);
		expect(overviewCalls).toHaveBeenCalledTimes(1);
	});

	it("pins the card on a click without a drawer", async () => {
		const { wrapper } = await mountTile();
		expect(tile(wrapper).classes()).toContain("hover:cursor-help");

		await tile(wrapper).trigger("click");
		await vi.waitFor(() => expect(card().exists()).toBe(true));
		expect(wrapper.findComponent(MaterialMarketCard).props("pinned")).toBe(
			true
		);
		expect(drawer().exists()).toBe(false);
		expect(trackEvent).toHaveBeenCalledWith("material:market_card_pin", {
			material_ticker: "FE",
		});

		// a second click unpins and closes it
		await tile(wrapper).trigger("click");
		await flushPromises();
		expect(card().exists()).toBe(false);
	});

	it("shows ticker and amount without a card", async () => {
		const { wrapper } = await mountTile({
			enablePopover: false,
			amount: 10,
		});

		expect(trigger(wrapper).exists()).toBe(false);
		expect(tile(wrapper).text()).toBe("10x FE");
		expect(tile(wrapper).classes()).not.toContain("hover:cursor-help");
		expect(tile(wrapper).classes()).not.toContain("hover:cursor-pointer");
	});

	it("toggles the Market details drawer when enabled", async () => {
		const { wrapper } = await mountTile({ disableDrawer: false });
		expect(tile(wrapper).classes()).toContain("hover:cursor-pointer");

		await tile(wrapper).trigger("click");
		await vi.waitFor(() =>
			expect(body().find("[data-material-market-details]").exists()).toBe(
				true
			)
		);
		expect(drawer().text()).toContain("material_tile.details.title");
		expect(trackEvent).toHaveBeenCalledWith("material:market_drawer_open", {
			material_ticker: "FE",
			source: "tile",
		});

		await tile(wrapper).trigger("click");
		await flushPromises();
		expect(drawer().exists()).toBe(false);
	});

	it("opens the drawer from the card's Market details button", async () => {
		const { wrapper } = await mountTile();
		await openCard(wrapper);

		await body().find("[data-details]").trigger("click");
		await vi.waitFor(() =>
			expect(body().find("[data-material-market-details]").exists()).toBe(
				true
			)
		);
		expect(card().exists()).toBe(false);
		expect(trackEvent).toHaveBeenCalledWith("material:market_drawer_open", {
			material_ticker: "FE",
			source: "card",
		});
	});

	describe("on click only", () => {
		async function mountClickOnly(props: Record<string, unknown> = {}) {
			const pinia = createPinia();
			setActivePinia(pinia);
			useUserStore().setPreference("marketCardTrigger", "click");
			return mountTile(props, { pinia });
		}

		it("opens nothing on hover or focus", async () => {
			const { wrapper } = await mountClickOnly();

			await trigger(wrapper).trigger("pointerenter", {
				pointerType: "mouse",
			});
			await trigger(wrapper).trigger("focusin");
			await new Promise((resolve) => setTimeout(resolve, 400));

			expect(card().exists()).toBe(false);
			expect(overviewCalls).not.toHaveBeenCalled();
		});

		it("pins the card on a click, also where a click opens the drawer", async () => {
			const { wrapper } = await mountClickOnly({ disableDrawer: false });

			await tile(wrapper).trigger("click");
			await vi.waitFor(() =>
				expect(wrapper.findComponent(MaterialMarketCard).exists()).toBe(
					true
				)
			);
			expect(drawer().exists()).toBe(false);
			expect(wrapper.findComponent(MaterialMarketCard).props()).toMatchObject(
				{ pinned: true, clickOnly: true, clickOpensDetails: false }
			);
			expect(card().text()).toContain("material_tile.card.hint_click");

			// Market details opens the drawer
			await body().find("[data-details]").trigger("click");
			await vi.waitFor(() =>
				expect(
					body().find("[data-material-market-details]").exists()
				).toBe(true)
			);
			expect(card().exists()).toBe(false);
		});
	});

	it("opens a bottom sheet on touch", async () => {
		const { wrapper } = await mountTile({ disableDrawer: false });

		await trigger(wrapper).trigger("pointerdown", { pointerType: "touch" });
		await tile(wrapper).trigger("click");
		await vi.waitFor(() =>
			expect(wrapper.findComponent(MaterialMarketCard).exists()).toBe(true)
		);
		expect(wrapper.findComponent(MaterialMarketCard).props("sheet")).toBe(
			true
		);
		expect(drawer().attributes("aria-labelledby")).toBeDefined();
	});

	it("still shows the ticker of an unknown material", async () => {
		const { wrapper } = await mountComponent(MaterialTile, {
			key: "tile",
			ticker: "NOPE",
			disableDrawer: false,
		});
		await vi.waitFor(() => expect(reportError).toHaveBeenCalled());

		expect(tile(wrapper).text()).toBe("NOPE");
		// without material data the drawer stays closed
		await tile(wrapper).trigger("click");
		await flushPromises();
		expect(drawer().exists()).toBe(false);
	});
});
