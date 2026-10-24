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
	upkeep: 100,
	wear: 50,
	profit: 650,
	built: 3,
	exact: 2.5,
	area: 100,
	habArea: 20,
	workforce: { pioneer: 100, settler: 0, technician: 0, engineer: 0, scientist: 0 },
	expertise: {},
	construction: 6500,
	constructionMaterials: [],
	habs: [],
	payback: 10,
	...over,
});

const text = async (t: IChainTotals, key: string) => {
	const { wrapper } = await mountComponent(
		ChainResults,
		{ totals: t },
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
		expect((await text(loss, "construction")).text()).toContain("no payback");
		expect((await text(loss, "output")).text()).toContain("incl. 300 ȼ byproducts");
		expect((await text(loss, "bought")).text()).toContain("2 materials");
	});
});
