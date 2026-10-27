import { flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import PlanProductionBuilding from "@/features/planning/components/PlanProductionBuilding.vue";
import PlanProductionRecipe from "@/features/planning/components/PlanProductionRecipe.vue";
import PlanRecipePicker from "@/features/planning/components/PlanRecipePicker.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import PValue from "@/ui/components/PValue.vue";
import PTooltip from "@/ui/components/PTooltip.vue";
import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IProductionBuilding,
	IProductionBuildingRecipe,
	IRecipeBuildingOption,
} from "@/features/planning/usePlanCalculation.types";

import type { ITypicalRecipes } from "@/features/plan_analytics/usePlanetInsights.types";

const typical = vi.hoisted(() => ({
	value: undefined as ITypicalRecipes | undefined,
}));
vi.mock("@/features/plan_analytics/usePlanetInsights", () => ({
	usePlanetInsights: () => ({ typicalRecipes: () => typical.value }),
}));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render: () => h("span"),
	},
}));

// PlanProductionRecipe and PlanRecipePicker have their own tests, the stubs
// keep the props and mark their place in the DOM
vi.mock("@/features/planning/components/PlanProductionRecipe.vue", () => ({
	default: {
		name: "PlanProductionRecipe",
		props: {
			disabled: Boolean,
			recipeIndex: Number,
			recipeData: Object,
			isNew: Boolean,
			pickerOpen: Boolean,
			cxUuid: String,
			planetId: String,
			buildingAmount: Number,
			optionDaily: Number,
			striped: Boolean,
		},
		emits: [
			"update:building:recipe:amount",
			"delete:building:recipe",
			"open:picker",
		],
		render: () =>
			h("div", { "data-stub": "recipe" }, [
				h("button", { "data-recipe-button": "" }),
			]),
	},
}));
vi.mock("@/features/planning/components/PlanRecipePicker.vue", () => ({
	default: {
		name: "PlanRecipePicker",
		props: {
			mode: String,
			building: Object,
			recipeIndex: Number,
			materialIO: Array,
			buildings: Array,
			planetId: String,
		},
		emits: ["pick", "close"],
		render: () => h("div", { "data-stub": "picker" }),
	},
}));

const OPTION = { recipe_id: "SME#FE" } as IRecipeBuildingOption;
const recipe = (recipeId: string, output: string) =>
	({
		recipeId,
		amount: 1,
		recipe: { outputs: [{ material_ticker: output }] },
	}) as IProductionBuildingRecipe;

function building(
	overrides: Partial<IProductionBuilding> = {}
): IProductionBuilding {
	return {
		name: "SME",
		amount: 3,
		areaUsed: 105,
		activeRecipes: [recipe("SME#FE", "FE"), recipe("SME#AL", "AL")],
		recipeOptions: [OPTION],
		totalEfficiency: 1.3375,
		efficiencyElements: [
			{ efficiencyType: "COGC", value: 1.25 },
			{ efficiencyType: "EXPERT", value: 1.07 },
			{ efficiencyType: "WORKFORCE", value: 1 },
		],
		totalBatchTime: 0,
		constructionMaterials: [],
		constructionCost: 123456.789,
		workforceMaterials: [],
		workforceDailyCost: 0,
		dailyRevenue: 2500,
		expertise: "METALLURGY",
		...overrides,
	};
}

async function mountBuilding(
	props: Record<string, unknown> = {},
	messages?: Record<string, unknown>,
	attach = false
) {
	return mountComponent(
		PlanProductionBuilding,
		{
			disabled: false,
			buildingData: building(),
			buildingIndex: 2,
			cxUuid: "cx-uuid",
			planetId: "ZV-307c",
			...props,
		},
		{ messages, attach }
	);
}

const row = (wrapper: VueWrapper) => wrapper.find("[data-building-row]");
const nameButton = (wrapper: VueWrapper) =>
	wrapper.find('button[aria-label="plan.production.fold"]');
