import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import PlanetSearchBasic from "@/features/planet_search/components/PlanetSearchBasic.vue";
import { mountComponent } from "@/tests/mountComponent";

// test data
import planetSearch from "@/tests/test_data/api_data_planet_search.json";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

const mock = new AxiosMockAdapter(apiService.client);

// the query cache persists, so each test searches for its own id
const searchUrl = (searchId: string) => `/data/planets/${searchId}/`;

const button = (wrapper: VueWrapper) => wrapper.find("button");

async function typeSearch(wrapper: VueWrapper, value: string) {
	await wrapper.find("input").setValue(value);
	await flushPromises();
}

// results are written to IndexedDB first, wait for the search to finish
async function search(wrapper: VueWrapper) {
	await button(wrapper).trigger("click");
	await vi.waitFor(() =>
		expect(button(wrapper).attributes("aria-busy")).toBe("false")
	);
	await flushPromises();
}

describe("PlanetSearchBasic", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		vi.mocked(trackEvent).mockClear();
	});

	it("needs at least 3 characters to search", async () => {
		const { wrapper } = await mountComponent(PlanetSearchBasic);

		// nothing typed yet
		expect(button(wrapper).attributes("disabled")).toBeDefined();

		await typeSearch(wrapper, "Mo");
		expect(button(wrapper).attributes("disabled")).toBeDefined();

		await typeSearch(wrapper, "Mon");
		expect(button(wrapper).attributes("disabled")).toBeUndefined();

		await typeSearch(wrapper, "");
		expect(button(wrapper).attributes("disabled")).toBeDefined();
	});

	it("emits the planets found", async () => {
		mock.onGet(searchUrl("Montem")).reply(200, planetSearch);
		const { wrapper, component } = await mountComponent(PlanetSearchBasic);

		await typeSearch(wrapper, "Montem");
		await search(wrapper);

		expect(mock.history.get.map((r) => r.url)).toEqual([
			searchUrl("Montem"),
		]);
		expect(trackEvent).toHaveBeenCalledWith("planet_search_basic", {
			searchId: "Montem",
		});
		const results = component.emitted("update:results");
		expect(results).toHaveLength(1);
		expect(results![0][0]).toHaveLength(65);
		expect(
			(results![0][0] as { planet_natural_id: string }[])
				.slice(0, 3)
				.map((p) => p.planet_natural_id)
		).toEqual(["WU-882h", "XD-055a", "UB-808d"]);
	});

	it("emits an empty list for no planets", async () => {
		mock.onGet(searchUrl("Nowhere")).reply(200, []);
		const { wrapper, component } = await mountComponent(PlanetSearchBasic);

		await typeSearch(wrapper, "Nowhere");
		await search(wrapper);

		expect(component.emitted("update:results")).toEqual([[[]]]);
	});

	it("shows loading while searching", async () => {
		let respond: (value: [number, unknown]) => void = () => {};
		mock.onGet(searchUrl("Katoa")).reply(
			() => new Promise((resolve) => (respond = resolve))
		);
		const { wrapper, component } = await mountComponent(PlanetSearchBasic);

		await typeSearch(wrapper, "Katoa");
		await button(wrapper).trigger("click");
		await flushPromises();
		expect(button(wrapper).attributes("aria-busy")).toBe("true");
		expect(component.emitted("update:results")).toBeUndefined();

		respond([200, []]);
		await vi.waitFor(() =>
			expect(button(wrapper).attributes("aria-busy")).toBe("false")
		);
		expect(component.emitted("update:results")).toEqual([[[]]]);
	});

	it("resets the results when the search fails", async () => {
		mock.onGet(searchUrl("Failing")).reply(500);
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper, component } = await mountComponent(PlanetSearchBasic);

		await typeSearch(wrapper, "Failing");
		await search(wrapper);

		expect(component.emitted("update:results")).toEqual([[[]]]);
		// the search can be retried
		expect(button(wrapper).attributes("disabled")).toBeUndefined();
		vi.mocked(console.error).mockRestore();
	});
});
