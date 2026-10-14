import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import PlanWhatIf from "@/features/planning/components/tools/PlanWhatIf.vue";
import PlanWhatIfCompare from "@/features/planning/components/tools/PlanWhatIfCompare.vue";
import { mountComponent } from "@/tests/mountComponent";
import { PSelect } from "@/ui";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PSelectOption } from "@/ui/ui.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import {
	etherwindPlan,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/stores/userStore", () => ({
	useUserStore: () => ({ isLoggedIn: true }),
}));
vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);
	return {
		usePlanetData: vi.fn(() => ({
			getPlanet: vi.fn().mockResolvedValue(planet_etherwind),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});
const plansQuery = vi.fn<() => Promise<Plan[]>>();
const planetQuery = vi.fn();
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params?: { planetNaturalId: string }) => ({
		execute: () =>
			name === "GetPlanet"
				? planetQuery(params!.planetNaturalId)
				: plansQuery(),
	}),
}));

const OPEN = etherwindPlan();
function variant(uuid: string, name: string, change?: (p: Plan) => void) {
	const plan = etherwindPlan();
	plan.uuid = uuid;
	plan.plan_name = name;
	change?.(plan);
	return plan;
}
const COPY = variant("00000000-0000-4000-8000-000000000001", "Copy");
const BIGGER = variant(
	"00000000-0000-4000-8000-000000000002",
	"Bigger",
	(p) => {
		p.plan_data.buildings[0].amount += 1;
	}
);
const FAR = variant("00000000-0000-4000-8000-000000000003", "Far", (p) => {
	p.planet_natural_id = "ZV-307c";
});

async function mountCompare(planUuid: string | undefined = OPEN.uuid) {
	const { wrapper } = await mountComponent(
		PlanWhatIfCompare,
		{
			plan: OPEN,
			planUuid,
			empire: undefined,
			cxUuid: undefined,
			planet: planet_etherwind,
		},
		{ attach: true }
	);
	await flushPromises();
	return wrapper;
}

type Wrapper = Awaited<ReturnType<typeof mountCompare>>;
const select = (w: Wrapper) => w.findComponent(PSelect);
async function pick(w: Wrapper, uuid: string) {
	select(w).vm.$emit("update:value", uuid);
	await flushPromises();
}
const verdict = (w: Wrapper) => w.find("[data-verdict]").text();

