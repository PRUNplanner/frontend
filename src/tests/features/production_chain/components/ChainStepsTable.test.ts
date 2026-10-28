import { describe, it, expect, beforeAll } from "vitest";
import { DOMWrapper, flushPromises } from "@vue/test-utils";

import ChainStepsTable from "@/features/production_chain/components/ChainStepsTable.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	solveChain,
	recipeEffects,
} from "@/features/production_chain/engine/chainSolver";
import {
	FOOD_PLANET,
	chainInput,
	seedGameData,
	splitInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";
import { PSelect } from "@/ui";

import type {
	IChainInput,
	IChainResult,
} from "@/features/production_chain/engine/chainSolver.types";

const ctx = testContext();

async function mountTable(
	input: IChainInput,
	props: Record<string, unknown> = {},
	attach = false
) {
	const result: IChainResult = solveChain(input, ctx);
	const { wrapper, component } = await mountComponent(
		ChainStepsTable,
		{
			result,
			order: "chain",
			filter: null,
			byproductMode: input.byproducts,
			extraction: ctx.extraction,
			recipeOptions: (t: string) => recipeEffects(input, ctx, t, result),
			bases: [{ id: "A", name: "", planetId: null, cogc: "auto" }],
			...props,
		},
		{ attach }
	);
	return { wrapper, component, result };
}

const rowTickers = (wrapper: Awaited<ReturnType<typeof mountTable>>["wrapper"]) =>
	wrapper
		.findAll("tr[data-testid^='chain-row-']")
		.map((r) => r.attributes("data-testid")!.slice("chain-row-".length));

describe("ChainStepsTable", () => {
	beforeAll(seedGameData);

	it("lists the chain depth-first from each target, each material once", async () => {
		const { wrapper, result } = await mountTable(
			chainInput([
				["DW", 100],
				["RAT", 100],
			])
		);
		const tickers = rowTickers(wrapper);
		expect(tickers[0]).toBe("DW");
		expect(new Set(tickers).size).toBe(tickers.length);
		expect(tickers.sort()).toEqual([...result.order].sort());
	});

	it("collapses a branch and opens row details", async () => {
		const { wrapper } = await mountTable(chainInput([["RAT", 100]]));
		const before = rowTickers(wrapper).length;
		await wrapper
			.find("button[aria-label='production_chains.table.collapse']")
			.trigger("click");
		expect(rowTickers(wrapper)).toEqual(["RAT"]);
		await wrapper
			.find("button[aria-label='production_chains.table.expand']")
			.trigger("click");
		expect(rowTickers(wrapper).length).toBe(before);

		const name = wrapper.find("tr[data-testid='chain-row-RAT'] button[aria-expanded]:not([aria-label])");
		await name.trigger("click");
		expect(name.attributes("aria-expanded")).toBe("true");
		expect(wrapper.find("[data-testid='chain-step-detail']").exists()).toBe(true);
	});

	it("groups by source", async () => {
		const { wrapper, result } = await mountTable(chainInput([["RAT", 100]]), {
			order: "source",
		});
		const tickers = rowTickers(wrapper);
		const sources = tickers.map((t) => result.rows[t].source);
		expect(sources).toEqual([...sources].sort((a, b) =>
			["make", "extract", "buy"].indexOf(a) - ["make", "extract", "buy"].indexOf(b)
		));
	});

	it("filters the cheaper rows and buys exactly those (AC 11)", async () => {
		const { wrapper, component, result } = await mountTable(chainInput([["GWS", 1]]), {
			filter: "cheaper",
		});
		expect(result.warnings.cheaper.length).toBeGreaterThan(0);
		expect(rowTickers(wrapper).sort()).toEqual([...result.warnings.cheaper].sort());
		expect(wrapper.find("[data-testid='chain-filter-banner']").exists()).toBe(true);
		const buyAll = wrapper
			.findAll("[data-testid='chain-filter-banner'] button")
			.find((b) => b.text().startsWith("production_chains.filter.buy_all"))!;
		await buyAll.trigger("click");
		expect(component.emitted("buyAll")![0][0]).toEqual(result.warnings.cheaper);
		// no byproducts group while filtered
		expect(wrapper.find("[data-testid^='chain-byproduct-']").exists()).toBe(false);
	});

	it("shows byproducts with produced, used and sold (AC 8)", async () => {
		const { wrapper } = await mountTable(
			chainInput([
				["NA", 100],
				["CL", 100],
			])
		);
		const na = wrapper.find("[data-testid='chain-byproduct-NA']");
		expect(na.exists()).toBe(true);
		expect(na.text()).toContain("production_chains.table.byproduct_used");
		expect(na.text()).toContain("production_chains.table.byproduct_sold");
	});

	it("emits a source change", async () => {
		const { wrapper, component } = await mountTable(chainInput([["DW", 100]]));
		const extract = wrapper
			.findAll("tr[data-testid='chain-row-H2O'] [role=group] button")
			.find((b) => b.text() === "production_chains.table.extract")!;
		await extract.trigger("click");
		expect(component.emitted("source")![0]).toEqual(["H2O", "extract"]);
		// a target can't be bought
		const buy = wrapper
			.findAll("tr[data-testid='chain-row-DW'] [role=group] button")
			.find((b) => b.text() === "production_chains.table.buy")!;
		expect(buy.attributes("disabled")).toBeDefined();
	});

	it("opens the recipe picker and picks a recipe (AC 10)", async () => {
		const { wrapper, component } = await mountTable(chainInput([["RAT", 100]]));
		await wrapper
			.find("button[aria-label='production_chains.table.choose_recipe']")
			.trigger("click");
		await flushPromises();
		const body = new DOMWrapper(document.body);
		const options = body.findAll("[data-testid='chain-recipe-option']");
		expect(options.length).toBe(ctx.recipesByOutput.get("RAT")!.length);
		expect(options[0].attributes("aria-current")).toBe("true");
		await options[1].trigger("click");
		const [ticker, id] = component.emitted("recipe")![0] as [string, string];
		expect(ticker).toBe("RAT");
		expect(ctx.recipesByOutput.get("RAT")!.some((r) => r.recipe_id === id)).toBe(true);
	});

	it("moves the keyboard into the recipe picker and back (AC 19)", async () => {
		const { wrapper } = await mountTable(chainInput([["RAT", 100]]), {}, true);
		const trigger = wrapper.find(
			"button[aria-label='production_chains.table.choose_recipe']"
		);
		await trigger.trigger("click");
		await flushPromises();
		const options = new DOMWrapper(document.body).findAll(
			"[data-testid='chain-recipe-option']"
		);
		expect(document.activeElement).toBe(options[0].element);
		await options[0].trigger("keydown", { key: "ArrowDown" });
		expect(document.activeElement).toBe(options[1].element);
		await options[1].trigger("keydown", { key: "End" });
		expect(document.activeElement).toBe(options.at(-1)!.element);
		await options.at(-1)!.trigger("keydown", { key: "ArrowUp" });
		expect(document.activeElement).toBe(options.at(-2)!.element);
		await options.at(-2)!.trigger("keydown", { key: "Home" });
		expect(document.activeElement).toBe(options[0].element);
		await options[0].trigger("keydown", { key: "a" });
		expect(document.activeElement).toBe(options[0].element);
		await options.at(-1)!.trigger("click");
		await flushPromises();
		expect(document.activeElement).toBe(trigger.element);
	});
});

describe("ChainStepsTable supply cells", () => {
	beforeAll(seedGameData);

	it("shows the extraction site or that planets are loading", async () => {
		const { wrapper, component } = await mountTable(
			chainInput([["DW", 100]], { rawSource: "extract" })
		);
		const planet = wrapper.find("button[aria-label='production_chains.table.choose_planet']");
		expect(planet.text()).toContain("production_chains.table.typical_planet");
		await planet.trigger("click");
		expect(component.emitted("planet")![0]).toEqual(["H2O"]);

		const result = solveChain(chainInput([["DW", 100]], { rawSource: "extract" }), testContext(false));
		const pending = await mountComponent(ChainStepsTable, {
			result,
			order: "source",
			filter: null,
			byproductMode: "sell",
			extraction: undefined,
			recipeOptions: () => [],
			bases: [{ id: "A", name: "", planetId: null, cogc: "auto" }],
		});
		expect(pending.wrapper.text()).toContain("production_chains.table.pending");
		expect(pending.wrapper.text()).toContain("production_chains.table.group_extract");
	});

	it("names a picked planet and the thin filter", async () => {
		const ctx2 = testContext();
		const site = ctx2.extraction!.get("H2O")!.sites[0];
		const { wrapper } = await mountTable(
			chainInput([["GWS", 1]], {
				source: { H2O: "extract" },
				planetId: { H2O: site.planetId },
			}),
			{ filter: "thin" }
		);
		expect(wrapper.find("[data-testid='chain-filter-banner']").text()).toContain(
			"production_chains.filter.thin"
		);
		const all = await mountTable(
			chainInput([["DW", 100]], {
				source: { H2O: "extract" },
				planetId: { H2O: site.planetId },
			})
		);
		expect(all.wrapper.text()).toContain(site.planetName);
	});
});

describe("ChainStepsTable bases", () => {
	beforeAll(seedGameData);

	it("moves a step to a base or a new one, not bought rows (AC 2)", async () => {
		const input = splitInput([FOOD_PLANET, null]);
		const { wrapper, component, result } = await mountTable(input, {
			bases: input.bases,
		});
		const select = wrapper
			.findAllComponents(PSelect)
			.find((s) => s.attributes("data-testid") === "chain-base-DW")!;
		expect(select.props("value")).toBe(result.rows.DW.base);
		expect(
			(select.props("options") as { value: string }[]).map((o) => o.value)
		).toEqual(["A", "B", "new"]);
		select.vm.$emit("update:value", "new");
		expect(component.emitted("base")).toEqual([["DW", "new"]]);
		// bought rows have no base
		const h2o = wrapper.find("[data-testid='chain-row-H2O']");
		expect(h2o.find("[data-testid='chain-base-H2O']").exists()).toBe(false);
	});

	it("marks farms without fertility (AC 3)", async () => {
		const input = splitInput([FOOD_PLANET, null]);
		const { wrapper } = await mountTable(input, { bases: input.bases });
		expect(
			wrapper.find("[data-testid='chain-no-farming-GRN']").exists()
		).toBe(true);
	});
});

describe("ChainStepsTable with own production", () => {
	beforeAll(seedGameData);

	const supplier = (name: string, perDay: number, surplus: number) => ({
		key: `uuid-${name}`,
		plan: { uuid: `uuid-${name}`, name, planetId: "XH-668c" },
		perDay,
		surplus,
	});
	const cell = (
		wrapper: Awaited<ReturnType<typeof mountTable>>["wrapper"],
		ticker: string
	) => wrapper.find(`tr[data-testid='chain-row-${ticker}']`);
	const segment = (
		wrapper: Awaited<ReturnType<typeof mountTable>>["wrapper"],
		ticker: string,
		label: string
	) =>
		cell(wrapper, ticker)
			.findAll("[role=group] button")
			.find((b) => b.text() === label)!;

	it("offers Have, never on a target (AC 4)", async () => {
		const { wrapper, component } = await mountTable(chainInput([["RAT", 100]]));
		expect(
			segment(wrapper, "RAT", "production_chains.have.option").attributes("disabled")
		).toBeDefined();
		expect(
			cell(wrapper, "RAT").find("[title='production_chains.have.target_reason']").exists()
		).toBe(true);
		await segment(wrapper, "GRN", "production_chains.have.option").trigger("click");
		expect(component.emitted("have")![0]).toEqual(["GRN", "all"]);
	});

	it("shows a Have row with its suppliers, and leaves it for Make (AC 8, 9)", async () => {
		const input = chainInput([["RAT", 100]], { have: { GRN: 12 } });
		const used = solveChain(input, ctx).rows.GRN.have;
		const { wrapper, component } = await mountTable(input, {
			own: {
				name: "Main",
				surplus: new Map([["GRN", 12]]),
				suppliers: {
					GRN: [supplier("Alpha", 4, 4), supplier("Zeta", used - 4, 8)],
				},
				overrides: {},
			},
		});
		const row = cell(wrapper, "GRN");
		expect(row.find("[data-testid='chain-have-GRN']").exists()).toBe(true);
		expect(row.text()).toContain("production_chains.have.from_plans");
		expect(row.text()).toContain("Alpha 4.00");
		expect(row.text()).toContain("Zeta");
		expect(
			segment(wrapper, "GRN", "production_chains.have.option").attributes(
				"aria-pressed"
			)
		).toBe("true");
		await segment(wrapper, "GRN", "production_chains.table.make").trigger("click");
		expect(component.emitted("source")![0]).toEqual(["GRN", "make"]);
		expect(component.emitted("have")![0]).toEqual(["GRN", "off"]);
	});

	it("shows the rest of a partly had row and its source (AC 2)", async () => {
		const { wrapper, component } = await mountTable(
			chainInput([["RAT", 100]], { have: { LST: 0.5 } })
		);
		const row = cell(wrapper, "LST");
		expect(row.text()).toContain("production_chains.have.plus_from_plans");
		expect(row.text()).toContain("production_chains.table.bought_on");
		const rest = row.findComponent(PSelect);
		expect(rest.props("value")).toBe("buy");
		rest.vm.$emit("update:value", "extract");
		expect(component.emitted("source")![0]).toEqual(["LST", "extract"]);
	});

	it("applies a typed amount on blur or Enter, empty for all, and goes back to the empire (AC 9)", async () => {
		const { wrapper, component } = await mountTable(
			chainInput([["RAT", 100]], { have: { GRN: 4 } }),
			{
				own: {
					name: "Main",
					surplus: new Map([["GRN", 9]]),
					suppliers: {},
					overrides: { GRN: { value: 4, origin: "typed" } },
				},
			}
		);
		const field = cell(wrapper, "GRN").find("input");
		expect((field.element as HTMLInputElement).value).toBe("4");
		await field.setValue("3");
		expect(component.emitted("have")).toBeUndefined();
		await field.trigger("focusout");
		expect(component.emitted("have")![0]).toEqual(["GRN", 3]);
		await field.setValue("");
		await field.trigger("keydown", { key: "Enter" });
		expect(component.emitted("have")![1]).toEqual(["GRN", "all"]);
		const back = cell(wrapper, "GRN")
			.findAll("button")
			.find((b) => b.text() === "production_chains.have.use_empire")!;
		await back.trigger("click");
		expect(component.emitted("have")![2]).toEqual(["GRN", undefined]);
	});

	it("goes back to the empire's surplus, and links it while a typed amount differs from it", async () => {
		const own = (value: number) => ({
			name: "Main",
			surplus: new Map([["GRN", 3]]),
			suppliers: {},
			overrides: { GRN: { value, origin: "typed" as const } },
		});
		const back = (w: Awaited<ReturnType<typeof mountTable>>["wrapper"]) =>
			cell(w, "GRN")
				.findAll("button")
				.some((b) => b.text() === "production_chains.have.use_empire");
		// typed what the empire has: nothing to go back to
		const same = await mountTable(
			chainInput([["RAT", 100]], { have: { GRN: 3 } }),
			{ own: own(3) }
		);
		expect(back(same.wrapper)).toBe(false);
		const more = await mountTable(
			chainInput([["RAT", 100]], { have: { GRN: 5 } }),
			{ own: own(5) }
		);
		expect(back(more.wrapper)).toBe(true);
		const less = await mountTable(
			chainInput([["RAT", 100]], { have: { GRN: 2 } }),
			{ own: own(2) }
		);
		expect(back(less.wrapper)).toBe(true);
		// switched off, Have goes back to the surplus rather than all
		const off = await mountTable(chainInput([["RAT", 100]]), {
			own: { ...own(2), overrides: { GRN: { value: "off", origin: "typed" } } },
		});
		await segment(off.wrapper, "GRN", "production_chains.have.option").trigger("click");
		expect(off.component.emitted("have")![0]).toEqual(["GRN", undefined]);
	});

	it("groups Have rows by source", async () => {
		const { wrapper } = await mountTable(
			chainInput([["RAT", 100]], { have: { GRN: "all" } }),
			{ order: "source" }
		);
		expect(wrapper.text()).toContain("production_chains.table.group_have");
	});
});
