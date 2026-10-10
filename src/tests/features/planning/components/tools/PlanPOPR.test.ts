import {
	describe,
	it,
	expect,
	beforeAll,
	beforeEach,
	afterEach,
	vi,
} from "vitest";
import { h } from "vue";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import PlanPOPR from "@/features/planning/components/tools/PlanPOPR.vue";
import PSpin from "@/ui/components/PSpin.vue";
import { mountComponent } from "@/tests/mountComponent";

// test data
import popr from "@/tests/test_data/api_data_popr_latest.json";

vi.mock("@/features/government/components/PlanetPOPRTable.vue", () => ({
	default: {
		name: "PlanetPOPRTable",
		props: {
			planetNaturalId: String,
			poprData: Object,
			workforceData: Object,
		},
		render: () => h("div", { class: "popr-table" }),
	},
}));

const mock = new AxiosMockAdapter(apiService.client);
const poprUrl = (planet: string) => `/data/planet/${planet}/popr/`;

// passed through untouched, the table reads it
const WORKFORCE = { pioneer: { name: "pioneer", required: 100 } };

// the query cache persists, so each test asks for its own planet
async function mountPOPR(planetNaturalId: string) {
	return mountComponent(PlanPOPR, {
		planetNaturalId,
		workforceData: WORKFORCE,
	});
}

describe("PlanPOPR", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
	});

	it("shows a spinner while loading, then the report", async () => {
		let respond: (value: [number, unknown]) => void = () => {};
		mock.onGet(poprUrl("PP-001a")).reply(
			() => new Promise((resolve) => (respond = resolve))
		);
		const { wrapper } = await mountPOPR("PP-001a");

		expect(mock.history.get.map((r) => r.url)).toEqual([
			poprUrl("PP-001a"),
		]);
		expect(wrapper.find("h2").text()).toBe("plan.tools.popr.title");
		expect(wrapper.findComponent(PSpin).exists()).toBe(true);
		expect(wrapper.text()).toContain("plan.tools.popr.loading");
		expect(wrapper.find(".popr-table").exists()).toBe(false);

		respond([200, popr]);
		await vi.waitFor(() =>
			expect(wrapper.find(".popr-table").exists()).toBe(true)
		);
		expect(wrapper.findComponent(PSpin).exists()).toBe(false);
		expect(wrapper.text()).not.toContain("plan.tools.popr.loading");
		expect(wrapper.text()).not.toContain("plan.tools.popr.error");
	});

	it("hands planet, report and workforce to the table", async () => {
		mock.onGet(poprUrl("PP-002a")).reply(200, popr);
		const { wrapper } = await mountPOPR("PP-002a");

		await vi.waitFor(() =>
			expect(wrapper.find(".popr-table").exists()).toBe(true)
		);
		const table = wrapper.findComponent({ name: "PlanetPOPRTable" });
		expect(table.props()).toMatchObject({
			planetNaturalId: "PP-002a",
			poprData: {
				simulation_period: 255,
				next_population_pioneer: 74034,
			},
		});
		expect(table.props("workforceData")).toEqual(WORKFORCE);
	});

	it("shows an error without a report", async () => {
		mock.onGet(poprUrl("PP-003a")).reply(404);
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountPOPR("PP-003a");

		await vi.waitFor(() =>
			expect(wrapper.text()).toContain("plan.tools.popr.error")
		);
		expect(wrapper.find("h2").text()).toBe("plan.tools.popr.title");
		expect(wrapper.findComponent(PSpin).exists()).toBe(false);
		expect(wrapper.text()).not.toContain("plan.tools.popr.loading");
		expect(wrapper.find(".popr-table").exists()).toBe(false);
	});

	it("shows an error for a malformed report", async () => {
		// fails Zod validation, so the query rejects like a failed request
		mock.onGet(poprUrl("PP-004a")).reply(200, { simulation_period: 1 });
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountPOPR("PP-004a");

		await vi.waitFor(() =>
			expect(wrapper.text()).toContain("plan.tools.popr.error")
		);
		expect(wrapper.find(".popr-table").exists()).toBe(false);
	});
});
