import { describe, it, expect } from "vitest";

import ChainResults from "@/features/production_chain/components/ChainResults.vue";
import { mountComponent } from "@/tests/mountComponent";
import messages from "@/locales/en_US/production_chains.json";

import type { IChainTotals } from "@/features/production_chain/engine/chainSolver.types";

const totals = (over: Partial<IChainTotals> = {}): IChainTotals => ({
	targetsValue: 1000,
	byproductsValue: 0,
	outputValue: 1000,
	bought: 200,
	boughtCount: 1,
	own: 0,
	ownCount: 0,
	upkeep: 100,
	wear: 50,
	profit: 650,
	built: 3,
	exact: 2.5,
	area: 100,
	habArea: 20,
	workforce: {
		pioneer: 100,
		settler: 0,
		technician: 0,
		engineer: 0,
		scientist: 0,
	},
	expertise: {},
	construction: 6500,
	constructionMaterials: [],
	habs: [],
	payback: 10,
	...over,
});

const text = async (
	t: IChainTotals,
	key: string,
	baseline: IChainTotals | null = null
) => {
	const { wrapper } = await mountComponent(
		ChainResults,
		{ totals: t, baseline },
		{ messages: { production_chains: messages } }
	);
	return wrapper.find(`[data-testid='chain-result-${key}']`);
};

describe("ChainResults", () => {
	it("shows profit with its share, payback and workforce by tier", async () => {
		const profit = await text(totals(), "profit");
		expect(profit.text()).toContain("650 ȼ");
		expect(profit.text()).toContain("65 % of output value");
		expect(profit.find(".text-positive").exists()).toBe(true);
		expect((await text(totals(), "construction")).text()).toContain(
			"pays back in 10 days"
		);
		expect((await text(totals(), "workforce")).text()).toContain("P 100");
		expect((await text(totals(), "bought")).text()).toContain("1 material");
	});

	it("shows a loss, no payback, byproducts and an empty output", async () => {
		const loss = totals({
			profit: -50,
			outputValue: 0,
			byproductsValue: 300,
			payback: null,
			boughtCount: 2,
		});
		const profit = await text(loss, "profit");
		expect(profit.find(".text-negative").exists()).toBe(true);
		expect(profit.text()).toContain("0.0 % of output value");
		expect((await text(loss, "construction")).text()).toContain(
			"no payback"
		);
		expect((await text(loss, "output")).text()).toContain(
			"incl. 300 ȼ byproducts"
		);
		expect((await text(loss, "bought")).text()).toContain("2 materials");
	});

	it("shows own production and the saving against the chain without it (AC 6)", async () => {
		const had = totals({
			own: 300,
			ownCount: 2,
			built: 2,
			construction: 4000,
		});
		const without = totals({ built: 5, construction: 9000 });
		const inputs = await text(had, "bought", without);
		expect(inputs.text()).toContain("Inputs / day");
		expect(inputs.text()).toContain("500 ȼ");
		expect(inputs.text()).toContain("300 ȼ own · 200 ȼ bought");
		expect((await text(had, "profit", without)).text()).toContain(
			"own production at CX price"
		);
		expect((await text(had, "buildings", without)).text()).toContain(
			"3 fewer without own production"
		);
		expect((await text(had, "construction", without)).text()).toContain(
			"5,000 ȼ less · pays back in 10 days"
		);
	});
});
