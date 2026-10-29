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

const TIERS = [
	"pioneer",
	"settler",
	"technician",
	"engineer",
	"scientist",
] as const;

// what the plan needs per tier; the table gets it untouched
function workforce(need: Partial<Record<(typeof TIERS)[number], number>> = {}) {
	return Object.fromEntries(
		TIERS.map((tier) => [tier, { name: tier, required: need[tier] ?? 0 }])
	);
}
const WORKFORCE = workforce({ pioneer: 100 });

// the query cache persists, so each test asks for its own planet
async function mountPOPR(planetNaturalId: string, workforceData = WORKFORCE) {
	return mountComponent(PlanPOPR, { planetNaturalId, workforceData });
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

	// fixture: free pioneer 6,121, settler 3,439, technician 61, no open jobs
	it("charts free workers against the plan's need per tier", async () => {
		mock.onGet(poprUrl("PP-005a")).reply(200, popr);
		const { wrapper } = await mountPOPR(
			"PP-005a",
			workforce({ pioneer: 1000, settler: 5000 })
		);
		await vi.waitFor(() =>
			expect(wrapper.find("[data-popr-chart]").exists()).toBe(true)
		);
		const row = (tier: string) => wrapper.find(`[data-tier="${tier}"]`);
		const bar = (tier: string) => row(tier).find('[role="img"] > div');

		expect(wrapper.findAll("[data-tier]")).toHaveLength(5);
		// 6,121 cover 1,000; 3,439 don't cover 5,000
		expect(bar("pioneer").classes()).toContain("bg-positive");
		expect(bar("settler").classes()).toContain("bg-negative");
		expect(
			row("settler").find('[role="img"]').attributes("aria-label")
		).toBe("plan.tools.popr.chart.row");
		// the need line at 5,000 of a 5,500 axis
		expect(
			row("settler").find("[data-need]").attributes("style")
		).toContain(`left: ${(5000 / 5500) * 100}%`);
		// no need, no line
		expect(row("technician").find("[data-need]").exists()).toBe(false);
	});

	// no report yet (404) is an empty state: no error, nothing logged
	it("shows an empty state without a report", async () => {
		mock.onGet(poprUrl("PP-003a")).reply(404);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountPOPR("PP-003a");

		await vi.waitFor(() =>
			expect(wrapper.text()).toContain("plan.tools.popr.empty")
		);
		expect(wrapper.text()).not.toContain("plan.tools.popr.error");
		expect(error).not.toHaveBeenCalled();
		expect(wrapper.find("h2").text()).toBe("plan.tools.popr.title");
		expect(wrapper.findComponent(PSpin).exists()).toBe(false);
		expect(wrapper.text()).not.toContain("plan.tools.popr.loading");
		expect(wrapper.find(".popr-table").exists()).toBe(false);
		expect(wrapper.find("[data-popr-chart]").exists()).toBe(false);
	});

	it.each([
		{ why: "fails to load", planet: "PP-006a", status: 500, body: undefined },
		// fails Zod validation, so the query rejects like a failed request
		{
			why: "is malformed",
			planet: "PP-004a",
			status: 200,
			body: { simulation_period: 1 },
		},
	])("shows an error when the report $why", async ({ planet, status, body }) => {
		mock.onGet(poprUrl(planet)).reply(status, body);
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountPOPR(planet);

		await vi.waitFor(() =>
			expect(wrapper.text()).toContain("plan.tools.popr.error")
		);
		expect(wrapper.text()).not.toContain("plan.tools.popr.empty");
		expect(wrapper.find(".popr-table").exists()).toBe(false);
	});
});
