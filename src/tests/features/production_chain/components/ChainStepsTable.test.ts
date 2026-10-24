import { describe, it, expect, beforeAll } from "vitest";
import { DOMWrapper, flushPromises } from "@vue/test-utils";

import ChainStepsTable from "@/features/production_chain/components/ChainStepsTable.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	solveChain,
	recipeEffects,
} from "@/features/production_chain/engine/chainSolver";
import {
	chainInput,
	seedGameData,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

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
	const { wrapper, component } = await mountComponent(ChainStepsTable, {
		result,
		order: "chain",
		filter: null,
		byproductMode: input.byproducts,
		extraction: ctx.extraction,
		recipeOptions: (t: string) => recipeEffects(input, ctx, t, result),
		...props,
	}, { attach });
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
		await options.at(-1)!.trigger("click");
		await flushPromises();
		expect(document.activeElement).toBe(trigger.element);
	});
});
