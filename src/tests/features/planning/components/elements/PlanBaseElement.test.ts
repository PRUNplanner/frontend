import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import PlanBaseElement from "@/features/planning/components/elements/PlanBaseElement.vue";
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
import {
	type IContextOptions,
	planViewContext,
	provideContext,
} from "@/tests/features/planning/components/elements/planViewContext.fixtures";
import plan from "@/locales/en_US/plan.json";
import planetFixture from "@/tests/test_data/api_data_planet_etherwind.json";

// Types & Interfaces
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type { PlanEmpire } from "@/features/api/schemas/planningData.schemas";
import type { IPlanResult } from "@/features/planning/usePlanCalculation.types";
import type { BaseSection } from "@/features/planning/planView.util";

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
		"showAll",
	])
);
vi.mock("@/features/planning/components/PlanInfrastructure.vue", async () =>
	(await import("@/tests/stubs")).stubComponent("PlanInfrastructure", [
		"disabled",
		"infrastructureData",
		"autoOptimizeHabs",
		"planetNaturalId",
		"showAll",
	])
);
vi.mock("@/features/planning/components/PlanExperts.vue", async () =>
	(await import("@/tests/stubs")).stubComponent("PlanExperts", [
		"disabled",
		"expertData",
		"buildings",
		"planetNaturalId",
		"showAll",
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

async function mountSection(
	section: BaseSection,
	o: IContextOptions & { planet?: Planet } = {}
) {
	const context = planViewContext({
		result: planResult(),
		activeEmpire: EMPIRE,
		planEmpires: [EMPIRE],
		priceSource: "Universe average",
		...o,
	});
	if (o.planet) context.planet = o.planet;
	const mounted = await mountComponent(
		PlanBaseElement,
		{ section },
		// real plan texts, so the values show
		{ messages: { plan }, setup: provideContext(context) }
	);
	return { ...mounted, context };
}

const resourceButton = (wrapper: VueWrapper, label: string) =>
	wrapper.find(`button[aria-label="${label}"]`);
const insightsLink = (wrapper: VueWrapper) =>
	wrapper.findAll("button").find((b) => b.text().includes("plans on"));

describe("PlanBaseElement", () => {
	beforeEach(() => {
		insights.available = false;
		insights.total = 0;
	});

	it("hands the empire and prices their data", async () => {
		const { wrapper, context } = await mountSection("empire");

		expect(wrapper.findComponent(PlanConfiguration).props()).toEqual({
			disabled: false,
			empireOptions: undefined,
			activeEmpire: EMPIRE,
			planEmpires: [EMPIRE],
			cxUuid: undefined,
			planetId: "KW-688c",
			priceSource: "Universe average",
		});
		wrapper
			.findComponent(PlanConfiguration)
			.vm.$emit("update:active-empire", "e-2");
		expect(context.empire.uuid.value).toBe("e-2");
	});

	it("puts COGC, HQ and permits side by side from 520 px of its width", async () => {
		const { wrapper, context } = await mountSection("planet");
		const grid = wrapper.findComponent(PlanBonuses).element.parentElement!;
		expect(grid.className).toContain("@min-[520px]:grid-cols-2");
		expect(wrapper.findComponent(PlanArea).props("areaData")).toEqual(
			planResult().area
		);

		wrapper.findComponent(PlanBonuses).vm.$emit("update:corphq", true);
		wrapper.findComponent(PlanBonuses).vm.$emit("update:cogc", "PIONEERS");
		wrapper.findComponent(PlanArea).vm.$emit("update:permits", 3);
		const c = context.calculation;
		expect(c.handleUpdateCorpHQ).toHaveBeenCalledWith(true);
		expect(c.handleUpdateCOGC).toHaveBeenCalledWith("PIONEERS");
		expect(c.handleUpdatePermits).toHaveBeenCalledWith(3);
	});

	it("hands workforce, infrastructure and experts their data and edits", async () => {
		const result = planResult();
		const wf = await mountSection("workforce");
		expect(
			wf.wrapper.findComponent(PlanWorkforce).props("workforceData")
		).toEqual(result.workforce);
		wf.wrapper
			.findComponent(PlanWorkforce)
			.vm.$emit("update:lux", "pioneer", "lux2", false);
		expect(
			wf.context.calculation.handleUpdateWorkforceLux
		).toHaveBeenCalledWith("pioneer", "lux2", false);

		const housing = await mountSection("housing");
		const infrastructure =
			housing.wrapper.findComponent(PlanInfrastructure);
		expect(infrastructure.props()).toEqual({
			disabled: false,
			infrastructureData: result.infrastructure,
			autoOptimizeHabs: true,
			planetNaturalId: "KW-688c",
			showAll: false,
		});
		infrastructure.vm.$emit("update:infrastructure", "HBB", 5);
		infrastructure.vm.$emit("update:auto-optimize-habs", false, "auto");
		infrastructure.vm.$emit("optimize-habs", "area");
		expect(
			housing.context.calculation.handleUpdateInfrastructure
		).toHaveBeenCalledWith("HBB", 5);
		expect(housing.context.setAutoOptimizeHabs).toHaveBeenCalledWith(
			false,
			"auto"
		);
		expect(housing.context.edits.applyOptimizeHabs).toHaveBeenCalledWith(
			"area",
			true
		);

		const ex = await mountSection("experts");
		expect(
			ex.wrapper.findComponent(PlanExperts).props("buildings")
		).toEqual([
			{ name: "EXT", expertise: "RESOURCE_EXTRACTION" },
			{ name: "FP", expertise: "FOOD_INDUSTRIES" },
		]);
		ex.wrapper
			.findComponent(PlanExperts)
			.vm.$emit("update:expert", "Chemistry", 4);
		expect(ex.context.calculation.handleUpdateExpert).toHaveBeenCalledWith(
			"Chemistry",
			4
		);
	});

	it.each<BaseSection>(["workforce", "housing", "experts"])(
		"shows all %s can hide while customising (Everything open)",
		async (section) => {
			const stub = {
				workforce: PlanWorkforce,
				housing: PlanInfrastructure,
				experts: PlanExperts,
			}[section as "workforce"];
			const off = await mountSection(section);
			expect(off.wrapper.findComponent(stub).props("showAll")).toBe(
				false
			);
			const on = await mountSection(section, { showAll: true });
			expect(on.wrapper.findComponent(stub).props("showAll")).toBe(true);
		}
	);

	it("shows the planet's resources with their daily extraction", async () => {
		const { wrapper } = await mountSection("planet");

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
		const { wrapper, context } = await mountSection("planet");

		await resourceButton(wrapper, "Add RIG for H2O").trigger("click");
		await resourceButton(wrapper, "Add EXT for SIO").trigger("click");
		await resourceButton(wrapper, "Add COL for O").trigger("click");

		expect(
			vi.mocked(context.calculation.handleCreateBuildingAndRecipe).mock
				.calls
		).toEqual([
			["RIG", "RIG#H2O"],
			["EXT", "EXT#SIO"],
			["COL", "COL#O"],
		]);
	});

	it("disables the resources when read-only", async () => {
		const { wrapper } = await mountSection("planet", { readOnly: true });

		expect(
			resourceButton(wrapper, "Add RIG for H2O").attributes("disabled")
		).toBeDefined();
	});

	it("has no resource row on a planet without resources", async () => {
		const { wrapper } = await mountSection("planet", {
			planet: { ...PLANET, resources: [] },
		});

		expect(wrapper.text()).not.toContain("Resources");
		expect(wrapper.findAllComponents(MaterialTile)).toHaveLength(0);
	});

	it("links the planet insights only when they are available", async () => {
		const { wrapper } = await mountSection("planet");
		expect(insightsLink(wrapper)).toBeUndefined();
		wrapper.unmount();

		insights.available = true;
		insights.total = 42;
		const mounted = await mountSection("planet");

		const link = insightsLink(mounted.wrapper)!;
		expect(link.text()).toBe(
			"42 plans on KW-688c · what others build here"
		);
		await link.trigger("click");
		expect(mounted.context.openInsights).toHaveBeenCalledTimes(1);
	});
});
