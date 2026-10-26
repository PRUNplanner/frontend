import { describe, it, expect, beforeEach, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import PlanRecipePicker from "@/features/planning/components/PlanRecipePicker.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IMaterialIO,
	IProductionBuilding,
	IProductionBuildingRecipe,
	IRecipeBuildingOption,
} from "@/features/planning/usePlanCalculation.types";

const insights = vi.hoisted(() => ({
	available: false,
	popularity: {} as Record<string, number>,
}));
vi.mock("@/features/plan_analytics/usePlanetInsights", async () => {
	const { computed } = await import("vue");
	return {
		usePlanetInsights: () => ({
			isAvailable: computed(() => insights.available),
			recipePopularity: (_ticker: string, id: string) =>
				insights.popularity[id],
		}),
	};
});
const trackEvent = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/useAnalytics", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent,
}));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String, amount: Number },
		render: () => h("span"),
	},
}));

const m = (ticker: string, amount = 1) => ({
	material_ticker: ticker,
	material_amount: amount,
});

const option = (
	id: string,
	output: string,
	input: string,
	daily: number,
	area: number,
	roi: number
): IRecipeBuildingOption => ({
	recipe_id: id,
	building_ticker: "SME",
	recipe_name: id,
	time_ms: 3600000,
	inputs: [m(input, 2)],
	outputs: [m(output)],
	dailyRevenue: daily,
	roi,
	profitPerArea: area,
});

// by ȼ/day: FE, AL, CU, BSE; by ȼ/area: BSE, CU, AL, FE; by payback:
// CU, AL, FE, BSE (never pays back)
const FE = option("R_FE", "FE", "FEO", 500, 5, 20);
const AL = option("R_AL", "AL", "ALO", 300, 10, 10);
const CU = option("R_CU", "CU", "CUO", 100, 20, 5);
const BSE = option("R_BSE", "BSE", "FE", 50, 30, -1);

const active = (recipe: IRecipeBuildingOption): IProductionBuildingRecipe => ({
	recipeId: recipe.recipe_id,
	amount: 2,
	recipe,
	dailyShare: 0.5,
	time: 0,
	cogm: undefined,
});

function building(
	name: string,
	recipeOptions: IRecipeBuildingOption[],
	recipes: IRecipeBuildingOption[]
): IProductionBuilding {
	return {
		name,
		amount: 1,
		areaUsed: 0,
		activeRecipes: recipes.map(active),
		recipeOptions,
		totalEfficiency: 1,
		efficiencyElements: [],
		totalBatchTime: 0,
		constructionMaterials: [],
		constructionCost: 0,
		workforceMaterials: [],
		workforceDailyCost: 0,
		dailyRevenue: 0,
		expertise: null,
	};
}

// SME runs FE and CU, PP1 turns FE into BSE
const SME = building("SME", [FE, AL, CU, BSE], [FE, CU]);
const PP1 = building("PP1", [BSE], [BSE]);

const io = (ticker: string, input: number, output: number): IMaterialIO => ({
	ticker,
	input,
	output,
	delta: output - input,
	individualWeight: 0,
	individualVolume: 0,
	totalWeight: 0,
	totalVolume: 0,
	price: 0,
});

const MESSAGES = {
	plan: {
		picker: {
			dependency: "{buildings} turn {ticker} into {outputs}, buy {amount}",
			dependency_workforce: "workforce uses {ticker}, buy {amount}",
			vs_now: "{delta} vs now",
		},
	},
};

async function mountPicker(props: Record<string, unknown> = {}) {
	return mountComponent(
		PlanRecipePicker,
		{
			mode: "change",
			building: SME,
			recipeIndex: 0,
			materialIO: [],
			buildings: [SME, PP1],
			planetId: "ZV-307c",
			...props,
		},
		{ messages: MESSAGES }
	);
}

const listbox = (wrapper: VueWrapper) => wrapper.find("[role=listbox]");
const options = (wrapper: VueWrapper) => wrapper.findAll("[role=option]");
const ids = (wrapper: VueWrapper) =>
	options(wrapper).map(
		(o) => o.findComponent({ name: "MaterialTile" }).props("ticker") as string
	);
const disabled = (wrapper: VueWrapper) =>
	options(wrapper).map((o) => o.attributes("aria-disabled") === "true");
/** the output ticker of the highlighted row */
function highlighted(wrapper: VueWrapper): string {
	const id = listbox(wrapper).attributes("aria-activedescendant");
	const row = options(wrapper).find((o) => o.attributes("id") === id)!;
	expect(row.attributes("aria-selected")).toBe("true");
	return row.findComponent({ name: "MaterialTile" }).props("ticker");
}
const press = (wrapper: VueWrapper, key: string) =>
	listbox(wrapper).trigger("keydown", { key });

