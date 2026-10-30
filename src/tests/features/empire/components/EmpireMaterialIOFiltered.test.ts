import { describe, it, expect, beforeAll, vi } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { useDB } from "@/database/composables/useDB";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import EmpireMaterialIOFiltered from "@/features/empire/components/EmpireMaterialIOFiltered.vue";
import EmpireMaterialIODetail from "@/features/empire/components/EmpireMaterialIODetail.vue";
import EmpireAnalysis from "@/features/empire/components/EmpireAnalysis.vue";
import PSelectMultiple from "@/ui/components/PSelectMultiple.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// Types & Interfaces
import type { IEmpireMaterialIO } from "@/features/empire/empire.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";

const planet = (planetId: string) => ({
	planetId,
	planUuid: `plan-${planetId}`,
	planName: planetId,
	planCOGC: "---",
	delta: 0,
	input: 0,
	output: 0,
	price: 0,
});

function io(
	ticker: string,
	input: number,
	output: number,
	inputPlanets: string[],
	outputPlanets: string[]
): IEmpireMaterialIO {
	return {
		ticker,
		input,
		output,
		delta: output - input,
		deltaPrice: 0,
		// @ts-expect-error mock data
		inputPlanets: inputPlanets.map(planet),
		// @ts-expect-error mock data
		outputPlanets: outputPlanets.map(planet),
	};
}

// RAT and DW are workforce consumables, FE and DW are load balanced
const MATERIAL_IO = [
	io("RAT", 10, 0, ["ZV-307c"], []),
	io("FE", 5, 20, ["KW-688c"], ["ZV-307c"]),
	io("BSE", 0, 8, [], ["KW-688c"]),
	io("DW", 3, 3, ["OT-580b"], ["OT-580b"]),
];

async function mountFiltered(empireMaterialIO = MATERIAL_IO) {
	return mountComponent(EmpireMaterialIOFiltered, {
		content: "materialio",
		empireMaterialIO,
		planListData: [],
	});
}

const tickers = (wrapper: VueWrapper) =>
	tableRows(wrapper).map((r) => r.ticker);

async function clickButton(wrapper: VueWrapper, label: string) {
	const button = wrapper.findAll("button").find((b) => b.text() === label);
	expect(button).toBeDefined();
	await button!.trigger("click");
	await flushPromises();
}

/** multi selects: 0 materials, 1 planets */
const selects = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(PSelectMultiple);

async function select(wrapper: VueWrapper, index: 0 | 1, value: string[]) {
	selects(wrapper)[index].vm.$emit("update:value", value);
	await flushPromises();
}

