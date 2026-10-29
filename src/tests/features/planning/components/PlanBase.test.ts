import { describe, it, expect, vi, beforeEach, onTestFinished } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import PlanBase from "@/features/planning/components/PlanBase.vue";
import PlanConfiguration from "@/features/planning/components/PlanConfiguration.vue";
import PlanBonuses from "@/features/planning/components/PlanBonuses.vue";
import PlanArea from "@/features/planning/components/PlanArea.vue";
import PlanWorkforce from "@/features/planning/components/PlanWorkforce.vue";
import PlanInfrastructure from "@/features/planning/components/PlanInfrastructure.vue";
import PlanExperts from "@/features/planning/components/PlanExperts.vue";
import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
import { mountComponent } from "@/tests/mountComponent";
import { building } from "@/tests/features/planning/usePlanCalculation.fixtures";
import { planEmptyResult } from "@/features/planning/usePlanCalculation.types";
import plan from "@/locales/en_US/plan.json";
import planetFixture from "@/tests/test_data/api_data_planet_etherwind.json";

// Types & Interfaces
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type { PlanEmpire } from "@/features/api/schemas/planningData.schemas";
import type { IPlanResult } from "@/features/planning/usePlanCalculation.types";

// every child has its own test: stubs that declare their props
vi.mock("@/features/planning/components/PlanConfiguration.vue", async () =>
	(await import("@/tests/stubs")).stubComponent("PlanConfiguration", [
		"disabled",
		"empireOptions",
		"activeEmpire",
		"planEmpires",
		"cxUuid",
		"planetId",
		"priceSource",
	])
);
vi.mock("@/features/planning/components/PlanBonuses.vue", async () =>
	(await import("@/tests/stubs")).stubComponent("PlanBonuses", [
		"disabled",
		"corphq",
		"cogc",
		"planetNaturalId",
	])
);
vi.mock("@/features/planning/components/PlanArea.vue", async () =>
	(await import("@/tests/stubs")).stubComponent("PlanArea", [
		"disabled",
		"areaData",
		"planetNaturalId",
	])
);
vi.mock("@/features/planning/components/PlanWorkforce.vue", async () =>
	(await import("@/tests/stubs")).stubComponent("PlanWorkforce", [
		"disabled",
		"workforceData",
		"planetNaturalId",
	])
);
vi.mock("@/features/planning/components/PlanInfrastructure.vue", async () =>
	(await import("@/tests/stubs")).stubComponent("PlanInfrastructure", [
		"disabled",
		"infrastructureData",
		"autoOptimizeHabs",
		"planetNaturalId",
	])
);
vi.mock("@/features/planning/components/PlanExperts.vue", async () =>
	(await import("@/tests/stubs")).stubComponent("PlanExperts", [
		"disabled",
		"expertData",
		"buildings",
		"planetNaturalId",
	])
);
vi.mock(
	"@/features/material_tile/components/MaterialTile.vue",
	async () => (await import("@/tests/stubs")).materialTile
);

const insights = vi.hoisted(() => ({ available: false, total: 0 }));
vi.mock("@/features/plan_analytics/usePlanetInsights", async () => {
	const { ref } = await import("vue");
	return {
		usePlanetInsights: () => ({
			isAvailable: ref(insights.available),
			totalPlans: ref(insights.total),
		}),
	};
});

// KW-688c: H2O (liquid), SIO (mineral), O (gaseous)
const PLANET = planetFixture as Planet;

const EMPIRE: PlanEmpire = {
	uuid: "e-1",
	empire_name: "Alpha",
	empire_faction: "NONE",
	empire_permits_used: 1,
	empire_permits_total: 2,
};

function planResult(): IPlanResult {
	const r: IPlanResult = structuredClone(planEmptyResult);
	r.cogc = "RESOURCE_EXTRACTION";
	r.area = { permits: 2, areaUsed: 300, areaTotal: 750, areaLeft: 450 };
	r.workforce.pioneer = {
		...r.workforce.pioneer,
		required: 100,
		capacity: 200,
		efficiency: 0.92,
	};
	r.workforce.settler = {
		...r.workforce.settler,
		required: 50,
		capacity: 50,
		efficiency: 0.85,
	};
	r.infrastructure.HB1 = 4;
	r.infrastructure.STO = 2;
	r.experts.Resource_Extraction.amount = 2;
	r.experts.Chemistry.amount = 1;
	r.production.buildings = [
		building("EXT", {
			dailyRevenue: 300,
			expertise: "RESOURCE_EXTRACTION",
			efficiencyElements: [{ efficiencyType: "COGC", value: 1.25 }],
		}),
		building("FP", {
			dailyRevenue: 600,
			expertise: "FOOD_INDUSTRIES",
			efficiencyElements: [{ efficiencyType: "WORKFORCE", value: 1 }],
		}),
	];
	return r;
}

