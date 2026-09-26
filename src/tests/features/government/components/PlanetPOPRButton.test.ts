import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { h } from "vue";
import { DOMWrapper, flushPromises, VueWrapper } from "@vue/test-utils";
import { NModal } from "naive-ui";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import PlanetPOPRButton from "@/features/government/components/PlanetPOPRButton.vue";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent } from "@/tests/mountComponent";

// test data
import popr from "@/tests/test_data/api_data_popr_latest.json";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/government/components/PlanetPOPRTable.vue", () => ({
	default: {
		name: "PlanetPOPRTable",
		props: { planetNaturalId: String, poprData: Object },
		render: () => h("div", { class: "popr-table" }),
	},
}));

const mock = new AxiosMockAdapter(apiService.client);
const poprUrl = (planet: string) => `/data/planet/${planet}/popr/`;

const body = () => new DOMWrapper(document.body);

// the query cache persists, so each test asks for its own planet
async function mountButton(props: Record<string, unknown>) {
	return mountComponent(PlanetPOPRButton, props);
}

async function click(wrapper: VueWrapper) {
	await wrapper.find("button").trigger("click");
	await flushPromises();
}

describe("PlanetPOPRButton", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		vi.mocked(trackEvent).mockClear();
	});

	it("renders a primary POPR button by default", async () => {
		const { wrapper } = await mountButton({ planetNaturalId: "AA-001a" });

		expect(wrapper.find("button").text()).toBe("POPR");
		expect(wrapper.findComponent(PButton).props()).toMatchObject({
			size: "md",
			type: "primary",
			loading: false,
			disabled: false,
		});
		// nothing loaded until clicked
		expect(mock.history.get).toHaveLength(0);
		expect(body().find(".n-modal").exists()).toBe(false);
	});

	it("takes a button size and text", async () => {
		const { wrapper } = await mountButton({
			planetNaturalId: "AA-002a",
			buttonSize: "sm",
			buttonText: "Report",
		});

		expect(wrapper.find("button").text()).toBe("Report");
		expect(wrapper.findComponent(PButton).props("size")).toBe("sm");
	});

	it("loads the last POPR into a modal", async () => {
		mock.onGet(poprUrl("AA-003a")).reply(200, popr);
		const { wrapper } = await mountButton({ planetNaturalId: "AA-003a" });

		await click(wrapper);

		expect(mock.history.get.map((r) => r.url)).toEqual([
			poprUrl("AA-003a"),
		]);
		expect(trackEvent).toHaveBeenCalledWith("popr_load", {
			planetNaturalId: "AA-003a",
		});
		expect(body().find(".n-card-header").text()).toBe(
			"Latest Population Report: AA-003a"
		);
		expect(
			wrapper.findComponent({ name: "PlanetPOPRTable" }).props()
		).toMatchObject({
			planetNaturalId: "AA-003a",
			poprData: { simulation_period: 255, next_population_pioneer: 74034 },
		});
		expect(wrapper.findComponent(PButton).props()).toMatchObject({
			loading: false,
			disabled: false,
			type: "primary",
		});
	});

	it("shows loading while fetching", async () => {
		let respond: (value: [number, unknown]) => void = () => {};
		mock.onGet(poprUrl("AA-004a")).reply(
			() => new Promise((resolve) => (respond = resolve))
		);
		const { wrapper } = await mountButton({ planetNaturalId: "AA-004a" });

		await click(wrapper);
		expect(wrapper.find("button").attributes("aria-busy")).toBe("true");
		expect(body().find(".n-modal").exists()).toBe(false);

		respond([200, popr]);
		await vi.waitFor(() =>
			expect(wrapper.find("button").attributes("aria-busy")).toBe(
				"false"
			)
		);
		expect(body().find(".n-modal").exists()).toBe(true);
	});

	it("reopens the modal after closing it", async () => {
		mock.onGet(poprUrl("AA-005a")).reply(200, popr);
		const { wrapper } = await mountButton({ planetNaturalId: "AA-005a" });

		await click(wrapper);
		await body().find(".n-card-header__close").trigger("click");
		await flushPromises();
		expect(wrapper.findComponent(NModal).props("show")).toBe(false);

		await click(wrapper);
		expect(wrapper.findComponent(NModal).props("show")).toBe(true);
		expect(trackEvent).toHaveBeenCalledTimes(2);
	});

	it("disables the button without a POPR", async () => {
		mock.onGet(poprUrl("AA-006a")).reply(404);
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountButton({ planetNaturalId: "AA-006a" });

		await click(wrapper);

		expect(wrapper.find("button").text()).toBe(
			"government.popr_button.buttons.no_popr"
		);
		expect(wrapper.findComponent(PButton).props()).toMatchObject({
			loading: false,
			disabled: true,
			type: "error",
		});
		expect(body().find(".n-modal").exists()).toBe(false);
		vi.mocked(console.error).mockRestore();
	});
});
