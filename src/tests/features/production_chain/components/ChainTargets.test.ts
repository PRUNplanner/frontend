import { describe, it, expect, beforeAll } from "vitest";

import ChainTargets from "@/features/production_chain/components/ChainTargets.vue";
import { PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { seedGameData } from "@/tests/features/production_chain/chain.fixtures";

import type { IChainTarget } from "@/features/production_chain/engine/chainSolver.types";

const options = [
	{ label: "DW · Drinking Water", value: "DW" },
	{ label: "RAT · Rations", value: "RAT" },
];

async function mountTargets(targets: IChainTarget[]) {
	const updates: IChainTarget[][] = [];
	const { wrapper } = await mountComponent(ChainTargets, {
		targets,
		options,
		"onUpdate:targets": (v: IChainTarget[]) => updates.push(v),
	});
	return { wrapper, updates };
}

const button = (
	wrapper: Awaited<ReturnType<typeof mountTargets>>["wrapper"],
	label: string
) => wrapper.find(`button[aria-label="production_chains.targets.${label}"]`);

describe("ChainTargets", () => {
	beforeAll(seedGameData);

	it("adds a material at 10 a day, offering only the ones not in the chain", async () => {
		const { wrapper, updates } = await mountTargets([
			{ ticker: "DW", perDay: 100 },
		]);
		const select = wrapper.findComponent(PSelect);
		expect(select.props("options")).toEqual([options[1]]);
		select.vm.$emit("update:value", "RAT");
		expect(updates.at(-1)).toEqual([
			{ ticker: "DW", perDay: 100 },
			{ ticker: "RAT", perDay: 10 },
		]);
	});

	it("steps by 1, 5 or 10 by size, and removes", async () => {
		const { wrapper, updates } = await mountTargets([
			{ ticker: "DW", perDay: 100 },
		]);
		await button(wrapper, "more").trigger("click");
		expect(updates.at(-1)![0].perDay).toBe(110);
		await button(wrapper, "less").trigger("click");
		expect(updates.at(-1)![0].perDay).toBe(95);

		const small = await mountTargets([{ ticker: "DW", perDay: 3 }]);
		await button(small.wrapper, "less").trigger("click");
		expect(small.updates.at(-1)![0].perDay).toBe(2);
		await button(small.wrapper, "remove").trigger("click");
		expect(small.updates.at(-1)).toEqual([]);
	});

	it("ignores an empty or zero amount", async () => {
		const { wrapper, updates } = await mountTargets([
			{ ticker: "DW", perDay: 100 },
		]);
		const input = wrapper.find("input");
		await input.setValue("");
		await input.setValue("0");
		expect(updates).toEqual([]);
		await input.setValue("25");
		expect(updates.at(-1)![0].perDay).toBe(25);
	});

	it("names the empty state's add field", async () => {
		const { wrapper } = await mountTargets([]);
		expect(wrapper.findComponent(PSelect).props("placeholder")).toBe(
			"production_chains.targets.add_first"
		);
	});
});
