import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import PlanProductionBuilding from "@/features/planning/components/PlanProductionBuilding.vue";
import PlanResultsBar from "@/features/planning/components/PlanResultsBar.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	building,
	experts,
	wf,
} from "@/tests/features/planning/usePlanCalculation.fixtures";
import plan from "@/locales/en_US/plan.json";

vi.mock("@/features/plan_analytics/usePlanetInsights", () => ({
	usePlanetInsights: () => ({ typicalRecipes: () => undefined }),
}));
vi.mock("@/features/sharing/components/SharedPlanDeltas.vue", () => ({
	default: { name: "SharedPlanDeltas", render: () => h("div") },
}));

/**
 * What browser page translation does to the DOM (#700): every run of
 * adjacent text nodes, Vue's empty fragment markers included, is replaced
 * by one <font><font> with the (translated) text
 */
function translate(root: Node): void {
	let run: Text[] = [];
	const flush = () => {
		const text = run.map((t) => t.nodeValue).join("");
		if (text.trim()) {
			const outer = document.createElement("font");
			const inner = document.createElement("font");
			inner.textContent = text;
			outer.appendChild(inner);
			run[0].replaceWith(outer);
			run.slice(1).forEach((t) => t.remove());
		}
		run = [];
	};
	for (const node of [...root.childNodes]) {
		if (node.nodeType === Node.TEXT_NODE) run.push(node as Text);
		else {
			flush();
			translate(node);
		}
	}
	flush();
}

/** Translates the mounted component, collects what Vue reports on update */
function translated(wrapper: VueWrapper): unknown[] {
	const errors: unknown[] = [];
	wrapper.vm.$.appContext.config.errorHandler = (e) => errors.push(e);
	translate(wrapper.element.parentElement!);
	return errors;
}

describe("plan editor under page translation", () => {
	// a building deleted, a recipe picked or undone can drop a workforce tier
	it("drops a workforce tier from the results bar", async () => {
		const workforce = {
			pioneer: wf("pioneer", { required: 100, capacity: 100 }),
			settler: wf("settler", { required: 50, capacity: 60 }),
			technician: wf("technician"),
			engineer: wf("engineer"),
			scientist: wf("scientist"),
		};
		const { wrapper, setProps } = await mountComponent(
			PlanResultsBar,
			{
				overview: {
					dailyCost: 0,
					dailyProfit: 0,
					totalConstructionCost: 0,
					dailyDegradationCost: 0,
					profit: 0,
					roi: 0,
				},
				area: {
					permits: 1,
					areaUsed: 0,
					areaTotal: 500,
					areaLeft: 500,
				},
				visitation: {
					storageFilled: 0,
					dailyWeightImport: 0,
					dailyWeightExport: 0,
					dailyVolumeImport: 0,
					dailyVolumeExport: 0,
					dailyWeight: 0,
					dailyVolume: 0,
				},
				workforce,
				experts: experts(),
				revenue: 0,
				cost: 0,
			},
			{ messages: { plan } }
		);
		const errors = translated(wrapper);

		await setProps({
			workforce: {
				...workforce,
				settler: wf("settler", { capacity: 60 }),
			},
		});

		expect(errors).toEqual([]);
		expect(wrapper.find("[data-workforce-tiers]").text()).toBe(
			"PIO 100/100"
		);
	});

	it("changes a building's sub line", async () => {
		const { wrapper, setProps } = await mountComponent(
			PlanProductionBuilding,
			{
				disabled: false,
				buildingData: building("SME", {
					expertise: "METALLURGY",
					efficiencyElements: [
						{ efficiencyType: "EXPERT", value: 1.07 },
						{ efficiencyType: "FERTILITY", value: 1.1 },
					],
				}),
				buildingIndex: 0,
				planetId: "ZV-307c",
				experts: 1,
			},
			{ messages: { plan } }
		);
		const errors = translated(wrapper);

		await setProps({ experts: 2 });

		expect(errors).toEqual([]);
		expect(wrapper.text()).toContain("2 experts");
		expect(wrapper.text()).not.toContain("1 expert ");
	});
});
