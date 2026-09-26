import {
	describe,
	it,
	expect,
	beforeAll,
	beforeEach,
	onTestFinished,
	vi,
} from "vitest";
import { h } from "vue";
import { flushPromises, VueWrapper } from "@vue/test-utils";

import { planetsStore } from "@/database/stores";
import { usePlanetData } from "@/database/services/usePlanetData";
import CXPlanetPreferenceTable from "@/features/exchanges/components/CXPlanetPreferenceTable.vue";
import CXExchangePreference from "@/features/exchanges/components/CXExchangePreference.vue";
import CXTickerPreference from "@/features/exchanges/components/CXTickerPreference.vue";
import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
import { PButton, PTag } from "@/ui";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// Types & Interfaces
import { ICXPlanetMap } from "@/features/exchanges/manageCX.types";

// test data
import planets from "@/tests/test_data/api_data_planets.json";

// vi.mock factories are hoisted, so are their helpers
const { editor, mounts } = vi.hoisted(() => {
	const mounts = { exchange: 0, ticker: 0 };
	return {
		mounts,
		// the editors have their own tests, count mounts to see remounts
		editor: (name: string, counter: "exchange" | "ticker") => ({
			default: {
				name,
				props: { cxOptions: Array },
				emits: ["update:cxOptions"],
				setup: () => {
					mounts[counter]++;
					return () => null;
				},
			},
		}),
	};
});

vi.mock("@/features/exchanges/components/CXExchangePreference.vue", () =>
	editor("CXExchangePreference", "exchange")
);
vi.mock("@/features/exchanges/components/CXTickerPreference.vue", () =>
	editor("CXTickerPreference", "ticker")
);
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render: () => h("div"),
	},
}));

// KW-020c is named Milliways, KW-020a has no name, ZZ-999z is unknown
function planetMap(): ICXPlanetMap {
	return {
		"KW-020c": {
			planet: "KW-020c",
			exchanges: [
				{ type: "BUY", exchange: "AI1_30D" },
				{ type: "SELL", exchange: "NC1_7D" },
				{ type: "BOTH", exchange: "UNIVERSE_30D" },
			],
			ticker: [
				{ type: "BUY", ticker: "RAT", value: 1234.5 },
				{ type: "SELL", ticker: "DW", value: 80 },
				{ type: "BOTH", ticker: "C", value: 0.126 },
			],
		},
		"KW-020a": { planet: "KW-020a", exchanges: [], ticker: [] },
		"ZZ-999z": {
			planet: "ZZ-999z",
			exchanges: [],
			ticker: [{ type: "SELL", ticker: "H2O", value: 30 }],
		},
	};
}

const MILLIWAYS = "Milliways (KW-020c)";
const TITLE = "exchanges.components.planet_preferences.title";

const names = (wrapper: VueWrapper) => tableRows(wrapper).map((r) => r.planet);

async function mountTable() {
	const mounted = await mountComponent(CXPlanetPreferenceTable, {
		planetMap: planetMap(),
	});
	// planet names load async, unnamed and unknown planets show their id
	await vi.waitFor(() =>
		expect(names(mounted.wrapper)).toEqual([
			MILLIWAYS,
			"KW-020a",
			"ZZ-999z",
		])
	);
	return mounted;
}

const heading = (wrapper: VueWrapper) =>
	wrapper.find("h2").text().replace(/\s+/g, " ");

const editButtons = (wrapper: VueWrapper) =>
	wrapper
		.findAllComponents(PButton)
		.filter((b) => b.element.closest('td[data-col-key="buttons"]'));

async function edit(wrapper: VueWrapper, row: number) {
	await editButtons(wrapper).at(row)!.trigger("click");
	await flushPromises();
}

/** tags of a column, as "type text" */
function tags(wrapper: VueWrapper, column: "exchanges" | "ticker", row = 0) {
	const cell = wrapper
		.findAll(`td[data-col-key="${column}"]`)
		.at(row)!.element;
	return wrapper
		.findAllComponents(PTag)
		.filter((t) => cell.contains(t.element))
		.map((t) => `${t.props("type")} ${t.text().replace(/\s+/g, " ")}`);
}