describe("PlanRecipePicker", () => {
	beforeEach(() => {
		insights.available = false;
		insights.popularity = {};
		trackEvent.mockReset();
	});

	it("change: lists the current recipe first, not selectable", async () => {
		const { wrapper } = await mountPicker();

		expect(ids(wrapper)).toEqual(["FE", "AL", "CU", "BSE"]);
		// CU is ordered already: a second order would duplicate it
		expect(disabled(wrapper)).toEqual([true, false, true, false]);
		expect(options(wrapper).at(0)!.text()).toContain("plan.picker.current");
		expect(options(wrapper).at(2)!.text()).toContain("plan.picker.in_plan");
		expect(wrapper.text()).toContain("plan.picker.change_title");
		// the highlight starts on the first selectable row
		expect(highlighted(wrapper)).toBe("AL");
	});

	it("add: lists the recipes already ordered last, disabled", async () => {
		const { wrapper } = await mountPicker({
			mode: "add",
			recipeIndex: undefined,
		});

		expect(ids(wrapper)).toEqual(["AL", "BSE", "FE", "CU"]);
		expect(disabled(wrapper)).toEqual([false, false, true, true]);
		expect(options(wrapper).at(2)!.text()).toContain("plan.picker.in_plan");
		expect(wrapper.text()).toContain("plan.picker.add_title");
		expect(highlighted(wrapper)).toBe("AL");
	});

	it("moves over selectable rows with ↑ ↓ and picks with Enter", async () => {
		const { wrapper, component } = await mountPicker();

		expect(highlighted(wrapper)).toBe("AL");
		// skips CU, already ordered
		await press(wrapper, "ArrowDown");
		expect(highlighted(wrapper)).toBe("BSE");
		// wraps around past the current recipe
		await press(wrapper, "ArrowDown");
		expect(highlighted(wrapper)).toBe("AL");
		await press(wrapper, "ArrowUp");
		expect(highlighted(wrapper)).toBe("BSE");

		await press(wrapper, "Enter");
		expect(component.emitted("pick")).toEqual([["R_BSE"]]);
		expect(component.emitted("close")).toBeUndefined();
	});

	it("skips the disabled rows in add mode", async () => {
		const { wrapper, component } = await mountPicker({
			mode: "add",
			recipeIndex: undefined,
		});

		await press(wrapper, "ArrowUp");
		expect(highlighted(wrapper)).toBe("BSE");
		await press(wrapper, "ArrowDown");
		expect(highlighted(wrapper)).toBe("AL");
		await press(wrapper, "Enter");
		expect(component.emitted("pick")).toEqual([["R_AL"]]);
	});

	it("closes on Escape and the close button", async () => {
		const { wrapper, component } = await mountPicker();

		await press(wrapper, "Escape");
		expect(component.emitted("close")).toHaveLength(1);

		await wrapper
			.find('button[aria-label="plan.picker.close"]')
			.trigger("click");
		expect(component.emitted("close")).toHaveLength(2);
		expect(component.emitted("pick")).toBeUndefined();
	});

	it("closes on a click outside, not inside, on an opener or a price overlay", async () => {
		const { wrapper, component } = await mountPicker();
		const opener = document.createElement("button");
		opener.setAttribute("data-recipe-button", "");
		const overlay = document.createElement("div");
		overlay.setAttribute("role", "tooltip");
		document.body.append(opener, overlay);
		const down = (el: Element) =>
			el.dispatchEvent(new Event("pointerdown", { bubbles: true }));

		down(wrapper.find("[role=listbox]").element);
		down(opener);
		down(overlay);
		expect(component.emitted("close")).toBeUndefined();

		down(document.body);
		expect(component.emitted("close")).toHaveLength(1);

		wrapper.unmount();
		down(document.body);
		// unmount clears the history; a stray emit would start it again
		expect(component.emitted("close")).toBeUndefined();
		opener.remove();
		overlay.remove();
	});

	it("picks a clicked row, but not a disabled one", async () => {
		const { wrapper, component } = await mountPicker();

		await options(wrapper).at(0)!.trigger("click");
		expect(component.emitted("pick")).toBeUndefined();

		await options(wrapper).at(2)!.trigger("click");
		expect(component.emitted("pick")).toBeUndefined();

		await options(wrapper).at(1)!.trigger("click");
		expect(component.emitted("pick")).toEqual([["R_AL"]]);
	});

	it("tracks opening, with its mode", async () => {
		await mountPicker();
		await mountPicker({ mode: "add", recipeIndex: undefined });

		expect(trackEvent.mock.calls).toEqual([
			["plan:recipe_picker_open", { mode: "change" }],
			["plan:recipe_picker_open", { mode: "add" }],
		]);
	});

	describe("dependency note", () => {
		const note = (wrapper: VueWrapper) =>
			wrapper.find("[data-dependency-note]");

		it("names who uses the output and its In amount", async () => {
			const { wrapper } = await mountPicker({
				materialIO: [io("FE", 12.5, 20)],
			});

			expect(note(wrapper).text()).toBe("PP1 turn FE into BSE, buy 12.50");
		});

		it("falls back to the workforce without a building using it", async () => {
			const { wrapper } = await mountPicker({
				buildings: [SME],
				materialIO: [io("FE", 3, 20)],
			});

			expect(note(wrapper).text()).toBe("workforce uses FE, buy 3.00");
		});

		it("is not shown without an In, or when adding", async () => {
			const unused = await mountPicker({ materialIO: [io("FE", 0, 20)] });
			expect(note(unused.wrapper).exists()).toBe(false);

			const missing = await mountPicker({ materialIO: [io("AL", 5, 0)] });
			expect(note(missing.wrapper).exists()).toBe(false);

			const add = await mountPicker({
				mode: "add",
				recipeIndex: undefined,
				materialIO: [io("FE", 12.5, 20)],
			});
			expect(note(add.wrapper).exists()).toBe(false);
		});
	});

	it("names the inputs the plan makes itself, not the bought ones", async () => {
		const { wrapper } = await mountPicker({
			materialIO: [io("FE", 0, 20), io("FEO", 10, 0)],
		});

		// FE: FEO is bought; BSE: FE is made
		expect(options(wrapper).at(0)!.text()).not.toContain(
			"plan.picker.uses_made"
		);
		expect(options(wrapper).at(3)!.text()).toContain(
			"plan.picker.uses_made"
		);
		expect(wrapper.find("[role=img]").exists()).toBe(false);
	});

	describe("sort", () => {
		const sortButtons = (wrapper: VueWrapper) =>
			wrapper.find("[role=group]").findAll("button");

		it("has no sort without insights: ȼ/day is the only order", async () => {
			const { wrapper } = await mountPicker();

			expect(wrapper.find("[role=group]").exists()).toBe(false);
		});

		it("sorts by popularity with insights, the current recipe stays first", async () => {
			insights.available = true;
			insights.popularity = { R_AL: 10, R_BSE: 60 };
			const { wrapper } = await mountPicker();

			expect(sortButtons(wrapper).map((b) => b.text())).toEqual([
				"plan.picker.sort.daily",
				"plan.picker.sort.popular",
			]);
			await sortButtons(wrapper).at(1)!.trigger("click");
			expect(trackEvent).toHaveBeenCalledWith("plan:recipe_picker_sort", {
				sort: "popular",
			});

			expect(ids(wrapper)).toEqual(["FE", "BSE", "AL", "CU"]);
			expect(options(wrapper).at(1)!.text()).toContain("60 %");
			expect(options(wrapper).at(3)!.text()).toContain(
				"plan.picker.below_threshold"
			);
		});
	});

	it("follows the mouse over selectable rows only", async () => {
		const { wrapper } = await mountPicker();

		await options(wrapper)[3].trigger("mousemove");
		expect(highlighted(wrapper)).toBe("BSE");
		// the current and the ordered recipe take no highlight
		await options(wrapper)[0].trigger("mousemove");
		await options(wrapper)[2].trigger("mousemove");
		expect(highlighted(wrapper)).toBe("BSE");
	});

	it("leaves other keys to the page", async () => {
		const { wrapper } = await mountPicker();
		const before = highlighted(wrapper);

		await press(wrapper, "a");

		expect(highlighted(wrapper)).toBe(before);
		expect(wrapper.emitted("pick")).toBeUndefined();
		expect(wrapper.emitted("close")).toBeUndefined();
	});

	it("has nothing to move or pick when every recipe is ordered", async () => {
		const { wrapper } = await mountPicker({
			mode: "add",
			recipeIndex: undefined,
			building: building("SME", [FE, CU], [FE, CU]),
		});

		expect(listbox(wrapper).attributes("aria-activedescendant")).toBe(
			undefined
		);
		await press(wrapper, "ArrowDown");
		await press(wrapper, "Enter");
		expect(wrapper.emitted("pick")).toBeUndefined();
	});

	it("compares with the current recipe's own revenue", async () => {
		// the engine's active recipes carry no revenue, the options do
		const sme = building("SME", [FE, AL, CU, BSE], [FE, CU]);
		sme.activeRecipes[0].recipe = { ...FE, dailyRevenue: 0 };
		const { wrapper } = await mountPicker({ building: sme });

		// AL makes 300 a day, FE (current) 500
		expect(options(wrapper)[1].text()).toContain("-200 vs now");
	});

	it("says in its footer whether a pick replaces or adds", async () => {
		const change = await mountPicker();
		const add = await mountPicker({ mode: "add", recipeIndex: undefined });

		expect(change.wrapper.find("footer").text()).toContain("plan.picker.keys");
		expect(change.wrapper.find("footer").text()).not.toContain("keys_add");
		expect(add.wrapper.find("footer").text()).toContain(
			"plan.picker.keys_add"
		);
	});
});