const deleteButton = (wrapper: VueWrapper) =>
	wrapper.find('button[aria-label="plan.production.delete_building"]');
const addRecipe = (wrapper: VueWrapper) => wrapper.find("[data-add-recipe]");
const recipes = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(PlanProductionRecipe);
const pickers = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(PlanRecipePicker);
/** what [data-recipes] holds, in order */
const layout = (wrapper: VueWrapper) =>
	Array.from(wrapper.find("[data-recipes]").element.children).map(
		(el) =>
			el.getAttribute("data-stub") ??
			(el.hasAttribute("data-add-recipe") ? "add" : el.getAttribute("role"))
	);

describe("PlanProductionBuilding", () => {
	beforeEach(() => {
		typical.value = undefined;
	});

	it("shows ticker, name, amount and the building figures", async () => {
		const { wrapper } = await mountBuilding();
		const text = row(wrapper).text();

		expect(text).toContain("SME");
		expect(nameButton(wrapper).text()).toContain("game.building.SME");
		// 1.3375 * 100, one decimal
		expect(text).toContain("133.8 %");
		expect(text).toContain("2,500.00");
		expect(text).toContain("105");
		// no construction cost column any more
		expect(text).not.toContain("123,456");
		expect(
			wrapper.findComponent(PInputNumber).find("input").element.value
		).toBe("3");
	});

	it("names what lifts the efficiency below the name", async () => {
		const { wrapper, setProps } = await mountBuilding(
			{ experts: 3 },
			{ plan: { production: { experts: "{n} expert | {n} experts" } } }
		);
		const sub = () => nameButton(wrapper).find("span.block").text();

		// workforce and neutral factors are left out, the COGC shows as the
		// tick on the expertise
		expect(sub()).toBe("✓ game.expertise.METALLURGY · 3 experts");

		await setProps({
			buildingData: building({ expertise: null, efficiencyElements: [] }),
		});
		expect(sub()).toBe("");
	});

	it("ticks the expertise when the planet's COGC matches, crosses it when not", async () => {
		const { wrapper, setProps } = await mountBuilding();
		const match = () => wrapper.find("[data-cogc-match]");

		expect(match().text()).toBe("✓ game.expertise.METALLURGY");
		expect(match().classes()).toContain("text-positive");

		// no COGC element: the planet's program lifts something else
		await setProps({
			buildingData: building({
				efficiencyElements: [{ efficiencyType: "EXPERT", value: 1.07 }],
			}),
		});
		expect(match().text()).toBe("✗ game.expertise.METALLURGY");
		expect(match().classes()).toContain("text-negative");
		expect(match().classes()).not.toContain("text-positive");

		// a building without expertise has nothing to match
		await setProps({ buildingData: building({ expertise: null }) });
		expect(match().exists()).toBe(false);
	});

	it("shows the revenue with its sign", async () => {
		const { wrapper, setProps } = await mountBuilding();
		const revenue = () => wrapper.findComponent(PValue);

		expect(revenue().classes()).toEqual(["text-positive"]);
		expect(revenue().text()).toMatch(/^\+/);

		await setProps({ buildingData: building({ dailyRevenue: 0 }) });
		expect(revenue().classes()).toEqual([]);

		await setProps({ buildingData: building({ dailyRevenue: -0.01 }) });
		expect(revenue().classes()).toEqual(["text-negative"]);
		expect(revenue().text()).toBe("-0.01");
	});

	it("flags a building without amount", async () => {
		const { wrapper, setProps } = await mountBuilding();

		expect(row(wrapper).classes()).toContain("border-l-transparent");

		await setProps({ buildingData: building({ amount: 0 }) });
		expect(row(wrapper).classes()).toContain("border-l-negative");
	});

	it("emits the new amount, but not an empty one", async () => {
		const { wrapper, component } = await mountBuilding();
		const input = wrapper.findComponent(PInputNumber);

		input.vm.$emit("update:value", null);
		input.vm.$emit("update:value", undefined);
		expect(component.emitted("update:building:amount")).toBe(undefined);

		input.vm.$emit("update:value", 0);
		await input.find("input").setValue("7");

		expect(component.emitted("update:building:amount")).toEqual([
			[2, 0],
			[2, 7],
		]);
	});

	it("goes down to 0 buildings, typed or with the minus button", async () => {
		const { wrapper, component } = await mountBuilding({
			buildingData: building({ amount: 1 }),
		});
		const input = wrapper.findComponent(PInputNumber);

		await input.find("input").setValue("0");
		await input.find('button[aria-label="common.ui.input_number.decrease"]').trigger("click");

		// 0 is a valid count, not an empty field
		expect(component.emitted("update:building:amount")).toEqual([
			[2, 0],
			[2, 0],
		]);
	});

	it("emits a new amount without writing into the result (S9)", async () => {
		const buildingData = building({ amount: 2 });
		const { wrapper, component } = await mountBuilding({ buildingData });

		wrapper.findComponent(PInputNumber).vm.$emit("update:value", 5);

		expect(component.emitted("update:building:amount")).toEqual([[2, 5]]);
		expect(buildingData.amount).toBe(2);
	});

	it("emits deleting the building", async () => {
		const { wrapper, component } = await mountBuilding();

		await deleteButton(wrapper).trigger("click");

		expect(component.emitted("delete:building")).toEqual([[2]]);
	});

	it("read-only: disables the amount and hides the buttons", async () => {
		const { wrapper } = await mountBuilding({ disabled: true });

		expect(
			wrapper.findComponent(PInputNumber).find("input").element.disabled
		).toBe(true);
		expect(deleteButton(wrapper).exists()).toBe(false);
		expect(addRecipe(wrapper).exists()).toBe(false);
		expect(recipes(wrapper).map((r) => r.props("disabled"))).toEqual([
			true,
			true,
		]);
	});

	it("hands each recipe row its ȼ per building and day and the building count", async () => {
		const { wrapper } = await mountBuilding({
			buildingData: building({
				recipeOptions: [
					{ recipe_id: "SME#FE", dailyRevenue: 400 } as IRecipeBuildingOption,
				],
			}),
		});

		// SME#AL has no option, so no figure
		expect(
			recipes(wrapper).map((r) => [
				r.props("optionDaily"),
				r.props("buildingAmount"),
			])
		).toEqual([
			[400, 3],
			[0, 3],
		]);
	});

	it("renders a recipe row per active recipe", async () => {
		const { wrapper } = await mountBuilding();

		expect(
			recipes(wrapper).map((r) => [
				r.props("recipeIndex"),
				r.props("recipeData").recipeId,
			])
		).toEqual([
			[0, "SME#FE"],
			[1, "SME#AL"],
		]);
		// every second row is striped, so long orders stay readable
		expect(recipes(wrapper).map((r) => r.props("striped"))).toEqual([
			false,
			true,
		]);
		expect(recipes(wrapper).at(1)!.props()).toMatchObject({
			disabled: false,
			pickerOpen: false,
			cxUuid: "cx-uuid",
			planetId: "ZV-307c",
		});
		expect(wrapper.text()).not.toContain(
			"plan.components.production_building.no_recipe"
		);
	});

	it("adds the building index to the recipe events", async () => {
		const { wrapper, component } = await mountBuilding();
		const second = recipes(wrapper).at(1)!;

		second.vm.$emit("update:building:recipe:amount", 1, 5);
		second.vm.$emit("delete:building:recipe", 1);

		expect(component.emitted("update:building:recipe:amount")).toEqual([
			[2, 1, 5],
		]);
		expect(component.emitted("delete:building:recipe")).toEqual([[2, 1]]);
	});

	it("shows a hint without active recipes", async () => {
		const { wrapper } = await mountBuilding({
			buildingData: building({ activeRecipes: [] }),
		});

		expect(recipes(wrapper)).toHaveLength(0);
		expect(wrapper.text()).toContain(
			"plan.components.production_building.no_recipe"
		);
	});

	describe("fold", () => {
		it("toggles from the name, folded hides the recipes and shows the outputs", async () => {
			const { wrapper, component, setProps } = await mountBuilding();
			const tiles = () =>
				wrapper
					.findAllComponents(MaterialTile)
					.map((t) => t.props("ticker"));

			expect(nameButton(wrapper).attributes("aria-expanded")).toBe("true");
			expect(wrapper.find("[data-recipes]").exists()).toBe(true);
			expect(tiles()).toEqual([]);

			await nameButton(wrapper).trigger("click");
			expect(component.emitted("toggle:fold")).toEqual([[]]);

			await setProps({ folded: true });
			expect(nameButton(wrapper).attributes("aria-expanded")).toBe("false");
			expect(wrapper.find("[data-recipes]").exists()).toBe(false);
			expect(recipes(wrapper)).toHaveLength(0);
			expect(tiles()).toEqual(["FE", "AL"]);
		});
	});

	describe("recipe picker", () => {
		it("gives the focus back to what opened it", async () => {
			const { wrapper, setProps } = await mountBuilding(
				{ picker: 1 },
				undefined,
				true
			);

			await setProps({ picker: undefined });
			await flushPromises();
			expect(document.activeElement).toBe(
				wrapper.findAll("[data-recipe-button]")[1].element
			);

			await setProps({ picker: null });
			await setProps({ picker: undefined });
			await flushPromises();
			expect(document.activeElement).toBe(
				wrapper.find("[data-add-recipe]").element
			);
			wrapper.unmount();
		});

		it("leaves the focus where it moved meanwhile, e.g. another picker", async () => {
			const elsewhere = document.createElement("input");
			document.body.appendChild(elsewhere);
			const { wrapper, setProps } = await mountBuilding(
				{ picker: 0 },
				undefined,
				true
			);

			elsewhere.focus();
			await setProps({ picker: undefined });
			await flushPromises();

			expect(document.activeElement).toBe(elsewhere);
			wrapper.unmount();
			elsewhere.remove();
		});

		it("is closed without a picker", async () => {
			const { wrapper } = await mountBuilding();

			expect(pickers(wrapper)).toHaveLength(0);
			expect(addRecipe(wrapper).attributes("aria-expanded")).toBe("false");
		});

		it("change: opens under its order and emits the replacement", async () => {
			const { wrapper, component } = await mountBuilding({
				picker: 1,
				materialIO: [],
				buildings: [building()],
			});

			expect(layout(wrapper)).toEqual(["recipe", "recipe", "picker", "add"]);
			expect(pickers(wrapper)).toHaveLength(1);
			expect(pickers(wrapper).at(0)!.props()).toMatchObject({
				mode: "change",
				recipeIndex: 1,
				planetId: "ZV-307c",
			});
			expect(recipes(wrapper).map((r) => r.props("pickerOpen"))).toEqual([
				false,
				true,
			]);

			pickers(wrapper).at(0)!.vm.$emit("pick", "SME#CU");
			pickers(wrapper).at(0)!.vm.$emit("close");

			expect(component.emitted("update:building:recipe")).toEqual([
				[2, 1, "SME#CU"],
			]);
			expect(component.emitted("pick:building:recipe")).toBeUndefined();
			expect(component.emitted("close:picker")).toEqual([[]]);
		});

		it("add: opens under + Recipe and emits the new order", async () => {
			const { wrapper, component } = await mountBuilding({ picker: null });

			expect(layout(wrapper)).toEqual(["recipe", "recipe", "add", "picker"]);
			expect(pickers(wrapper).at(0)!.props("mode")).toBe("add");
			expect(addRecipe(wrapper).attributes("aria-expanded")).toBe("true");

			pickers(wrapper).at(0)!.vm.$emit("pick", "SME#CU");

			expect(component.emitted("pick:building:recipe")).toEqual([
				[2, "SME#CU"],
			]);
			expect(component.emitted("update:building:recipe")).toBeUndefined();
		});

		it("a recipe click opens its picker, or closes it when open", async () => {
			const { wrapper, component, setProps } = await mountBuilding();

			recipes(wrapper).at(0)!.vm.$emit("open:picker", 0);
			expect(component.emitted("open:picker")).toEqual([[0]]);

			await setProps({ picker: 0 });
			recipes(wrapper).at(0)!.vm.$emit("open:picker", 0);
			recipes(wrapper).at(1)!.vm.$emit("open:picker", 1);
			expect(component.emitted("close:picker")).toEqual([[]]);
			expect(component.emitted("open:picker")).toEqual([[0], [1]]);
		});

		it("+ Recipe toggles the add picker", async () => {
			const { wrapper, component, setProps } = await mountBuilding();

			await addRecipe(wrapper).trigger("click");
			expect(component.emitted("open:picker")).toEqual([[null]]);

			await setProps({ picker: null });
			await addRecipe(wrapper).trigger("click");
			expect(component.emitted("close:picker")).toEqual([[]]);
		});

		it("offers + Recipe only with recipe options", async () => {
			const { wrapper } = await mountBuilding({
				buildingData: building({ recipeOptions: [] }),
			});

			expect(addRecipe(wrapper).exists()).toBe(false);
		});
	});

	describe("status line", () => {
		it("shows under the picked order, Undo emits undo", async () => {
			const { wrapper, component, setProps } = await mountBuilding({
				status: { recipe: 1, text: "Replaced FE with AL." },
			});
			const status = () => wrapper.find("[role=status]");

			expect(layout(wrapper)).toEqual(["recipe", "recipe", "status", "add"]);
			expect(status().text()).toContain("Replaced FE with AL.");

			const undo = status()
				.findAll("button")
				.find((b) => b.text() === "plan.history.undo")!;
			await undo.trigger("click");
			expect(component.emitted("undo")).toEqual([[]]);

			await setProps({ status: undefined });
			expect(status().exists()).toBe(false);
		});
	});

	describe("typical mix hint", () => {
		const MIX_LABEL = "plan.components.production_building.mix_add_label";
		const options = [
			{ recipe_id: "SME#FE", outputs: [{ material_ticker: "FE" }] },
			{ recipe_id: "SME#AL", outputs: [{ material_ticker: "AL" }] },
		] as IRecipeBuildingOption[];
		const empty = () =>
			building({ activeRecipes: [], recipeOptions: options });
		const mixButton = (wrapper: VueWrapper) =>
			wrapper.find(`button[aria-label="${MIX_LABEL}"]`);

		beforeEach(() => {
			typical.value = {
				percentage: 50,
				recipes: [
					{ recipeid: "SME#FE", amount: 3 },
					{ recipeid: "SME#AL", amount: 1 },
					// not a recipe this building can run here
					{ recipeid: "SME#XX", amount: 2 },
				],
			};
		});

		it("adds the mix recipes a building without recipes can run", async () => {
			const { wrapper, component } = await mountBuilding({
				buildingData: empty(),
			});

			expect(wrapper.text()).toContain(
				"plan.components.production_building.mix_hint"
			);
			expect(mixButton(wrapper).text()).toContain("50 %");
			expect(
				wrapper
					.findAllComponents(MaterialTile)
					.map((t) => t.props("ticker"))
			).toEqual(["FE", "AL"]);

			await mixButton(wrapper).trigger("click");
			expect(component.emitted("add:building:recipes")).toEqual([
				[
					2,
					[
						{ recipeid: "SME#FE", amount: 3 },
						{ recipeid: "SME#AL", amount: 1 },
					],
				],
			]);
		});

		it("is not shown with recipes, read-only, or without a typical mix", async () => {
			const withRecipes = await mountBuilding();
			expect(mixButton(withRecipes.wrapper).exists()).toBe(false);

			const readOnly = await mountBuilding({
				buildingData: empty(),
				disabled: true,
			});
			expect(mixButton(readOnly.wrapper).exists()).toBe(false);

			typical.value = {
				percentage: 10,
				recipes: [{ recipeid: "SME#XX", amount: 1 }],
			};
			const unknown = await mountBuilding({ buildingData: empty() });
			expect(mixButton(unknown.wrapper).exists()).toBe(false);

			typical.value = undefined;
			const none = await mountBuilding({ buildingData: empty() });
			expect(mixButton(none.wrapper).exists()).toBe(false);
			expect(none.wrapper.text()).toContain(
				"plan.components.production_building.no_recipe"
			);
		});
	});

	it("lists the efficiency factors in a tooltip", async () => {
		const { wrapper } = await mountBuilding();

		await wrapper
			.findComponent(PTooltip)
			.find("div")
			.trigger("mouseenter");

		const tip = document.body.querySelector("[role=tooltip]")!.textContent;
		expect(tip).toContain("game.efficiency_type.COGC");
		expect(tip).toContain("125.00 %");
		expect(tip).toContain("game.efficiency_type.EXPERT");
		expect(tip).toContain("107.00 %");
	});

	describe("zero efficiency", () => {
		const REASON = "plan.components.production_building.zero_reason";
		const zero = (type: "FERTILITY" | "WORKFORCE" | "EXPERT") =>
			building({
				totalEfficiency: 0,
				efficiencyElements: [
					{ efficiencyType: "COGC", value: 1.25 },
					{ efficiencyType: type, value: 0 },
				],
			});

		it("names fertility and workforce with a hint of their own", async () => {
			const { wrapper, setProps } = await mountBuilding({
				buildingData: zero("FERTILITY"),
			});
			expect(wrapper.text()).toContain(`${REASON}.FERTILITY`);

			await setProps({ buildingData: zero("WORKFORCE") });
			expect(wrapper.text()).toContain(`${REASON}.WORKFORCE`);
		});

		it("names any other factor by its game efficiency type", async () => {
			const { wrapper } = await mountBuilding({
				buildingData: zero("EXPERT"),
			});

			// in the sub line, before what lifts the efficiency
			expect(
				wrapper.find("[data-building-row] span.text-negative").text()
			).toBe("game.efficiency_type.EXPERT ·");
			expect(wrapper.text()).not.toContain(REASON);
		});

		it("names no reason without a zero factor or with an efficiency", async () => {
			const { wrapper, setProps } = await mountBuilding({
				buildingData: building({ totalEfficiency: 0 }),
			});
			expect(wrapper.find(".text-negative.text-xs").exists()).toBe(false);

			await setProps({
				buildingData: { ...zero("FERTILITY"), totalEfficiency: 1 },
			});
			expect(wrapper.text()).not.toContain(REASON);
		});
	});

	describe("against the shared plan", () => {
		const badges = (wrapper: VueWrapper) =>
			nameButton(wrapper)
				.findAll("span.uppercase")
				.map((s) => [s.text(), s.classes()]);

		it("badges what changed", async () => {
			const { wrapper } = await mountBuilding({
				change: { kinds: ["added", "amount"], newRecipes: [] },
			});

			const found = badges(wrapper);
			expect(found.map(([text]) => text)).toEqual([
				"sharing.compare.added",
				"sharing.compare.amount",
			]);
			expect(found[0][1]).toContain("text-positive");
			expect(found[1][1]).toContain("text-warning");
		});

		it("marks the recipes the shared plan didn't have as new", async () => {
			const { wrapper } = await mountBuilding({
				change: { kinds: ["recipe"], newRecipes: ["SME#AL"] },
			});

			expect(recipes(wrapper).map((r) => r.props("isNew"))).toEqual([
				false,
				true,
			]);
			expect(badges(wrapper).map(([text]) => text)).toEqual([
				"sharing.compare.recipe",
			]);
		});

		it("shows no badge without a change", async () => {
			const { wrapper } = await mountBuilding();

			expect(badges(wrapper)).toEqual([]);
			expect(recipes(wrapper).some((r) => r.props("isNew"))).toBe(false);
		});
	});
});
