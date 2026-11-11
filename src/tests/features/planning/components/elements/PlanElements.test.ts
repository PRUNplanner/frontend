import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import PlanProductionElement from "@/features/planning/components/elements/PlanProductionElement.vue";
import PlanToolElement from "@/features/planning/components/elements/PlanToolElement.vue";
import PlanMaterialIOElement from "@/features/planning/components/elements/PlanMaterialIOElement.vue";
import PlanMaterialIOTotalsElement from "@/features/planning/components/elements/PlanMaterialIOTotalsElement.vue";
import PlanProduction from "@/features/planning/components/PlanProduction.vue";
import PlanMaterialIO from "@/features/planning/components/PlanMaterialIO.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	planViewContext,
	type IContextOptions,
} from "@/tests/features/planning/components/elements/planViewContext.fixtures";
import { providePlanView } from "@/features/planning/usePlanView";
import { usePlanIO } from "@/features/planning/usePlanIO";
import { usePlanCheckView } from "@/features/planning/usePlanCheckView";
import { planEmptyResult } from "@/features/planning/usePlanCalculation.types";
import {
	building,
	io,
} from "@/tests/features/planning/usePlanCalculation.fixtures";
import plan from "@/locales/en_US/plan.json";
import { FILTER_BAR } from "@/features/planning/planView.util";
import { partRoomKey } from "@/features/planning/layout/planGrid.util";

// Types & Interfaces
import { provide, ref } from "vue";
import type { Component } from "vue";
import type { IPlanResult } from "@/features/planning/usePlanCalculation.types";
import type { PlanTool } from "@/features/planning/planView.util";

// heavy children have their own tests
vi.mock("@/features/planning/components/PlanProduction.vue", async () =>
	(await import("@/tests/stubs")).stubComponent("PlanProduction", [
		"disabled",
		"productionData",
		"planetResources",
		"cogc",
		"cxUuid",
		"planetId",
		"changes",
		"materialIO",
		"experts",
		"status",
	])
);
vi.mock("@/features/planning/components/PlanMaterialIO.vue", async () =>
	(await import("@/tests/stubs")).stubComponent("PlanMaterialIO", [
		"materialIOData",
		"maxHeight",
		"value",
		"filter",
		"checks",
		"market",
	])
);
const { attrsTool } = vi.hoisted(() => ({
	attrsTool: async (name: string) => {
		const { h } = await import("vue");
		return {
			__esModule: true,
			default: { name, inheritAttrs: false, render: () => h("p", name) },
		};
	},
}));
vi.mock(
	"@/features/planning/components/tools/PlanVisitationFrequency.vue",
	() => attrsTool("PlanVisitationFrequency")
);
vi.mock("@/features/planning/components/tools/PlanRepairAnalysis.vue", () =>
	attrsTool("PlanRepairAnalysis")
);
vi.mock("@/features/planning/components/tools/PlanPOPR.vue", () =>
	attrsTool("PlanPOPR")
);
vi.mock("@/features/planning/components/tools/PlanSupplyCart.vue", () =>
	attrsTool("PlanSupplyCart")
);
vi.mock("@/features/planning/components/tools/PlanConstructionCart.vue", () =>
	attrsTool("PlanConstructionCart")
);
vi.mock("@/features/planning/components/tools/PlanProfitBreakdown.vue", () =>
	attrsTool("PlanProfitBreakdown")
);
vi.mock("@/features/planning/components/tools/PlanCheck.vue", () =>
	attrsTool("PlanCheck")
);

function result(): IPlanResult {
	const r: IPlanResult = structuredClone(planEmptyResult);
	r.production.buildings = [building("EXT"), building("FP")];
	r.materialio = [
		io("RAT", 10, { price: 500 }),
		io("DW", -4, { price: -40 }),
	];
	return r;
}

async function mountElement(
	component: Component,
	props: Record<string, unknown> = {},
	o: IContextOptions = {},
	// the room of a part set to a height, as PlanGridItem gives it
	room: number | null = null
) {
	const context = planViewContext({ result: result(), ...o });
	const mounted = await mountComponent(component, props, {
		messages: { plan },
		setup: () => {
			context.io = usePlanIO(context.calculation.result, () => "Plan");
			providePlanView(context);
			provide(partRoomKey, ref(room));
		},
	});
	await flushPromises();
	return { ...mounted, context };
}

describe("PlanProductionElement", () => {
	it("hands Production the plan and routes its edits", async () => {
		const { wrapper, context } = await mountElement(PlanProductionElement);
		const production = wrapper.findComponent(PlanProduction);
		expect(production.props()).toMatchObject({
			disabled: false,
			planetId: "KW-688c",
			productionData: context.calculation.result.value.production,
		});

		production.vm.$emit("update:building:amount", 0, 5);
		production.vm.$emit("delete:building", 1);
		production.vm.$emit("apply:starter");
		expect(
			context.calculation.handleUpdateBuildingAmount
		).toHaveBeenCalledWith(0, 5);
		expect(context.edits.deleteBuilding).toHaveBeenCalledWith(1);
		expect(context.edits.applyStarterSetup).toHaveBeenCalled();
	});
});

