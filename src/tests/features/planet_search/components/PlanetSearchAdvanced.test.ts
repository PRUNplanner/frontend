import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { flushPromises, VueWrapper } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import PlanetSearchAdvanced from "@/features/planet_search/components/PlanetSearchAdvanced.vue";
import PCheckbox from "@/ui/components/PCheckbox.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import PSelect from "@/ui/components/PSelect.vue";
import PSelectMultiple from "@/ui/components/PSelectMultiple.vue";
import { mountComponent } from "@/tests/mountComponent";

// test data
import planetSearch from "@/tests/test_data/api_data_planet_search.json";

const mock = new AxiosMockAdapter(apiService.client);
const SEARCH_URL = /data\/planets\/search\/$/;

// AJ-120
const SYSTEM_ID = "ccb58f3608aa8d7305d677f3e417e7da";

const DEFAULT_PAYLOAD = {
	materials: [],
	cogc_programs: [],
	environment_rocky: true,
	environment_gaseous: false,
	environment_low_gravity: false,
	environment_high_gravity: false,
	environment_low_pressure: false,
	environment_high_pressure: false,
	environment_low_temperature: false,
	environment_high_temperature: false,
	must_be_fertile: false,
	must_have_localmarket: false,
	must_have_chamberofcommerce: false,
	must_have_warehouse: false,
	must_have_administrationcenter: false,
	must_have_shipyard: false,
};

/** multi selects: 0 materials, 1 COGC, 2 planet features */
async function selectMultiple(
	wrapper: VueWrapper,
	index: 0 | 1 | 2,
	value: string[]
) {
	wrapper
		.findAllComponents(PSelectMultiple)
		[index].vm.$emit("update:value", value);
	await flushPromises();
}

async function clickButton(wrapper: VueWrapper, label: string) {
	const button = wrapper.findAll("button").find((b) => b.text() === label);
	expect(button).toBeDefined();
	await button!.trigger("click");
	await flushPromises();
}

// results are written to IndexedDB first, wait for the search to finish
async function search(wrapper: VueWrapper) {
	await clickButton(wrapper, "common.buttons.search");
	await vi.waitFor(() =>
		expect(wrapper.find("button").attributes("aria-busy")).toBe("false")
	);
	await flushPromises();
}

const lastPayload = () => JSON.parse(mock.history.post.at(-1)!.data);