describe("EmpireMaterialIOFiltered", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
		await useDB(exchangesStore).preload();
	});

	it("shows all materials unfiltered", async () => {
		const { wrapper } = await mountFiltered();

		expect(tickers(wrapper)).toEqual(["RAT", "FE", "BSE", "DW"]);
	});

	it("offers each material and planet once as filter option", async () => {
		const { wrapper } = await mountFiltered();

		const values = (index: 0 | 1) =>
			(
				selects(wrapper)[index].props("options") as {
					value: string;
				}[]
			).map((o) => o.value);
		expect(values(0)).toEqual(["RAT", "FE", "BSE", "DW"]);
		// planet names are looked up in IndexedDB first
		await vi.waitFor(() =>
			expect(values(1)).toEqual(["ZV-307c", "KW-688c", "OT-580b"])
		);
	});

	it("filters by material", async () => {
		const { wrapper } = await mountFiltered();

		await select(wrapper, 0, ["BSE", "RAT"]);
		expect(tickers(wrapper)).toEqual(["RAT", "BSE"]);

		await select(wrapper, 0, []);
		expect(tickers(wrapper)).toHaveLength(4);
	});

	it("filters by input or output planet", async () => {
		const { wrapper } = await mountFiltered();

		await select(wrapper, 1, ["ZV-307c"]);
		expect(tickers(wrapper)).toEqual(["RAT", "FE"]);

		await select(wrapper, 1, ["KW-688c"]);
		expect(tickers(wrapper)).toEqual(["FE", "BSE"]);
	});

	it("shows only load balanced materials", async () => {
		const { wrapper } = await mountFiltered();

		await clickButton(wrapper, "empire.filters.loadbalance");
		expect(tickers(wrapper)).toEqual(["FE", "DW"]);

		await clickButton(wrapper, "empire.filters.all");
		expect(tickers(wrapper)).toHaveLength(4);
	});

	it("hides workforce consumables", async () => {
		const { wrapper } = await mountFiltered();

		await clickButton(wrapper, "common.buttons.hide");
		expect(tickers(wrapper)).toEqual(["FE", "BSE"]);

		await clickButton(wrapper, "common.buttons.show");
		expect(tickers(wrapper)).toHaveLength(4);
	});

	it("keeps the active option when it is clicked again", async () => {
		const { wrapper } = await mountFiltered();

		await clickButton(wrapper, "empire.filters.all");
		await clickButton(wrapper, "common.buttons.show");
		expect(tickers(wrapper)).toHaveLength(4);

		await clickButton(wrapper, "empire.filters.loadbalance");
		await clickButton(wrapper, "empire.filters.loadbalance");
		expect(tickers(wrapper)).toEqual(["FE", "DW"]);
	});

	it("combines filters", async () => {
		const { wrapper } = await mountFiltered();

		await clickButton(wrapper, "empire.filters.loadbalance");
		await clickButton(wrapper, "common.buttons.hide");
		expect(tickers(wrapper)).toEqual(["FE"]);

		await select(wrapper, 1, ["OT-580b"]);
		expect(tickers(wrapper)).toEqual([]);
	});

	it("re-applies active filters to new data", async () => {
		const { wrapper, setProps } = await mountFiltered();

		await clickButton(wrapper, "common.buttons.hide");
		await setProps({
			empireMaterialIO: [
				...MATERIAL_IO,
				io("COF", 1, 0, ["ZV-307c"], []),
				io("SF", 1, 0, ["ZV-307c"], []),
			],
		});

		expect(tickers(wrapper)).toEqual(["FE", "BSE", "SF"]);
	});

	it("expands every visible row, filters still apply", async () => {
		const { wrapper } = await mountFiltered();
		const open = () =>
			wrapper.findAllComponents(EmpireMaterialIODetail).length;

		await clickButton(wrapper, "empire.material_io.expand_all");
		expect(open()).toBe(4);

		await select(wrapper, 0, ["BSE", "RAT"]);
		expect(tickers(wrapper)).toEqual(["RAT", "BSE"]);
		expect(open()).toBe(2);

		await clickButton(wrapper, "common.buttons.hide");
		expect(tickers(wrapper)).toEqual(["BSE"]);
		expect(open()).toBe(1);

		await clickButton(wrapper, "empire.material_io.summary");
		expect(open()).toBe(0);
	});

	it("closes every open row with Summary, also when already selected", async () => {
		const { wrapper } = await mountFiltered();
		const open = () =>
			wrapper.findAllComponents(EmpireMaterialIODetail).length;
		const toggle = (i: number) => {
			const rows = wrapper.findAll(
				"button[aria-expanded]:not([data-market-flag])"
			);
			return rows[i].trigger("click");
		};

		// rows opened by hand
		await toggle(0);
		await toggle(1);
		await flushPromises();
		expect(open()).toBe(2);
		await clickButton(wrapper, "empire.material_io.summary");
		expect(open()).toBe(0);

		// Expand all, close one row: the others stay open until Summary
		await clickButton(wrapper, "empire.material_io.expand_all");
		await toggle(0);
		await flushPromises();
		expect(open()).toBe(3);
		await clickButton(wrapper, "empire.material_io.summary");
		expect(open()).toBe(0);
	});

	it("offers Expand all only on the Material I/O table", async () => {
		const { wrapper } = await mountComponent(EmpireMaterialIOFiltered, {
			content: "analysis",
			empireMaterialIO: MATERIAL_IO,
			planListData: [],
		});

		expect(wrapper.text()).not.toContain("empire.material_io.expand_all");
	});

	it("opens Material I/O filtered to a material picked in Analysis", async () => {
		const { wrapper, component, setProps } = await mountComponent(
			EmpireMaterialIOFiltered,
			{
				content: "analysis",
				empireMaterialIO: MATERIAL_IO,
				planListData: [],
			}
		);

		wrapper.findComponent(EmpireAnalysis).vm.$emit("open:material", "FE");
		await flushPromises();
		expect(component.emitted("update:content")).toEqual([["materialio"]]);

		await setProps({ content: "materialio" });
		await flushPromises();
		expect(tickers(wrapper)).toEqual(["FE"]);
		expect(selects(wrapper)[0].props("value")).toEqual(["FE"]);
	});
});

