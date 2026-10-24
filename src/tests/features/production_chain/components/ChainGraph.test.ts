import { describe, it, expect, beforeAll } from "vitest";

import ChainGraph from "@/features/production_chain/components/ChainGraph.vue";
import { mountComponent } from "@/tests/mountComponent";
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import { layoutChain } from "@/features/production_chain/engine/chainLayout";
import {
	chainInput,
	seedGameData,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

describe("ChainGraph", () => {
	beforeAll(seedGameData);
	const ctx = testContext();
	const result = solveChain(
		chainInput([
			["DW", 100],
			["RAT", 100],
		]),
		ctx
	);

	const widths = (wrapper: Awaited<ReturnType<typeof mountComponent>>["wrapper"]) =>
		wrapper.findAll("path").map((p) => Number(p.attributes("stroke-width")));

	it("draws a node per material and an edge per link", async () => {
		const { wrapper } = await mountComponent(ChainGraph, {
			result,
			lines: "t",
			focus: null,
		});
		expect(wrapper.findAll("[data-testid^='chain-node-']").length).toBe(
			result.order.length
		);
		expect(wrapper.findAll("path").length).toBe(result.links.length);
	});

	it("sizes lines by the chosen measure (AC 14)", async () => {
		const { wrapper, setProps } = await mountComponent(ChainGraph, {
			result,
			lines: "t",
			focus: null,
		});
		const byWeight = widths(wrapper);
		expect(Math.max(...byWeight)).toBeCloseTo(15.2, 6);
		expect(new Set(byWeight).size).toBeGreaterThan(1);
		await setProps({ lines: "c" });
		expect(widths(wrapper)).not.toEqual(byWeight);
		await setProps({ lines: "n" });
		expect(new Set(widths(wrapper))).toEqual(new Set([1.6]));
	});

	it("focus dims what is not up- or downstream (AC 14)", async () => {
		const { wrapper, component } = await mountComponent(ChainGraph, {
			result,
			lines: "t",
			focus: null,
		});
		await wrapper.find("[data-testid='chain-node-RAT']").trigger("click");
		expect(component.emitted("update:focus")![0]).toEqual(["RAT"]);
		expect(component.emitted("focused")![0]).toEqual(["RAT"]);
		const dimmed = (t: string) =>
			wrapper.find(`[data-testid='chain-node-${t}']`).classes().includes("opacity-25");
		expect(dimmed("RAT")).toBe(false);
		expect(dimmed("DW")).toBe(true);
		for (const l of result.links.filter((l) => l.consumer === "RAT"))
			expect(dimmed(l.input)).toBe(false);
		expect(wrapper.text()).toContain("production_chains.graph.focused");
	});
});

describe("ChainGraph fit", () => {
	beforeAll(seedGameData);

	it("fits the whole chain in the width and the 75vh it may take (AC 14)", async () => {
		const ctx = testContext();
		// a shallow, tall chain: many targets with bought inputs
		const result = solveChain(
			chainInput([
				["DW", 100],
				["RAT", 100],
				["OVE", 50],
				["PE", 10],
				["MG", 10],
			]),
			ctx
		);
		const layout = layoutChain(result);
		Object.defineProperty(HTMLElement.prototype, "clientWidth", {
			configurable: true,
			get: () => 4000,
		});
		const innerHeight = window.innerHeight;
		window.innerHeight = 400;
		try {
			const { wrapper } = await mountComponent(ChainGraph, {
				result,
				lines: "t",
				focus: null,
			});
			const zoom = (400 * 0.75) / layout.height;
			expect(zoom).toBeLessThan(1);
			const inner = wrapper.find("[data-testid='chain-graph'] > div");
			expect(parseFloat(inner.attributes("style")!.match(/height: ([\d.]+)px/)![1])).toBeCloseTo(
				layout.height * Math.max(zoom, 0.2),
				3
			);
		} finally {
			delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
			window.innerHeight = innerHeight;
		}
	});
});
