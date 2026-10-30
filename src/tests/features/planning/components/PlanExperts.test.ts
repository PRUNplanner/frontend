import { describe, it, expect, vi } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import { trackPlanEdit } from "@/lib/analytics/useAnalytics";
import PlanExperts from "@/features/planning/components/PlanExperts.vue";
import { mountComponent } from "@/tests/mountComponent";
import { ExpertTypeSchema } from "@/features/api/schemas/planningData.schemas";
import { experts } from "@/tests/features/planning/usePlanCalculation.fixtures";

// Types & Interfaces
import type { IExpertRecord } from "@/features/planning/usePlanCalculation.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackPlanEdit: vi.fn(),
}));

async function mountExperts(props: Record<string, unknown> = {}) {
	return mountComponent(PlanExperts, {
		disabled: false,
		expertData: experts({
			Chemistry: [2, 0.0536],
			Metallurgy: [1, 0.0306],
		}),
		planetNaturalId: "ZZ-000a",
		...props,
	});
}

// one row per shown field: name, "buildings · bonus" and a stepper
const rows = (wrapper: VueWrapper) => wrapper.findAll("[data-expert-row]");
// the name sits above the bonus
const names = (wrapper: VueWrapper) =>
	rows(wrapper).map((r) => r.find(":scope > div > :first-child").text());
const bonus = (wrapper: VueWrapper, index: number) =>
	rows(wrapper).at(index)!.find("[data-bonus]");
const input = (wrapper: VueWrapper, index: number) =>
	wrapper.findAll("input").at(index)!;
const moreButton = (wrapper: VueWrapper) => wrapper.find("button[aria-expanded]");

describe("PlanExperts", () => {
	it("lists only fields with experts, the rest behind a button", async () => {
		const { wrapper } = await mountExperts();

		expect(names(wrapper)).toEqual([
			"game.expertise.CHEMISTRY",
			"game.expertise.METALLURGY",
		]);
		expect(
			wrapper
				.findAll("input")
				.map((i) => (i.element as HTMLInputElement).value)
		).toEqual(["2", "1"]);
		// 9 fields - 2 shown = 7 more
		expect(moreButton(wrapper).text()).toBe("plan.base.experts.more");
		expect(moreButton(wrapper).attributes("aria-expanded")).toBe("false");
	});

	it("lists the fields of the plan's buildings first, with their names", async () => {
		const { wrapper } = await mountExperts({
			buildings: [
				{ name: "FP", expertise: "FOOD_INDUSTRIES" },
				{ name: "SME", expertise: "METALLURGY" },
				{ name: "HYF", expertise: "FOOD_INDUSTRIES" },
				{ name: "HB1", expertise: null },
			],
		});

		expect(names(wrapper)).toEqual([
			"game.expertise.CHEMISTRY",
			"game.expertise.FOOD_INDUSTRIES",
			"game.expertise.METALLURGY",
		]);
		expect(bonus(wrapper, 1).text()).toMatch(/^FP, HYF ·\s+0.00 %$/);
		expect(bonus(wrapper, 2).text()).toMatch(/^SME ·\s+\+3.06 %$/);
		// Chemistry has experts but no building
		expect(bonus(wrapper, 0).text()).toBe("+5.36 %");
	});

	it("shows all fields after the more button and folds them again", async () => {
		const { wrapper } = await mountExperts();

		await moreButton(wrapper).trigger("click");

		expect(moreButton(wrapper).attributes("aria-expanded")).toBe("true");
		expect(moreButton(wrapper).text()).toBe("plan.base.experts.fewer");
		// used first, then the others in their order
		expect(names(wrapper)).toEqual([
			"game.expertise.CHEMISTRY",
			"game.expertise.METALLURGY",
			"game.expertise.AGRICULTURE",
			"game.expertise.CONSTRUCTION",
			"game.expertise.ELECTRONICS",
			"game.expertise.FOOD_INDUSTRIES",
			"game.expertise.FUEL_REFINING",
			"game.expertise.MANUFACTURING",
			"game.expertise.RESOURCE_EXTRACTION",
		]);

		await moreButton(wrapper).trigger("click");

		expect(rows(wrapper)).toHaveLength(2);
	});

	it("has no more button when every field is used", async () => {
		const { wrapper } = await mountExperts({
			expertData: experts(
				Object.fromEntries(ExpertTypeSchema.options.map((e) => [e, [1, 0]]))
			),
		});

		expect(rows(wrapper)).toHaveLength(9);
		expect(moreButton(wrapper).exists()).toBe(false);
	});

	it("formats the bonus as percent", async () => {
		const { wrapper } = await mountExperts();

		// 0.0536 * 100 = 5.36, 0.0306 * 100 = 3.06
		expect(bonus(wrapper, 0).text()).toBe("+5.36 %");
		expect(bonus(wrapper, 1).text()).toBe("+3.06 %");
	});

	it("grays out fields without bonus", async () => {
		const { wrapper } = await mountExperts();
		await moreButton(wrapper).trigger("click");

		// Agriculture, 0 %, against Chemistry's 5.36 %
		expect(bonus(wrapper, 2).classes()).toContain("text-muted");
		expect(bonus(wrapper, 0).classes()).toContain("text-muted-strong");
	});

	// 6 is the most a base can hold: 5 + 1, then 5 + 1 + 1 = 7
	it.each<[number, IExpertRecord, string[]]>([
		[6, experts({ Chemistry: [5, 0.2], Metallurgy: [1, 0] }), []],
		[
			7,
			experts({
				Chemistry: [5, 0.2],
				Metallurgy: [1, 0],
				Agriculture: [1, 0],
			}),
			["plan.components.experts.warning"],
		],
	])("warns only above 6 experts: %i", async (_, expertData, warnings) => {
		const { wrapper } = await mountExperts({ expertData });

		expect(wrapper.findAll("[role=status]").map((n) => n.text())).toEqual(
			warnings
		);
	});

	it("emits and tracks a new amount", async () => {
		const { wrapper, component } = await mountExperts();

		await input(wrapper, 1).setValue("3");

		expect(component.emitted("update:expert")).toEqual([["Metallurgy", 3]]);
		expect(trackPlanEdit).toHaveBeenCalledWith({
			field: "expert",
			planet_natural_id: "ZZ-000a",
			expert_type: "Metallurgy",
			amount: 3,
		});
	});

	it("emits an amount for a field from the more list", async () => {
		const { wrapper, component } = await mountExperts();
		await moreButton(wrapper).trigger("click");

		// Agriculture, the first of the more list
		await input(wrapper, 2).setValue("1");

		expect(component.emitted("update:expert")).toEqual([["Agriculture", 1]]);
	});

	it("clamps amounts to 0..5", async () => {
		const { wrapper, component } = await mountExperts();

		await input(wrapper, 0).setValue("9");
		await input(wrapper, 0).setValue("-2");

		expect(component.emitted("update:expert")).toEqual([
			["Chemistry", 5],
			["Chemistry", 0],
		]);
	});

	it("ignores a cleared input", async () => {
		const { wrapper, component } = await mountExperts();

		await input(wrapper, 1).setValue("");

		expect(component.emitted("update:expert")).toBeUndefined();
		expect(trackPlanEdit).not.toHaveBeenCalled();
	});

	it.each([true, false])(
		"passes disabled: %s to the inputs",
		async (disabled) => {
			const { wrapper } = await mountExperts({ disabled });

			expect(
				wrapper
					.findAll("input")
					.map((i) => (i.element as HTMLInputElement).disabled)
			).toEqual([disabled, disabled]);
		}
	);
});
