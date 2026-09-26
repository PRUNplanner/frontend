import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { h, Slots } from "vue";
import { flushPromises, VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { usePlanningStore } from "@/stores/planningStore";
import ExchangesView from "@/views/ExchangesView.vue";
import { mountComponent } from "@/tests/mountComponent";

// test data
import cxList from "@/tests/test_data/api_data_cx_list.json";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers
const { passThrough, stub } = vi.hoisted(() => ({
	// the loaders fetch planning and game data, here the store is seeded
	passThrough: (name: string) => ({
		default: {
			name,
			setup: (_: unknown, { slots }: { slots: Slots }) => () =>
				slots.default?.(),
		},
	}),
	// the preference editors have their own tests
	stub: (name: string) => ({
		default: { name, render: () => h("div") },
	}),
}));

vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader")
);
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	passThrough("WrapperGameDataLoader")
);
vi.mock("@/features/exchanges/components/CXExchangePreference.vue", () =>
	stub("CXExchangePreference")
);
vi.mock("@/features/exchanges/components/CXTickerPreference.vue", () =>
	stub("CXTickerPreference")
);
vi.mock("@/features/exchanges/components/CXPlanetPreferenceTable.vue", () =>
	stub("CXPlanetPreferenceTable")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));

const mock = new AxiosMockAdapter(apiService.client);

const CX = cxList[0];
const PUT_URL = new RegExp(`planning/cx/${CX.uuid}/$`);

async function mountView() {
	const pinia = createPinia();
	// @ts-expect-error fixture strings for the typed unions
	usePlanningStore(pinia).setCXs(cxList);
	return mountComponent(ExchangesView, { cxUuid: CX.uuid }, { pinia });
}

const saveButton = (wrapper: VueWrapper) =>
	wrapper
		.findAll("button")
		.find((b) => b.text() === "exchanges.buttons.save")!;

describe("ExchangesView", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
	});

	it("saves the CX and stops the spinner", async () => {
		mock.onPut(PUT_URL).reply((config) => [
			200,
			{ uuid: CX.uuid, empires: [], ...JSON.parse(config.data) },
		]);
		const { wrapper } = await mountView();

		await saveButton(wrapper).trigger("click");
		await flushPromises();

		expect(mock.history.put).toHaveLength(1);
		expect(JSON.parse(mock.history.put[0].data).cx_name).toBe(CX.cx_name);
		expect(saveButton(wrapper).attributes("aria-busy")).toBe("false");
	});

	it("stops the spinner when saving fails", async () => {
		mock.onPut(PUT_URL).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountView();

		await saveButton(wrapper).trigger("click");
		await flushPromises();

		expect(mock.history.put).toHaveLength(1);
		expect(saveButton(wrapper).attributes("aria-busy")).toBe("false");
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});
});
