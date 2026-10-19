import { describe, it, expect, vi } from "vitest";
import { h, type VNode } from "vue";

import CXScopeRules from "@/features/exchanges/components/CXScopeRules.vue";
import { ALL_PLANETS } from "@/features/exchanges/cxEdit.util";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { CXData } from "@/features/api/schemas/cxData.schemas";
import type { IPriceBook, IPriceSource } from "@/features/cx/priceBook";
import type { IExchangeNote } from "@/features/exchanges/exchangeNotes.util";

// the children have their own tests; the stubs show what they are given
vi.mock("@/features/exchanges/components/CXNotes.vue", () => ({
	default: {
		name: "CXNotes",
		props: ["notes"],
		emits: ["open", "use-cogm"],
		render: (ctx: { $slots: { default: () => VNode[] } }) =>
			h("div", { id: "notes" }, ctx.$slots.default()),
	},
}));
vi.mock("@/features/exchanges/components/CXExchangeRule.vue", () => ({
	default: {
		name: "CXExchangeRule",
		props: ["rules", "isPlanet", "inherited"],
		emits: ["update:rules"],
		render: () => null,
	},
}));
vi.mock("@/features/exchanges/components/CXFixedPriceTable.vue", () => ({
	default: {
		name: "CXFixedPriceTable",
		props: ["prices", "inherited", "cogms", "marketPrice", "location"],
		emits: ["update:prices"],
		render: () => null,
	},
}));
vi.mock("@/features/exchanges/components/CXPlanetPrices.vue", () => ({
	default: {
		name: "CXPlanetPrices",
		props: ["planet", "planetLabel", "rows", "pricedData"],
		emits: ["open"],
		render: () => null,
	},
}));

const cxData: CXData = {
	cx_empire: [{ type: "BOTH", exchange: "NC1_30D" }],
	cx_planets: [
		{ planet: "A", preferences: [{ type: "BUY", exchange: "AI1_7D" }] },
		{ planet: "B", preferences: [{ type: "SELL", exchange: "IC1_ASK" }] },
	],
	ticker_empire: [{ type: "BUY", ticker: "RAT", value: 75 }],
	ticker_planets: [
		{
			planet: "A",
			preferences: [{ type: "BOTH", ticker: "DW", value: 5 }],
		},
	],
};

const source: IPriceSource = {
	level: "empire_exchange",
	exchange: "NC1",
	key: "vwap_30d",
	zero: false,
	volume: "NC1",
};

const priceBookFor = vi.fn((): IPriceBook => ({
	getPrice: () => 42,
	getPriceSource: () => source,
}));

async function mountRules(props: Record<string, unknown> = {}) {
	const onUpdate = vi.fn();
	const { wrapper } = await mountComponent(CXScopeRules, {
		cxData: structuredClone(cxData),
		"onUpdate:cxData": onUpdate,
		scope: ALL_PLANETS,
		notes: [] as IExchangeNote[],
		cogms: new Map(),
		pricedData: cxData,
		priceBookFor,
		...props,
	});
	return { wrapper, onUpdate };
}

const child = (
	wrapper: Awaited<ReturnType<typeof mountRules>>["wrapper"],
	name: string
) => wrapper.getComponent({ name });