describe("EmpireMaterialIOFiltered market check", () => {
	// a plan's share of one material
	const part = (planId: string, delta: number) => ({
		...planet(planId),
		delta,
		input: Math.max(-delta, 0),
		output: Math.max(delta, 0),
	});
	// FE trades ~1,700 a day on all exchanges together (test data)
	function fe(a: number, b: number): IEmpireMaterialIO {
		const parts = [part("KW-688c", a), part("ZV-307c", b)];
		return {
			ticker: "FE",
			input: parts.reduce((s, p) => s + p.input, 0),
			output: parts.reduce((s, p) => s + p.output, 0),
			delta: a + b,
			deltaPrice: 0,
			// @ts-expect-error mock data
			inputPlanets: parts.filter((p) => p.input > 0),
			// @ts-expect-error mock data
			outputPlanets: parts.filter((p) => p.output > 0),
		};
	}
	it("flags the empire's net flow: netted out not, sold twice yes", async () => {
		const netted = (await mountFiltered([fe(1000, -1000)])).wrapper;
		expect(netted.find("[data-market-flag]").exists()).toBe(false);

		const twice = (await mountFiltered([fe(1000, 1000)])).wrapper;
		expect(twice.find("tbody [data-market-flag]").exists()).toBe(true);
		// 2,000 a day is bigger than the market
		expect(
			twice.find("[data-market-chips] [data-level=red]").exists()
		).toBe(true);

		// all exchanges together: volume, but no order book to quote
		await twice.find("tbody [data-market-flag]").trigger("click");
		await flushPromises();
		const popover = document.body.querySelector("[role=dialog]");
		expect(popover?.textContent).toContain(
			"cx.market_flags.popover.empire_share"
		);
		expect(popover?.textContent).not.toContain(
			"cx.market_flags.popover.bid_ask"
		);
	});

	it("filters the table by a flag chip and shows it pressed", async () => {
		const { wrapper } = await mountFiltered([
			fe(1000, 1000),
			io("RAT", 10, 0, ["ZV-307c"], []),
		]);
		const chip = (l: string) =>
			wrapper.find(`[data-market-chips] [data-level=${l}]`);

		expect(tickers(wrapper)).toEqual(["FE", "RAT"]);
		await chip("red").trigger("click");
		await flushPromises();
		expect(chip("red").attributes("aria-pressed")).toBe("true");
		expect(tickers(wrapper)).toEqual(["FE"]);
		expect(trackEvent).toHaveBeenLastCalledWith("empire:market_filter", {
			level: "red",
		});

		// RAT: no CX preference, checked against all exchanges
		await chip("muted").trigger("click");
		await flushPromises();
		expect(chip("red").attributes("aria-pressed")).toBe("false");
		expect(tickers(wrapper)).toEqual(["RAT"]);

		await chip("muted").trigger("click");
		await flushPromises();
		expect(tickers(wrapper)).toEqual(["FE", "RAT"]);
	});
});
