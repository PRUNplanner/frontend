import { describe, it, expect, beforeEach, onTestFinished, vi } from "vitest";
import { humanizeTimeMs } from "@/util/date";
import type { VueWrapper } from "@vue/test-utils";

import PlanRecipePicker from "@/features/planning/components/PlanRecipePicker.vue";
import { mountComponent } from "@/tests/mountComponent";

import {
	activeRecipe,
	building,
	inOut,
	m,
	option,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

// Types & Interfaces
import type { IRecipeBuildingOption } from "@/features/planning/usePlanCalculation.types";

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
vi.mock(
	"@/features/material_tile/components/MaterialTile.vue",
	async () => (await import("@/tests/stubs")).materialTile
);

// by ȼ/day: FE, AL, CU, BSE; by ȼ/area: BSE, CU, AL, FE; by payback:
// CU, AL, FE, BSE (never pays back)
const FE = option("R_FE", {
	inputs: [m("FEO", 2)],
	outputs: [m("FE")],
	dailyRevenue: 500,
	profitPerArea: 5,
	roi: 20,
});
const AL = option("R_AL", {
	inputs: [m("ALO", 2)],
	outputs: [m("AL")],
	dailyRevenue: 300,
	profitPerArea: 10,
	roi: 10,
});
const CU = option("R_CU", {
	inputs: [m("CUO", 2)],
	outputs: [m("CU")],
	dailyRevenue: 100,
	profitPerArea: 20,
	roi: 5,
});
const BSE = option("R_BSE", {
	inputs: [m("FE", 2)],
	outputs: [m("BSE")],
	dailyRevenue: 50,
	profitPerArea: 30,
	roi: -1,
});

const active = (recipe: IRecipeBuildingOption) =>
	activeRecipe(recipe, { amount: 2, dailyShare: 0.5 });

/** a building with its recipe options, running `running` */
const withRecipes = (
	name: string,
	recipeOptions: IRecipeBuildingOption[],
	running: IRecipeBuildingOption[]
) => building(name, { recipeOptions, activeRecipes: running.map(active) });

// SME runs FE and CU, PP1 turns FE into BSE
const SME = withRecipes("SME", [FE, AL, CU, BSE], [FE, CU]);
const PP1 = withRecipes("PP1", [BSE], [BSE]);

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
	});

	it("change: lists the current recipe first, not selectable", async () => {
		const { wrapper } = await mountPicker();

		expect(ids(wrapper)).toEqual(["FE", "AL", "CU", "BSE"]);
		// CU is ordered already but stays selectable: free accounts split
		// their runs into a second order of the same recipe
		expect(disabled(wrapper)).toEqual([true, false, false, false]);
		expect(options(wrapper).at(0)!.text()).toContain("plan.picker.current");
		expect(options(wrapper).at(2)!.text()).toContain("plan.picker.in_plan");
		expect(wrapper.text()).toContain("plan.picker.change_title");
		// the highlight starts on the first selectable row
		expect(highlighted(wrapper)).toBe("AL");
	});

	it("shows the runtime in a column of its own", async () => {
		const { wrapper } = await mountPicker();

		expect(wrapper.text()).toContain("plan.picker.columns.runtime");
		// every option takes an hour per run
		expect(
			options(wrapper).map((o) => o.find("[data-runtime]").text())
		).toEqual(Array(4).fill(humanizeTimeMs(3600000)));
	});

	it("add: lists the recipes already ordered last, still selectable", async () => {
		const { wrapper } = await mountPicker({
			mode: "add",
			recipeIndex: undefined,
		});

		expect(ids(wrapper)).toEqual(["AL", "BSE", "FE", "CU"]);
		// nothing is replaced, so every row can be picked
		expect(disabled(wrapper)).toEqual([false, false, false, false]);
		expect(options(wrapper).at(2)!.text()).toContain("plan.picker.in_plan");
		expect(wrapper.text()).toContain("plan.picker.add_title");
		expect(highlighted(wrapper)).toBe("AL");
	});

	it("moves over selectable rows with ↑ ↓ and picks with Enter", async () => {
		const { wrapper, component } = await mountPicker();

		expect(highlighted(wrapper)).toBe("AL");
		// CU, already ordered, can be picked again
		await press(wrapper, "ArrowDown");
		expect(highlighted(wrapper)).toBe("CU");
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

	it("moves over the ordered rows too in add mode", async () => {
		const { wrapper, component } = await mountPicker({
			mode: "add",
			recipeIndex: undefined,
		});

		// wraps from the first row to CU, ordered and listed last
		await press(wrapper, "ArrowUp");
		expect(highlighted(wrapper)).toBe("CU");
		await press(wrapper, "Enter");
		expect(component.emitted("pick")).toEqual([["R_CU"]]);
		await press(wrapper, "ArrowDown");
		expect(highlighted(wrapper)).toBe("AL");
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
		onTestFinished(() => {
			opener.remove();
			overlay.remove();
		});
		const down = (el: Element) =>
			el.dispatchEvent(new Event("pointerdown", { bubbles: true }));

		down(wrapper.find("[role=listbox]").element);
		down(opener);
		down(overlay);
		expect(component.emitted("close")).toBeUndefined();

		down(document.body);
		expect(component.emitted("close")).toHaveLength(1);

		// an unmounted component can't emit, so check the listener goes
		const remove = vi.spyOn(document, "removeEventListener");
		onTestFinished(() => remove.mockRestore());
		wrapper.unmount();
		expect(remove).toHaveBeenCalledWith("pointerdown", expect.any(Function));
	});

	it("picks a clicked row, an ordered one too, but not the current", async () => {
		const { wrapper, component } = await mountPicker();

		await options(wrapper).at(0)!.trigger("click");
		expect(component.emitted("pick")).toBeUndefined();

		await options(wrapper).at(2)!.trigger("click");
		await options(wrapper).at(1)!.trigger("click");
		expect(component.emitted("pick")).toEqual([["R_CU"], ["R_AL"]]);
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
				materialIO: [inOut("FE", 12.5, 20)],
			});

			expect(note(wrapper).text()).toBe("PP1 turn FE into BSE, buy 12.50");
		});

		it("falls back to the workforce without a building using it", async () => {
			const { wrapper } = await mountPicker({
				buildings: [SME],
				materialIO: [inOut("FE", 3, 20)],
			});

			expect(note(wrapper).text()).toBe("workforce uses FE, buy 3.00");
		});

		it("is not shown without an In, or when adding", async () => {
			const unused = await mountPicker({ materialIO: [inOut("FE", 0, 20)] });
			expect(note(unused.wrapper).exists()).toBe(false);

			const missing = await mountPicker({ materialIO: [inOut("AL", 5, 0)] });
			expect(note(missing.wrapper).exists()).toBe(false);

			const add = await mountPicker({
				mode: "add",
				recipeIndex: undefined,
				materialIO: [inOut("FE", 12.5, 20)],
			});
			expect(note(add.wrapper).exists()).toBe(false);
		});
	});

	it("names the inputs the plan makes itself, not the bought ones", async () => {
		const { wrapper } = await mountPicker({
			materialIO: [inOut("FE", 0, 20), inOut("FEO", 10, 0)],
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
		// the ordered recipe takes the highlight, the current one doesn't
		await options(wrapper)[2].trigger("mousemove");
		expect(highlighted(wrapper)).toBe("CU");
		await options(wrapper)[0].trigger("mousemove");
		expect(highlighted(wrapper)).toBe("CU");
	});

	it("leaves other keys to the page", async () => {
		const { wrapper, component } = await mountPicker();
		const before = highlighted(wrapper);

		await press(wrapper, "a");

		expect(highlighted(wrapper)).toBe(before);
		expect(component.emitted("pick")).toBeUndefined();
		expect(component.emitted("close")).toBeUndefined();
	});

	it("still picks in add mode when every recipe is ordered", async () => {
		const { wrapper, component } = await mountPicker({
			mode: "add",
			recipeIndex: undefined,
			building: withRecipes("SME", [FE, CU], [FE, CU]),
		});

		expect(highlighted(wrapper)).toBe("FE");
		await press(wrapper, "ArrowDown");
		await press(wrapper, "Enter");
		expect(component.emitted("pick")).toEqual([["R_CU"]]);
	});

	it("has nothing to move or pick when the current recipe is the only one", async () => {
		const { wrapper, component } = await mountPicker({
			building: withRecipes("SME", [FE], [FE]),
		});

		expect(listbox(wrapper).attributes("aria-activedescendant")).toBe(
			undefined
		);
		await press(wrapper, "ArrowDown");
		await press(wrapper, "Enter");
		expect(component.emitted("pick")).toBeUndefined();
	});

	it("compares with the current recipe's own revenue", async () => {
		// the engine's active recipes carry no revenue, the options do
		const sme = withRecipes("SME", [FE, AL, CU, BSE], [FE, CU]);
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