describe("CXScopeRules", () => {
	describe("all planets", () => {
		it("shows the empire rules and fixed prices", async () => {
			const { wrapper } = await mountRules();

			expect(wrapper.find("h2").text()).toBe("exchanges.rules.all_title");
			expect(wrapper.find("#notes p").text()).toBe(
				"exchanges.rules.all_description"
			);
			expect(child(wrapper, "CXExchangeRule").props()).toMatchObject({
				rules: cxData.cx_empire,
				isPlanet: false,
				inherited: [],
			});
			expect(child(wrapper, "CXFixedPriceTable").props()).toMatchObject({
				prices: cxData.ticker_empire,
				inherited: [],
				location: "exchanges_view",
			});
			expect(
				wrapper.findComponent({ name: "CXPlanetPrices" }).exists()
			).toBe(false);
			expect(wrapper.text()).not.toContain("exchanges.rules.unplanned");
		});

		it("hands the COGMs to the fixed price table", async () => {
			const cogms = new Map([
				["RAT", { ticker: "RAT", value: 70, entries: [] }],
			]);
			const { wrapper } = await mountRules({ cogms });

			expect(child(wrapper, "CXFixedPriceTable").props("cogms")).toBe(
				cogms
			);
		});

		it("writes edited rules and prices to the empire lists", async () => {
			const { wrapper, onUpdate } = await mountRules();
			const rules = [{ type: "SELL", exchange: "IC1_BID" }];
			const prices = [{ type: "SELL", ticker: "FE", value: 9 }];

			child(wrapper, "CXExchangeRule").vm.$emit("update:rules", rules);
			child(wrapper, "CXFixedPriceTable").vm.$emit(
				"update:prices",
				prices
			);

			expect(onUpdate).toHaveBeenNthCalledWith(1, {
				...cxData,
				cx_empire: rules,
			});
			// the parent owns the model: each edit builds on the unchanged prop
			expect(onUpdate).toHaveBeenNthCalledWith(2, {
				...cxData,
				ticker_empire: prices,
			});
		});

		it("prices a ticker without its fixed price on the empire level", async () => {
			const { wrapper } = await mountRules();
			const marketPrice = child(wrapper, "CXFixedPriceTable").props(
				"marketPrice"
			) as (t: string, type: "BUY" | "SELL") => unknown;

			expect(marketPrice("RAT", "BUY")).toEqual({ price: 42, source });

			const [planet, data] = priceBookFor.mock.lastCall as unknown as [
				string | undefined,
				CXData,
			];
			expect(planet).toBeUndefined();
			expect(data.ticker_empire).toEqual([]);
			expect(data.ticker_planets[0].preferences).toHaveLength(1);
		});

		it("passes the notes' events on", async () => {
			const note = { code: "fixed_zero", kind: "info" } as IExchangeNote;
			const { wrapper } = await mountRules({ notes: [note] });
			const notes = child(wrapper, "CXNotes");

			notes.vm.$emit("open", "A");
			notes.vm.$emit("use-cogm", note);

			const root = wrapper.findComponent(CXScopeRules);
			expect(root.emitted("open")).toEqual([["A"]]);
			expect(root.emitted("use-cogm")).toEqual([[note]]);
		});
	});

	describe("planet", () => {
		const planetProps = { scope: "A", planetLabel: "Alpha" };

		it("shows the planet's rules over the inherited ones", async () => {
			const rows = [
				{ ticker: "DW", buy: null, sell: null, planets: ["A"] },
			];
			const { wrapper } = await mountRules({
				...planetProps,
				planetRows: rows,
			});

			expect(wrapper.find("h2").text()).toBe("Alpha");
			expect(wrapper.find("#notes p").text()).toBe(
				"exchanges.rules.planet_description"
			);
			expect(child(wrapper, "CXExchangeRule").props()).toMatchObject({
				rules: cxData.cx_planets[0].preferences,
				isPlanet: true,
				inherited: cxData.cx_empire,
			});
			expect(child(wrapper, "CXFixedPriceTable").props()).toMatchObject({
				prices: cxData.ticker_planets[0].preferences,
				inherited: cxData.ticker_empire,
				cogms: undefined,
			});
			expect(child(wrapper, "CXPlanetPrices").props()).toMatchObject({
				planet: "A",
				planetLabel: "Alpha",
				rows,
				pricedData: cxData,
			});
		});

		it("shows no rules for a planet without an entry", async () => {
			const { wrapper } = await mountRules({
				scope: "Z",
				planetLabel: "Zeta",
			});

			expect(child(wrapper, "CXExchangeRule").props("rules")).toEqual([]);
			expect(child(wrapper, "CXFixedPriceTable").props("prices")).toEqual(
				[]
			);
			expect(child(wrapper, "CXPlanetPrices").props("rows")).toEqual([]);
		});

		it("writes edits to the planet's entries and leaves the others", async () => {
			const { wrapper, onUpdate } = await mountRules(planetProps);
			const rules = [{ type: "BOTH", exchange: "CI1_ASK" }];
			const prices = [{ type: "BUY", ticker: "FE", value: 3 }];

			child(wrapper, "CXExchangeRule").vm.$emit("update:rules", rules);
			child(wrapper, "CXFixedPriceTable").vm.$emit(
				"update:prices",
				prices
			);

			expect(onUpdate).toHaveBeenNthCalledWith(1, {
				...cxData,
				cx_planets: [
					cxData.cx_planets[1],
					{ planet: "A", preferences: rules },
				],
			});
			expect(onUpdate).toHaveBeenNthCalledWith(2, {
				...cxData,
				ticker_planets: [{ planet: "A", preferences: prices }],
			});
		});

		it("removes the planet's entry when its rules are emptied", async () => {
			const { wrapper, onUpdate } = await mountRules(planetProps);

			child(wrapper, "CXExchangeRule").vm.$emit("update:rules", []);

			expect(onUpdate).toHaveBeenCalledWith({
				...cxData,
				cx_planets: [cxData.cx_planets[1]],
			});
		});

		it("prices a ticker on the planet without its fixed price", async () => {
			const { wrapper } = await mountRules(planetProps);
			const marketPrice = child(wrapper, "CXFixedPriceTable").props(
				"marketPrice"
			) as (t: string, type: "BUY" | "SELL") => unknown;

			expect(marketPrice("DW", "SELL")).toEqual({ price: 42, source });

			const [planet, data] = priceBookFor.mock.lastCall as unknown as [
				string | undefined,
				CXData,
			];
			expect(planet).toBe("A");
			expect(data.ticker_planets[0].preferences).toEqual([]);
			expect(data.ticker_empire).toEqual(cxData.ticker_empire);
		});

		it("offers to delete a planet that no plan uses", async () => {
			const { wrapper } = await mountRules({
				...planetProps,
				unplanned: true,
			});

			expect(wrapper.text()).toContain("exchanges.rules.unplanned");
			await wrapper
				.findAll("button")
				.find((b) => b.text() === "exchanges.rules.delete")!
				.trigger("click");

			expect(
				wrapper.findComponent(CXScopeRules).emitted("delete")
			).toEqual([["A"]]);
		});

		it("passes the planet prices' open on", async () => {
			const { wrapper } = await mountRules(planetProps);

			child(wrapper, "CXPlanetPrices").vm.$emit("open", "all");

			expect(wrapper.findComponent(CXScopeRules).emitted("open")).toEqual(
				[["all"]]
			);
		});
	});
});
