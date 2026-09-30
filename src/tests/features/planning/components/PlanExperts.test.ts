import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import { trackPlanEdit } from "@/lib/analytics/useAnalytics";
import PlanExperts from "@/features/planning/components/PlanExperts.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { ExpertType } from "@/features/api/schemas/planningData.schemas";
import type { IExpertRecord } from "@/features/planning/usePlanCalculation.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackPlanEdit: vi.fn() }));

const EXPERTS: ExpertType[] = [
	"Agriculture",
	"Chemistry",
	"Construction",
	"Electronics",
	"Food_Industries",
	"Fuel_Refining",
	"Manufacturing",
	"Metallurgy",
	"Resource_Extraction",
];

/** all experts at 0 / 0 %, overridden by `set` */
function expertData(
	set: Partial<Record<ExpertType, [number, number]>> = {}
): IExpertRecord {
	return Object.fromEntries(
		EXPERTS.map((name) => [
			name,
			{
				name,
				amount: set[name]?.[0] ?? 0,
				bonus: set[name]?.[1] ?? 0,
			},
		])
	) as IExpertRecord;
}

async function mountExperts(props: Record<string, unknown> = {}) {
	return mountComponent(PlanExperts, {
		disabled: false,
		expertData: expertData({
			Chemistry: [2, 0.0536],
			Metallurgy: [1, 0.0306],
		}),
		planetNaturalId: "ZZ-000a",
		...props,
	});
}

// each expert renders label, input and bonus as grid cells
const grid = (wrapper: VueWrapper) => wrapper.find("div.grid");
const cells = (wrapper: VueWrapper) =>
	grid(wrapper).element.children as HTMLCollectionOf<HTMLElement>;
const input = (wrapper: VueWrapper, index: number) =>
	wrapper.findAll("input").at(index)!;
const bonus = (wrapper: VueWrapper, index: number) =>
	grid(wrapper).findAll(":scope > div.text-end").at(index)!;
const warning = (wrapper: VueWrapper) => wrapper.find(".bg-red-500\\/50");

describe("PlanExperts", () => {
	beforeEach(() => {
		vi.mocked(trackPlanEdit).mockClear();
	});

	it("lists every expert with amount and bonus", async () => {
		const { wrapper } = await mountExperts();

		// 9 experts x (label, input, bonus)
		expect(cells(wrapper)).toHaveLength(27);
		expect(cells(wrapper)[0].textContent!.trim()).toBe(
			"game.expertise.AGRICULTURE"
		);
		expect(cells(wrapper)[12].textContent!.trim()).toBe(
			"game.expertise.FOOD_INDUSTRIES"
		);
		expect(
			wrapper
				.findAll("input")
				.map((i) => (i.element as HTMLInputElement).value)
		).toEqual(["0", "2", "0", "0", "0", "0", "0", "1", "0"]);
	});

	it("formats the bonus as percent", async () => {
		const { wrapper } = await mountExperts();

		// 0.0536 * 100 = 5.36, 0.0306 * 100 = 3.06
		expect(bonus(wrapper, 1).text()).toBe("5.36 %");
		expect(bonus(wrapper, 7).text()).toBe("3.06 %");
		expect(bonus(wrapper, 0).text()).toBe("0.00 %");
	});

	it("grays out experts without bonus", async () => {
		const { wrapper } = await mountExperts();

		expect(bonus(wrapper, 0).classes()).toContain("text-muted");
		expect(bonus(wrapper, 1).classes()).not.toContain("text-muted");
	});

	it("does not warn at 6 experts", async () => {
		// 5 + 1 = 6, the most a base can hold
		const { wrapper } = await mountExperts({
			expertData: expertData({ Chemistry: [5, 0.2], Metallurgy: [1, 0] }),
		});

		expect(warning(wrapper).exists()).toBe(false);
	});

	it("warns above 6 experts", async () => {
		// 5 + 1 + 1 = 7
		const { wrapper } = await mountExperts({
			expertData: expertData({
				Chemistry: [5, 0.2],
				Metallurgy: [1, 0],
				Agriculture: [1, 0],
			}),
		});

		expect(warning(wrapper).text()).toBe("plan.components.experts.warning");
	});

	it("warns once the amounts grow above 6", async () => {
		const { wrapper, setProps } = await mountExperts();
		expect(warning(wrapper).exists()).toBe(false);

		// 4 + 3 = 7
		await setProps({
			expertData: expertData({ Chemistry: [4, 0], Metallurgy: [3, 0] }),
		});

		expect(warning(wrapper).exists()).toBe(true);
	});

	it("emits and tracks a new amount", async () => {
		const { wrapper, component } = await mountExperts();

		await input(wrapper, 4).setValue("3");

		expect(component.emitted("update:expert")).toEqual([
			["Food_Industries", 3],
		]);
		expect(trackPlanEdit).toHaveBeenCalledWith({
			field: "expert",
			planet_natural_id: "ZZ-000a",
			expert_type: "Food_Industries",
			amount: 3,
		});
	});

	it("clamps amounts to 0..5", async () => {
		const { wrapper, component } = await mountExperts();

		await input(wrapper, 0).setValue("9");
		await input(wrapper, 0).setValue("-2");

		expect(component.emitted("update:expert")).toEqual([
			["Agriculture", 5],
			["Agriculture", 0],
		]);
	});

	it("ignores a cleared input", async () => {
		const { wrapper, component } = await mountExperts();

		await input(wrapper, 1).setValue("");

		expect(component.emitted("update:expert")).toBeUndefined();
		expect(trackPlanEdit).not.toHaveBeenCalled();
	});

	it("disables the inputs", async () => {
		const { wrapper } = await mountExperts({ disabled: true });

		expect(
			wrapper
				.findAll("input")
				.every((i) => (i.element as HTMLInputElement).disabled)
		).toBe(true);
	});

	it("enables the inputs", async () => {
		const { wrapper } = await mountExperts();

		expect(
			wrapper
				.findAll("input")
				.some((i) => (i.element as HTMLInputElement).disabled)
		).toBe(false);
	});
});