describe("PlanToolElement", () => {
	it.each<[PlanTool, string, Record<string, unknown>]>([
		[
			"visitation-frequency",
			"PlanVisitationFrequency",
			{ disabled: false, planUuid: "p-1" },
		],
		[
			"repair-analysis",
			"PlanRepairAnalysis",
			{ planetNaturalId: "KW-688c", shared: false },
		],
		["popr", "PlanPOPR", { planetNaturalId: "KW-688c" }],
		["supply-cart", "PlanSupplyCart", { planetNaturalId: "KW-688c" }],
		[
			"construction-cart",
			"PlanConstructionCart",
			{ planUuid: "p-1", disabled: true },
		],
		[
			"profit-breakdown",
			"PlanProfitBreakdown",
			{ overview: expect.any(Object) },
		],
		["plan-check", "PlanCheck", { planUuid: "p-1", own: true }],
	])("hands %s what it needs", async (tool, name, expected) => {
		const { wrapper } = await mountElement(
			PlanToolElement,
			{ tool },
			{ readOnly: tool === "construction-cart" }
		);
		await vi.waitFor(() =>
			expect(wrapper.findComponent({ name }).exists()).toBe(true)
		);
		expect(wrapper.findComponent({ name }).vm.$attrs).toMatchObject(
			expected
		);
		expect(wrapper.find(`[data-tool="${tool}"]`).exists()).toBe(true);
	});
});

describe("PlanMaterialIOElement", () => {
	it("has the Supply Cart's filter bar: which materials as buttons, wrapping where it doesn't fit", async () => {
		const { wrapper } = await mountElement(PlanMaterialIOElement);
		const row = wrapper.find("[data-io] > div");
		expect(row.classes()).toEqual(
			expect.arrayContaining(FILTER_BAR.split(" "))
		);
		const source = row.find("[role=group]");
		expect(source.attributes("aria-label")).toBe(plan.io.source.label);
		expect(source.findAll("button").map((b) => b.text())).toEqual([
			"Whole base",
			"Production",
			"Workforce",
		]);
		await source.findAll("button")[1].trigger("click");
		expect(source.findAll("button")[1].attributes("aria-pressed")).toBe(
			"true"
		);
		expect(wrapper.findComponent(PlanMaterialIO).props()).toMatchObject({
			value: "price",
			filter: "all",
		});
	});

	it("shows the table whole on fit; set to a height, in a box filling the part", async () => {
		const max = async (room: number | null) =>
			(await mountElement(PlanMaterialIOElement, {}, {}, room)).wrapper
				.findComponent(PlanMaterialIO)
				.props("maxHeight");
		// fit: no box of its own, the page scrolls
		expect(await max(null)).toBeUndefined();
		// 600 px of room, less the padding and border (jsdom draws no bar)
		expect(await max(600)).toBe("574px");
		// never less than a few rows
		expect(await max(100)).toBe("120px");
		// a touch screen: the whole table, no scroll box inside the page
		vi.stubGlobal("matchMedia", (q: string) => ({
			matches: q === "(pointer: coarse)",
		}));
		const touch = await mountElement(PlanMaterialIOElement, {}, {}, 600);
		expect(
			touch.wrapper.findComponent(PlanMaterialIO).props("maxHeight")
		).toBeUndefined();
	});

	it("opens Plan check on its market view from a flag", async () => {
		const { wrapper, context } = await mountElement(PlanMaterialIOElement);
		usePlanCheckView().view.value = "compare" as never;
		wrapper.findComponent(PlanMaterialIO).vm.$emit("open:plan-check");
		expect(usePlanCheckView().view.value).toBe("market");
		expect(context.focusElement).toHaveBeenCalledWith("plan-check");
	});
});

describe("PlanMaterialIOTotalsElement", () => {
	it("shows exports, imports, degradation, fees and profit, 1 → 2 → 3 → 5 columns", async () => {
		const { wrapper, context } = await mountElement(
			PlanMaterialIOTotalsElement
		);
		const dl = wrapper.find("[data-io-totals]");
		expect(dl.classes()).toEqual(
			expect.arrayContaining([
				"grid-cols-1",
				"@min-[420px]:grid-cols-2",
				"@min-[720px]:grid-cols-3",
				"@min-[1080px]:grid-cols-5",
			])
		);
		expect(dl.findAll("dt").map((d) => d.text())).toEqual([
			"Exports",
			"Imports",
			"Degradation",
			"Production fees",
			"Profit / day",
		]);
		expect(dl.text()).toContain("+500.00");

		// one source alone: no plan totals
		context.io.refIOSource.value = "production";
		await flushPromises();
		expect(wrapper.findAll("dt")).toHaveLength(2);
	});

	it("shows the production fees as a cost, 0 without any", async () => {
		const fee = async (dailyProductionFeeCost: number) => {
			const { wrapper } = await mountElement(
				PlanMaterialIOTotalsElement,
				{},
				{ overview: { dailyProductionFeeCost } }
			);
			return wrapper.findAll("[data-io-totals] dd")[3].text();
		};
		expect(await fee(385)).toBe("-385.00");
		expect(await fee(0)).toBe("0.00");
	});
});