describe("PlanetSearchAdvanced", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		mock.onPost(SEARCH_URL).reply(200, planetSearch);
	});

	it("searches rocky planets by default and emits the results", async () => {
		const { wrapper, component } = await mountComponent(
			PlanetSearchAdvanced
		);

		await search(wrapper);

		expect(lastPayload()).toEqual(DEFAULT_PAYLOAD);
		expect(component.emitted("update:results")?.at(-1)?.[0]).toHaveLength(
			planetSearch.length
		);
		expect(component.emitted("update:materials")?.at(-1)).toEqual([[]]);
		expect(component.emitted("update:richness")?.at(-1)).toEqual([{}]);
		// no system selected
		expect(component.emitted("update:distance")).toBeUndefined();
	});

	it("maps planet features to their payload flags", async () => {
		const { wrapper } = await mountComponent(PlanetSearchAdvanced);

		await selectMultiple(wrapper, 2, ["LM", "ADM"]);
		await search(wrapper);
		expect(lastPayload()).toEqual({
			...DEFAULT_PAYLOAD,
			must_have_localmarket: true,
			must_have_administrationcenter: true,
		});

		await selectMultiple(wrapper, 2, ["Fertile", "COGC", "SHY"]);
		await search(wrapper);
		expect(lastPayload()).toEqual({
			...DEFAULT_PAYLOAD,
			must_be_fertile: true,
			must_have_chamberofcommerce: true,
			must_have_shipyard: true,
		});

		await selectMultiple(wrapper, 2, ["WAR"]);
		await search(wrapper);
		expect(lastPayload()).toEqual({
			...DEFAULT_PAYLOAD,
			must_have_warehouse: true,
		});
	});

	it("sends materials and COGC programs", async () => {
		const { wrapper } = await mountComponent(PlanetSearchAdvanced);

		await selectMultiple(wrapper, 0, ["FEO", "H2O"]);
		await selectMultiple(wrapper, 1, ["ADVERTISING_AGRICULTURE"]);
		await search(wrapper);

		expect(lastPayload()).toMatchObject({
			materials: ["FEO", "H2O"],
			cogc_programs: ["ADVERTISING_AGRICULTURE"],
		});
	});

	it("limits the search to 3 materials", async () => {
		const { wrapper } = await mountComponent(PlanetSearchAdvanced);

		await selectMultiple(wrapper, 0, ["FEO", "H2O", "LST", "O"]);
		await search(wrapper);

		expect(lastPayload().materials).toEqual(["FEO", "H2O", "LST"]);
	});

	it("toggles all or the default environments", async () => {
		const { wrapper } = await mountComponent(PlanetSearchAdvanced);
		const checked = () =>
			wrapper
				.findAllComponents(PCheckbox)
				.map((c) => (c.find("input").element as HTMLInputElement).checked);

		// rocky, low gravity, low temperature, low pressure, gaseous, high ...
		expect(checked()).toEqual([
			true,
			false,
			false,
			false,
			false,
			false,
			false,
			false,
		]);

		await clickButton(wrapper, "common.buttons.select_all");
		expect(checked().every(Boolean)).toBe(true);
		await search(wrapper);
		expect(lastPayload()).toMatchObject({
			environment_gaseous: true,
			environment_low_gravity: true,
			environment_high_gravity: true,
			environment_low_pressure: true,
			environment_high_pressure: true,
			environment_low_temperature: true,
			environment_high_temperature: true,
		});

		await clickButton(wrapper, "common.buttons.default");
		await search(wrapper);
		expect(lastPayload()).toEqual(DEFAULT_PAYLOAD);
	});

	it("sends single environment checkboxes", async () => {
		const { wrapper } = await mountComponent(PlanetSearchAdvanced);
		const boxes = wrapper.findAllComponents(PCheckbox);

		// gaseous and high pressure
		await boxes[4].find("input").setValue(true);
		await boxes[7].find("input").setValue(true);
		await search(wrapper);

		expect(lastPayload()).toEqual({
			...DEFAULT_PAYLOAD,
			environment_gaseous: true,
			environment_high_pressure: true,
		});
	});

	it("keeps a richness threshold per selected material", async () => {
		const { wrapper, component } = await mountComponent(
			PlanetSearchAdvanced
		);
		const lastRichness = () =>
			component.emitted("update:richness")?.at(-1)?.[0];

		await selectMultiple(wrapper, 0, ["FEO", "H2O"]);
		expect(lastRichness()).toEqual({ FEO: 0, H2O: 0 });

		// one input per material, the last one is the system distance
		const inputs = wrapper.findAllComponents(PInputNumber);
		expect(inputs).toHaveLength(3);
		await inputs[0].find("input").setValue("25");
		expect(lastRichness()).toEqual({ FEO: 25, H2O: 0 });

		// dropping a material keeps the others' thresholds
		await selectMultiple(wrapper, 0, ["FEO"]);
		expect(lastRichness()).toEqual({ FEO: 25 });

		await search(wrapper);
		expect(component.emitted("update:materials")?.at(-1)).toEqual([
			["FEO"],
		]);
		expect(lastRichness()).toEqual({ FEO: 25 });
	});

	it("emits the system and distance to check", async () => {
		const { wrapper, component } = await mountComponent(
			PlanetSearchAdvanced
		);

		wrapper.findComponent(PSelect).vm.$emit("update:value", SYSTEM_ID);
		const distance = wrapper.findAllComponents(PInputNumber).at(-1)!;
		await distance.find("input").setValue("12");
		await search(wrapper);

		expect(component.emitted("update:distance")).toEqual([
			[SYSTEM_ID, 12],
		]);
	});

	it("resets all results when the search fails", async () => {
		mock.onPost(SEARCH_URL).reply(500);
		const { wrapper, component } = await mountComponent(
			PlanetSearchAdvanced
		);

		await selectMultiple(wrapper, 0, ["FEO"]);
		await search(wrapper);

		expect(component.emitted("update:results")).toEqual([[[]]]);
		expect(component.emitted("update:materials")).toEqual([[[]]]);
		expect(component.emitted("update:richness")?.at(-1)).toEqual([{}]);
		expect(component.emitted("update:distance")).toEqual([
			[undefined, undefined],
		]);
	});

	it("shows loading while searching", async () => {
		let respond: (value: [number, unknown]) => void = () => {};
		mock.onPost(SEARCH_URL).reply(
			() => new Promise((resolve) => (respond = resolve))
		);
		const { wrapper } = await mountComponent(PlanetSearchAdvanced);
		// the search button leads the form
		const button = () => wrapper.find("button");

		await button().trigger("click");
		await flushPromises();
		expect(button().attributes("aria-busy")).toBe("true");

		respond([200, planetSearch]);
		await vi.waitFor(() =>
			expect(button().attributes("aria-busy")).toBe("false")
		);
	});
});
