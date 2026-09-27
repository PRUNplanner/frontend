import { describe, it, expect, beforeAll, vi } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import EmpireMaterialIOFiltered from "@/features/empire/components/EmpireMaterialIOFiltered.vue";
import PSelectMultiple from "@/ui/components/PSelectMultiple.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// Types & Interfaces
import type { IEmpireMaterialIO } from "@/features/empire/empire.types";

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
});