async function mountBase(
	props: Record<string, unknown> = {},
	options: { attach?: boolean } = {}
) {
	return mountComponent(
		PlanBase,
		{
			disabled: false,
			result: planResult(),
			planet: PLANET,
			autoOptimizeHabs: true,
			activeEmpire: EMPIRE,
			planEmpires: [EMPIRE],
			priceSource: "Universe average",
			...props,
		},
		// real plan texts, so the values in the summaries show
		{ messages: { plan }, ...options }
	);
}

const sections = (wrapper: VueWrapper) => wrapper.findAll("details");
const summaries = (wrapper: VueWrapper) =>
	sections(wrapper).map((d) =>
		d
			.findAll("summary span")
			.map((s) => s.text())
			.join(" | ")
	);
const resourceButton = (wrapper: VueWrapper, label: string) =>
	wrapper.find(`button[aria-label="${label}"]`);
const insightsLink = (wrapper: VueWrapper) =>
	wrapper.findAll("button").find((b) => b.text().includes("plans on"));

describe("PlanBase", () => {
	beforeEach(() => {
		insights.available = false;
		insights.total = 0;
	});

	it("renders the five sections with their summaries", async () => {
		const { wrapper } = await mountBase();

		// 2 + 1 experts
		expect(summaries(wrapper)).toEqual([
			"Empire & prices | Alpha · Universe average",
			"Planet | COGC game.cogc_program_short.ADVERTISING_RESOURCE_EXTRACTION · 2 permits",
			// the efficiency of each tier the plan needs
			"Workforce | PIO 92 % · SET 85 %",
			"Infrastructure | 4 HB1 · 2 STO · Auto",
			"Experts | 3 placed",
		]);
		// empire and housing start folded
		expect(sections(wrapper).map((d) => d.attributes("open"))).toEqual([
			undefined,
			"",
			"",
			undefined,
			"",
		]);
		// the summaries stay rendered, CSS hides them while a section is open
		expect(
			wrapper
				.findAll("summary > span[title]")
				.map((s) => s.classes("group-open:hidden"))
		).toEqual([true, true, true, true, true]);
	});

	it("opens a section, scrolls it into view and focuses its summary", async () => {
		const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
		onTestFinished(() => scrollIntoView.mockRestore());
		const { wrapper, component } = await mountBase({}, { attach: true });
		const housing = wrapper.find<HTMLDetailsElement>(
			'details[data-section="housing"]'
		);
		expect(housing.element.open).toBe(false);

		(component.vm as unknown as { openSection: (k: string) => void })
			.openSection("housing");

		expect(housing.element.open).toBe(true);
		expect(scrollIntoView.mock.contexts).toEqual([housing.element]);
		expect(document.activeElement).toBe(housing.find("summary").element);
	});

	it("summarizes an empty plan", async () => {
		const empty: IPlanResult = structuredClone(planEmptyResult);
		empty.area.permits = 1;
		const { wrapper } = await mountBase({
			result: empty,
			autoOptimizeHabs: false,
			activeEmpire: undefined,
			priceSource: undefined,
		});

		expect(summaries(wrapper)).toEqual([
			"Empire & prices | ",
			"Planet | COGC game.cogc_program_short.NONE · 1 permit",
			"Workforce | ",
			"Infrastructure | ",
			"Experts | 0 placed",
		]);
	});

	it("hands the plan data to its sections", async () => {
		const { wrapper } = await mountBase();
		const result = planResult();

		expect(wrapper.findComponent(PlanConfiguration).props()).toEqual({
			disabled: false,
			empireOptions: undefined,
			activeEmpire: EMPIRE,
			planEmpires: [EMPIRE],
			cxUuid: undefined,
			planetId: "KW-688c",
			priceSource: "Universe average",
		});
		expect(wrapper.findComponent(PlanArea).props("areaData")).toEqual(
			result.area
		);
		expect(
			wrapper.findComponent(PlanWorkforce).props("workforceData")
		).toEqual(result.workforce);
		expect(wrapper.findComponent(PlanInfrastructure).props()).toEqual({
			disabled: false,
			infrastructureData: result.infrastructure,
			autoOptimizeHabs: true,
			planetNaturalId: "KW-688c",
		});
		expect(wrapper.findComponent(PlanExperts).props("buildings")).toEqual([
			{ name: "EXT", expertise: "RESOURCE_EXTRACTION" },
			{ name: "FP", expertise: "FOOD_INDUSTRIES" },
		]);
	});

	it("forwards the sections' edits", async () => {
		const { wrapper, component } = await mountBase();

		wrapper
			.findComponent(PlanConfiguration)
			.vm.$emit("update:active-empire", "e-2");
		wrapper.findComponent(PlanBonuses).vm.$emit("update:corphq", true);
		wrapper.findComponent(PlanBonuses).vm.$emit("update:cogc", "PIONEERS");
		wrapper.findComponent(PlanArea).vm.$emit("update:permits", 3);
		wrapper
			.findComponent(PlanWorkforce)
			.vm.$emit("update:lux", "pioneer", "lux2", false);
		const infrastructure = wrapper.findComponent(PlanInfrastructure);
		infrastructure.vm.$emit("update:infrastructure", "HBB", 5);
		infrastructure.vm.$emit("update:auto-optimize-habs", false, "auto");
		infrastructure.vm.$emit("optimize-habs", "area");
		wrapper
			.findComponent(PlanExperts)
			.vm.$emit("update:expert", "Chemistry", 4);

		expect(component.emitted("update:active-empire")).toEqual([["e-2"]]);
		expect(component.emitted("update:corphq")).toEqual([[true]]);
		expect(component.emitted("update:cogc")).toEqual([["PIONEERS"]]);
		expect(component.emitted("update:permits")).toEqual([[3]]);
		expect(component.emitted("update:lux")).toEqual([
			["pioneer", "lux2", false],
		]);
		expect(component.emitted("update:infrastructure")).toEqual([
			["HBB", 5],
		]);
		expect(component.emitted("update:auto-optimize-habs")).toEqual([
			[false, "auto"],
		]);
		expect(component.emitted("optimize-habs")).toEqual([["area"]]);
		expect(component.emitted("update:expert")).toEqual([["Chemistry", 4]]);
	});

	it("shows the planet's resources with their daily extraction", async () => {
		const { wrapper } = await mountBase();

		expect(
			wrapper
				.findAllComponents(MaterialTile)
				.map((m) => [m.props("ticker"), m.props("amount")])
		).toEqual([
			// 42.000001668930054 rounded to 2 decimals
			["H2O", 42],
			["SIO", 21],
			["O", 27],
		]);
	});

	it("adds the matching extractor for a clicked resource", async () => {
		const { wrapper, component } = await mountBase();

		await resourceButton(wrapper, "Add RIG for H2O").trigger("click");
		await resourceButton(wrapper, "Add EXT for SIO").trigger("click");
		await resourceButton(wrapper, "Add COL for O").trigger("click");

		expect(component.emitted("create:building:recipe")).toEqual([
			["RIG", "RIG#H2O"],
			["EXT", "EXT#SIO"],
			["COL", "COL#O"],
		]);
	});

	it("disables the resources when read-only", async () => {
		const { wrapper } = await mountBase({ disabled: true });

		expect(
			resourceButton(wrapper, "Add RIG for H2O").attributes("disabled")
		).toBeDefined();
	});

	it("has no resource row on a planet without resources", async () => {
		const { wrapper } = await mountBase({
			planet: { ...PLANET, resources: [] },
		});

		expect(wrapper.text()).not.toContain("Resources");
		expect(wrapper.findAllComponents(MaterialTile)).toHaveLength(0);
	});

	it("links the planet insights only when they are available", async () => {
		let { wrapper } = await mountBase();
		expect(insightsLink(wrapper)).toBeUndefined();
		wrapper.unmount();

		insights.available = true;
		insights.total = 42;
		const mounted = await mountBase();
		wrapper = mounted.wrapper;

		const link = insightsLink(wrapper)!;
		expect(link.text()).toBe(
			"42 plans on KW-688c · what others build here"
		);
		await link.trigger("click");
		expect(mounted.component.emitted("open:insights")).toHaveLength(1);
	});
});