describe("PlanWhatIfCompare", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
		plansQuery.mockResolvedValue([OPEN, FAR, COPY, BIGGER]);
		planetQuery.mockReset().mockResolvedValue(planet_etherwind);
	});

	it("offers the user's other plans, this planet first", async () => {
		const wrapper = await mountCompare();
		const options = select(wrapper).props("options") as PSelectOption[];

		expect(options.map((o) => o.value)).toEqual(["same", "other"]);
		expect(options[0].children!.map((o) => o.label)).toEqual([
			"Bigger",
			"Copy",
		]);
		expect(options[1].children).toEqual([
			{ label: "Far", value: FAR.uuid, badge: "ZV-307c" },
		]);
		// the open plan is not offered
		const all = options.flatMap((o) => o.children!.map((c) => c.value));
		expect(all).not.toContain(OPEN.uuid);
	});

	it("compares with the first plan on this planet and tracks it", async () => {
		const wrapper = await mountCompare();

		expect(select(wrapper).props("value")).toBe(BIGGER.uuid);
		expect(wrapper.findAll("tbody tr")).toHaveLength(8);
		expect(wrapper.find("tbody .text-positive").exists()).toBe(true);
		expect(verdict(wrapper)).not.toContain("verdict.same");
		expect(wrapper.findAll("li").length).toBeGreaterThan(0);
		expect(wrapper.text()).toContain(
			"plan.tools.whatif.compare.source_universe"
		);
		expect(trackEvent).toHaveBeenCalledWith("plan:whatif_compare", {
			same_planet: true,
		});
	});

	it("shows an unchanged copy as the same everywhere", async () => {
		const wrapper = await mountCompare();
		await pick(wrapper, COPY.uuid);

		expect(verdict(wrapper)).toBe("plan.tools.whatif.compare.verdict.same");
		expect(wrapper.text()).toContain(
			"plan.tools.whatif.compare.changes.none"
		);
		const differences = wrapper
			.findAll("tbody tr")
			.map((r) => r.findAll("td")[3].text());
		expect(differences).toEqual([
			"0 ȼ",
			"0 ȼ",
			"0 ȼ",
			"0 ȼ",
			"0 ȼ",
			"0.00 d",
			"0.00 ȼ",
			"0",
		]);
		expect(wrapper.find("tbody .text-positive").exists()).toBe(false);
		expect(wrapper.find("tbody .text-negative").exists()).toBe(false);
	});

	it("loads another planet and tracks it", async () => {
		const wrapper = await mountCompare();
		await pick(wrapper, FAR.uuid);

		expect(planetQuery).toHaveBeenLastCalledWith("ZV-307c");

		expect(trackEvent).toHaveBeenLastCalledWith("plan:whatif_compare", {
			same_planet: false,
		});
	});

	it("remembers the last pick per plan", async () => {
		const uuid = "00000000-0000-4000-8000-0000000000ff";
		const first = await mountCompare(uuid);
		await pick(first, FAR.uuid);
		first.unmount();

		const again = await mountCompare(uuid);
		expect(select(again).props("value")).toBe(FAR.uuid);
		// another plan starts from its own default
		const other = await mountCompare(
			"00000000-0000-4000-8000-0000000000fe"
		);
		expect(select(other).props("value")).toBe(BIGGER.uuid);
	});

	it("keeps the picker when a plan can't be calculated", async () => {
		const wrapper = await mountCompare(
			"00000000-0000-4000-8000-0000000000fd"
		);
		planetQuery.mockRejectedValueOnce(
			new Error("Planet ZV-307c not available.")
		);
		vi.spyOn(console, "error").mockImplementationOnce(() => {});
		await pick(wrapper, FAR.uuid);

		expect(wrapper.text()).toContain(
			"plan.tools.whatif.compare.calc_error"
		);
		expect(wrapper.find("table").exists()).toBe(false);
		expect(select(wrapper).exists()).toBe(true);

		await pick(wrapper, COPY.uuid);
		expect(wrapper.text()).not.toContain("compare.calc_error");
		expect(verdict(wrapper)).toBe("plan.tools.whatif.compare.verdict.same");
	});

	it("tells a user without other plans", async () => {
		plansQuery.mockResolvedValue([OPEN]);
		const wrapper = await mountCompare();

		expect(wrapper.text()).toContain("plan.tools.whatif.compare.no_plans");
		expect(wrapper.find("table").exists()).toBe(false);
	});

	it("says so when the plans can't be loaded", async () => {
		plansQuery.mockRejectedValue(new Error("down"));
		const wrapper = await mountCompare();

		expect(wrapper.text()).toContain("plan.tools.whatif.compare.error");
	});

	it("is the What-if tool's second view", async () => {
		const { wrapper } = await mountComponent(PlanWhatIf, {
			plan: OPEN,
			planUuid: OPEN.uuid,
			empire: undefined,
			cxUuid: undefined,
			planet: planet_etherwind,
		});
		const buttons = wrapper.findAll(
			"[aria-label='plan.tools.whatif.view_label'] > button"
		);
		expect(buttons.map((b) => b.text())).toEqual([
			"plan.tools.whatif.views.sensitivity",
			"plan.tools.whatif.views.compare",
		]);

		await buttons[1].trigger("click");
		await flushPromises();
		await flushPromises();

		expect(buttons[1].attributes("aria-pressed")).toBe("true");
		// the price change belongs to the sensitivity view only
		expect(wrapper.find("#whatif-pct-label").exists()).toBe(false);
		expect(wrapper.findComponent(PlanWhatIfCompare).exists()).toBe(true);
		expect(wrapper.findAll("tbody tr")).toHaveLength(8);
	});
});
