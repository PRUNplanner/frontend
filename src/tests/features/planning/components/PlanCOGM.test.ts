import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { flushPromises, VueWrapper } from "@vue/test-utils";
import { createPinia, Pinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { usePlanningStore } from "@/stores/planningStore";
import PlanCOGM from "@/features/planning/components/tools/PlanCOGM.vue";
import CXTickerPreference from "@/features/exchanges/components/CXTickerPreference.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { CXData } from "@/features/api/schemas/cxData.schemas";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";

const mock = new AxiosMockAdapter(apiService.client);

// CX responses are validated as uuids
const CX_UUID = "00000001-0000-4000-8000-000000000000";
const PLANET = "ZV-307c";
const PUT_URL = new RegExp(`planning/cx/${CX_UUID}/$`);

const pref = (
	ticker: string,
	type: "BUY" | "SELL" | "BOTH",
	value: number
) => ({
	ticker,
	type,
	value,
});

function cxData(): CXData {
	return {
		cx_empire: [{ type: "BOTH", exchange: "AI1_30D" }],
		cx_planets: [],
		ticker_empire: [pref("RAT", "BUY", 150)],
		ticker_planets: [
			{ planet: "OT-580b", preferences: [pref("DW", "SELL", 80)] },
			{
				planet: PLANET,
				preferences: [pref("H2O", "BUY", 30), pref("C", "BOTH", 90)],
			},
		],
	};
}

const COGM = {
	visible: true,
	runtime: 43200000,
	runtimeShare: 0.5,
	efficiency: 1.25,
	degradation: 100,
	degradationShare: 50,
	workforceCost: 200,
	workforceCostTotal: 400,
	inputCost: [],
	inputTotal: 0,
	outputCOGM: [],
	totalCost: 250,
	outputRevenue: 1000,
	totalProfit: 750,
};

function seedCX(pinia: Pinia, data = cxData()) {
	usePlanningStore(pinia).setCXs([
		// @ts-expect-error partial CX
		{ uuid: CX_UUID, cx_name: "My CX", cx_data: data, empires: [] },
	]);
}

async function mountCOGM(
	props: Record<string, unknown> = { cxUuid: CX_UUID, planetId: PLANET },
	data = cxData()
) {
	const pinia = createPinia();
	seedCX(pinia, data);
	const mounted = await mountComponent(
		PlanCOGM,
		{ cogmData: COGM, ...props },
		{ pinia }
	);
	return { ...mounted, pinia };
}

/** 0: empire tickers, 1: this planet's tickers */
const editor = (wrapper: VueWrapper, index: 0 | 1) =>
	wrapper.findAllComponents(CXTickerPreference).at(index)!;

/** listed preferences as "TYPE TICKER value" */
function listed(wrapper: VueWrapper, index: 0 | 1) {
	return editor(wrapper, index)
		.findAll("tr")
		.filter((tr) => tr.findAll("td").length === 4)
		.map((tr) =>
			tr
				.findAll("td")
				.slice(0, 3)
				.map((td) => td.text().replace("ȼ", "").trim())
				.join(" ")
		);
}

async function addPreference(
	wrapper: VueWrapper,
	index: 0 | 1,
	type: string,
	ticker: string,
	value: number
) {
	const e = editor(wrapper, index);
	const [typeSelect, tickerSelect] = e.findAllComponents(PSelect);
	typeSelect.vm.$emit("update:value", type);
	tickerSelect.vm.$emit("update:value", ticker);
	await flushPromises();
	await e.find("input").setValue(String(value));
	await e.find("button").trigger("click");
	await flushPromises();
}

async function removePreference(wrapper: VueWrapper, row: number) {
	await editor(wrapper, 1)
		.findAll("tr")
		.at(row)!
		.find("button")
		.trigger("click");
	await flushPromises();
}

async function clickButton(wrapper: VueWrapper, key: string) {
	const button = wrapper
		.findAll("button")
		.find((b) => b.text() === `common.buttons.${key}`);
	expect(button).toBeDefined();
	await button!.trigger("click");
	await flushPromises();
}

const putPayload = () => JSON.parse(mock.history.put.at(-1)!.data);

describe("PlanCOGM", () => {
	beforeAll(async () => {
		axiosSetup();
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	beforeEach(() => {
		mock.reset();
		// the backend answers with the saved CX
		mock.onPut(PUT_URL).reply((config) => [
			200,
			{ uuid: CX_UUID, empires: [], ...JSON.parse(config.data) },
		]);
	});

	it("shows only the COGM table without CX or planet", async () => {
		for (const props of [{}, { cxUuid: CX_UUID }, { planetId: PLANET }]) {
			const { wrapper } = await mountCOGM(props);

			expect(wrapper.text()).toContain("plan.tools.cogm.info");
			// runtime share 0.5 -> 50 % of the day, efficiency 125 %
			expect(wrapper.text()).toContain("50.00");
			expect(wrapper.text()).toContain("125.00 %");
			expect(wrapper.findComponent(CXTickerPreference).exists()).toBe(
				false
			);
			wrapper.unmount();
		}
	});

	it("lists empire and this planet's ticker preferences", async () => {
		const { wrapper } = await mountCOGM();

		expect(listed(wrapper, 0)).toEqual([
			"exchanges.preference_type.BUY RAT 150.00",
		]);
		// sorted by ticker, the other planet's DW is not shown
		expect(listed(wrapper, 1)).toEqual([
			"exchanges.preference_type.BOTH C 90.00",
			"exchanges.preference_type.BUY H2O 30.00",
		]);
	});

	it("saves an added planet preference", async () => {
		const { wrapper } = await mountCOGM();

		await addPreference(wrapper, 1, "SELL", "FE", 120);
		expect(listed(wrapper, 1)).toContain(
			"exchanges.preference_type.SELL FE 120.00"
		);

		await clickButton(wrapper, "save");

		expect(mock.history.put).toHaveLength(1);
		const payload = putPayload();
		expect(payload.cx_name).toBe("My CX");
		expect(payload.cx_data).toEqual({
			...cxData(),
			ticker_planets: [
				{ planet: "OT-580b", preferences: [pref("DW", "SELL", 80)] },
				{
					planet: PLANET,
					preferences: [
						pref("H2O", "BUY", 30),
						pref("C", "BOTH", 90),
						pref("FE", "SELL", 120),
					],
				},
			],
		});
	});

	it("overwrites the value of an existing ticker and type", async () => {
		const { wrapper } = await mountCOGM();

		await addPreference(wrapper, 1, "BUY", "H2O", 45);
		await clickButton(wrapper, "save");

		expect(putPayload().cx_data.ticker_planets[1].preferences).toEqual([
			pref("H2O", "BUY", 45),
			pref("C", "BOTH", 90),
		]);
	});

	it("adds the planet when it had no preferences yet", async () => {
		const data = cxData();
		data.ticker_planets = data.ticker_planets.slice(0, 1);
		const { wrapper } = await mountCOGM(undefined, data);

		expect(listed(wrapper, 1)).toEqual([]);
		expect(editor(wrapper, 1).text()).toContain(
			"exchanges.components.ticker.no_data"
		);

		await addPreference(wrapper, 1, "BUY", "FE", 100);
		await clickButton(wrapper, "save");

		expect(putPayload().cx_data.ticker_planets).toEqual([
			{ planet: "OT-580b", preferences: [pref("DW", "SELL", 80)] },
			{ planet: PLANET, preferences: [pref("FE", "BUY", 100)] },
		]);
	});

	it("removes the planet once its last preference is gone", async () => {
		const { wrapper } = await mountCOGM();

		// sorted rows: C, H2O
		await removePreference(wrapper, 0);
		await removePreference(wrapper, 0);
		expect(listed(wrapper, 1)).toEqual([]);

		await clickButton(wrapper, "save");

		expect(putPayload().cx_data.ticker_planets).toEqual([
			{ planet: "OT-580b", preferences: [pref("DW", "SELL", 80)] },
		]);
	});

	it("saves empire ticker edits as well", async () => {
		const { wrapper } = await mountCOGM();

		await addPreference(wrapper, 0, "SELL", "RAT", 170);
		await clickButton(wrapper, "save");

		expect(putPayload().cx_data.ticker_empire).toEqual([
			pref("RAT", "BUY", 150),
			pref("RAT", "SELL", 170),
		]);
	});

	it("stores the CX as saved by the backend and shows it", async () => {
		// the backend rounds H2O up
		mock.resetHandlers();
		mock.onPut(PUT_URL).reply((config) => {
			const body = JSON.parse(config.data);
			body.cx_data.ticker_planets[1].preferences[0].value = 31;
			return [200, { uuid: CX_UUID, empires: [], ...body }];
		});
		const { wrapper, pinia } = await mountCOGM();

		await removePreference(wrapper, 0);
		await clickButton(wrapper, "save");

		const stored = usePlanningStore(pinia).getCX(CX_UUID).cx_data;
		expect(stored.ticker_planets[1].preferences).toEqual([
			pref("H2O", "BUY", 31),
		]);
		expect(listed(wrapper, 1)).toEqual([
			"exchanges.preference_type.BUY H2O 31.00",
		]);
		expect(
			wrapper
				.findAll("button")
				.find((b) => b.text() === "common.buttons.save")!
				.attributes("aria-busy")
		).toBe("false");
	});

	it("stops the save spinner when saving fails", async () => {
		mock.resetHandlers();
		mock.onPut(PUT_URL).reply(500);
		const { wrapper } = await mountCOGM();

		await clickButton(wrapper, "save");

		expect(mock.history.put).toHaveLength(1);
		const save = wrapper
			.findAll("button")
			.find((b) => b.text() === "common.buttons.save")!;
		expect(save.attributes("aria-busy")).toBe("false");
	});

	it("reload discards unsaved edits", async () => {
		const { wrapper } = await mountCOGM();

		await removePreference(wrapper, 0);
		await addPreference(wrapper, 0, "SELL", "RAT", 170);

		await clickButton(wrapper, "reload");

		expect(listed(wrapper, 0)).toHaveLength(1);
		expect(listed(wrapper, 1)).toHaveLength(2);
		expect(mock.history.put).toHaveLength(0);
	});
});