describe("CXPlanetPreferenceTable", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await planetsStore.setMany(planets);
		await usePlanetData().reload();
	});

	beforeEach(() => {
		mounts.exchange = 0;
		mounts.ticker = 0;
	});

	it("lists the planets by name in map order", async () => {
		const { wrapper } = await mountTable();

		expect(names(wrapper)).toEqual([MILLIWAYS, "KW-020a", "ZZ-999z"]);
	});

	it("shows a placeholder while a planet name loads", async () => {
		// ZZ-999z is not in memory, hold its IndexedDB lookup
		const get = vi
			.spyOn(planetsStore, "get")
			.mockReturnValue(new Promise(() => {}));
		onTestFinished(() => {
			get.mockRestore();
		});

		const { wrapper } = await mountComponent(CXPlanetPreferenceTable, {
			planetMap: planetMap(),
		});
		await vi.waitFor(() =>
			expect(names(wrapper)).toEqual([MILLIWAYS, "KW-020a", "..."])
		);
		expect(wrapper.text()).not.toContain("[object Promise]");
	});

	it("sorts by planet", async () => {
		const { wrapper } = await mountTable();
		const header = wrapper.find('th[data-col-key="planet"]');
		const order = () => names(wrapper);

		// by natural id, descending on the first click
		await header.trigger("click");
		expect(order()).toEqual(["ZZ-999z", MILLIWAYS, "KW-020a"]);
		await header.trigger("click");
		expect(order()).toEqual(["KW-020a", MILLIWAYS, "ZZ-999z"]);
	});

	it("tags the exchange preferences by type", async () => {
		const { wrapper } = await mountTable();

		expect(tags(wrapper, "exchanges")).toEqual([
			"success exchanges.preference_type.BUY: AI1_30D",
			"error exchanges.preference_type.SELL: NC1_7D",
			"primary exchanges.preference_type.BOTH: UNIVERSE_30D",
		]);
		expect(tags(wrapper, "exchanges", 1)).toEqual([]);
	});

	it("tags the ticker preferences by type with their price", async () => {
		const { wrapper } = await mountTable();

		// two decimals with thousands: 1234.5 → 1,234.50, 0.126 → 0.13
		expect(tags(wrapper, "ticker")).toEqual([
			"success exchanges.preference_type.BUY: 1,234.50ȼ",
			"error exchanges.preference_type.SELL: 80.00ȼ",
			"primary exchanges.preference_type.BOTH: 0.13ȼ",
		]);
		expect(tags(wrapper, "ticker", 2)).toEqual([
			"error exchanges.preference_type.SELL: 30.00ȼ",
		]);
		expect(
			wrapper
				.findAllComponents(MaterialTile)
				.map((t) => t.props("ticker"))
		).toEqual(["RAT", "DW", "C", "H2O"]);
	});

	it("shows an empty table without planets", async () => {
		const { wrapper } = await mountComponent(CXPlanetPreferenceTable, {
			planetMap: {},
		});

		expect(tableRows(wrapper)).toHaveLength(0);
		expect(heading(wrapper)).toBe(TITLE);
		expect(wrapper.findComponent(CXExchangePreference).exists()).toBe(
			false
		);
	});

	it("opens and closes the editors of a planet", async () => {
		const { wrapper } = await mountTable();
		const types = () => editButtons(wrapper).map((b) => b.props("type"));

		expect(heading(wrapper)).toBe(TITLE);
		expect(wrapper.findComponent(CXExchangePreference).exists()).toBe(
			false
		);
		expect(types()).toEqual(["primary", "primary", "primary"]);

		await edit(wrapper, 0);
		expect(heading(wrapper)).toBe(`${TITLE}: ${MILLIWAYS}`);
		expect(types()).toEqual(["success", "primary", "primary"]);
		expect(
			wrapper.findComponent(CXExchangePreference).props("cxOptions")
		).toEqual(planetMap()["KW-020c"].exchanges);
		expect(
			wrapper.findComponent(CXTickerPreference).props("cxOptions")
		).toEqual(planetMap()["KW-020c"].ticker);

		await edit(wrapper, 0);
		expect(heading(wrapper)).toBe(TITLE);
		expect(wrapper.findComponent(CXTickerPreference).exists()).toBe(false);
		expect(types()).toEqual(["primary", "primary", "primary"]);
	});

	it("switches to another planet with fresh editors", async () => {
		const { wrapper } = await mountTable();

		await edit(wrapper, 0);
		await edit(wrapper, 2);

		await vi.waitFor(() =>
			expect(heading(wrapper)).toBe(`${TITLE}: ZZ-999z`)
		);
		expect(
			wrapper.findComponent(CXTickerPreference).props("cxOptions")
		).toEqual([{ type: "SELL", ticker: "H2O", value: 30 }]);
		expect(editButtons(wrapper).map((b) => b.props("type"))).toEqual([
			"primary",
			"primary",
			"success",
		]);
		// keyed by planet, the editors remount
		expect(mounts).toEqual({ exchange: 2, ticker: 2 });
	});

	it("hands up the map with the edited exchanges", async () => {
		const { wrapper, component } = await mountTable();
		await edit(wrapper, 1);
		const exchanges = [{ type: "BOTH", exchange: "IC1_BID" }];

		wrapper
			.findComponent(CXExchangePreference)
			.vm.$emit("update:cxOptions", exchanges);

		const expected = planetMap();
		expected["KW-020a"].exchanges = exchanges as never;
		expect(component.emitted("update:planetMap")).toEqual([[expected]]);
	});

	it("hands up the map with the edited tickers", async () => {
		const { wrapper, component, setProps } = await mountTable();
		await edit(wrapper, 0);
		const ticker = [{ type: "BUY", ticker: "RAT", value: 99 }];

		wrapper
			.findComponent(CXTickerPreference)
			.vm.$emit("update:cxOptions", ticker);

		const expected = planetMap();
		expected["KW-020c"].ticker = ticker as never;
		expect(component.emitted("update:planetMap")).toEqual([[expected]]);

		// the parent passes it back
		await setProps({ planetMap: expected });
		expect(
			wrapper.findComponent(CXTickerPreference).props("cxOptions")
		).toEqual(ticker);
		expect(tags(wrapper, "ticker")).toEqual([
			"success exchanges.preference_type.BUY: 99.00ȼ",
		]);
		// the exchanges editor keeps its planet
		expect(
			wrapper.findComponent(CXExchangePreference).props("cxOptions")
		).toEqual(planetMap()["KW-020c"].exchanges);
	});
});
