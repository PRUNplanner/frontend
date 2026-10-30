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

	const widths = (
		wrapper: Awaited<ReturnType<typeof mountComponent>>["wrapper"]
	) =>
		wrapper
			.findAll("path")
			.map((p) => Number(p.attributes("stroke-width")));

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
			wrapper
				.find(`[data-testid='chain-node-${t}']`)
				.classes()
				.includes("opacity-25");
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
			expect(
				parseFloat(
					inner.attributes("style")!.match(/height: ([\d.]+)px/)![1]
				)
			).toBeCloseTo(layout.height * Math.max(zoom, 0.2), 3);
		} finally {
			delete (HTMLElement.prototype as unknown as Record<string, unknown>)
				.clientWidth;
			window.innerHeight = innerHeight;
		}
	});

	it("stops a width-bound fit at 0.75 so a phone pans instead", async () => {
		const ctx = testContext();
		const result = solveChain(chainInput([["RAT", 100]]), ctx);
		const layout = layoutChain(result);
		Object.defineProperty(HTMLElement.prototype, "clientWidth", {
			configurable: true,
			get: () => 330,
		});
		const innerHeight = window.innerHeight;
		window.innerHeight = 4000;
		try {
			const { wrapper } = await mountComponent(ChainGraph, {
				result,
				lines: "t",
				focus: null,
			});
			expect(330 / layout.width).toBeLessThan(0.75);
			const inner = wrapper.find("[data-testid='chain-graph'] > div");
			expect(
				parseFloat(
					inner.attributes("style")!.match(/width: ([\d.]+)px/)![1]
				)
			).toBeCloseTo(layout.width * 0.75, 3);
		} finally {
			delete (HTMLElement.prototype as unknown as Record<string, unknown>)
				.clientWidth;
			window.innerHeight = innerHeight;
		}
	});
});

describe("ChainGraph details", () => {
	beforeAll(seedGameData);

	it("zooms in steps, marks bought and cheaper nodes, and shows all again", async () => {
		const ctx = testContext();
		const result = solveChain(chainInput([["GWS", 1]]), ctx);
		const { wrapper, component } = await mountComponent(ChainGraph, {
			result,
			lines: "n",
			focus: null,
		});
		const inner = () =>
			parseFloat(
				wrapper
					.find("[data-testid='chain-graph'] > div")
					.attributes("style")!
					.match(/width: ([\d.]+)px/)![1]
			);
		const before = inner();
		(component.vm as unknown as { zoomBy: (d: 1 | -1) => void }).zoomBy(1);
		await wrapper.vm.$nextTick();
		expect(inner()).toBeCloseTo(before * 1.25, 3);
		(component.vm as unknown as { zoomBy: (d: 1 | -1) => void }).zoomBy(-1);
		await wrapper.vm.$nextTick();
		expect(inner()).toBeCloseTo(before, 3);

		const bought = result.order.find(
			(t) => result.rows[t].source === "buy"
		)!;
		const node = wrapper.find(`[data-testid='chain-node-${bought}']`);
		expect(node.classes()).toContain("border-dashed");
		expect(node.text()).toContain("production_chains.graph.buy_on");
		const cheaper = result.warnings.cheaper[0];
		expect(
			wrapper
				.find(`[data-testid='chain-node-${cheaper}'] .text-warning`)
				.exists()
		).toBe(true);

		await node.trigger("click");
		await node.trigger("click");
		expect(component.emitted("update:focus")).toEqual([[bought], [null]]);
	});

	it("shows all from a focused material", async () => {
		const ctx = testContext();
		const result = solveChain(chainInput([["DW", 10]]), ctx);
		const { wrapper, component } = await mountComponent(ChainGraph, {
			result,
			lines: "c",
			focus: "DW",
		});
		const showAll = wrapper
			.findAll("button")
			.find((b) => b.text() === "production_chains.graph.show_all")!;
		await showAll.trigger("click");
		expect(component.emitted("update:focus")).toEqual([[null]]);
	});

	it("marks Have nodes, full ones in the first column (AC 13)", async () => {
		const had = solveChain(
			chainInput([["RAT", 100]], { have: { GRN: "all", NUT: 2 } }),
			testContext()
		);
		const { wrapper } = await mountComponent(ChainGraph, {
			result: had,
			lines: "t",
			focus: null,
			own: {
				name: "Main",
				surplus: new Map(),
				suppliers: {
					GRN: [
						{
							key: "a",
							plan: { name: "Alpha" },
							perDay: 1,
							surplus: 1,
						},
						{
							key: "b",
							plan: { name: "Beta" },
							perDay: 1,
							surplus: 1,
						},
					],
				},
				overrides: {},
			},
		});
		const layout = layoutChain(had);
		expect(layout.nodes.GRN.stage).toBe(0);
		expect(layout.nodes.NUT.stage).toBeGreaterThan(0);
		for (const t of ["GRN", "NUT"])
			expect(
				wrapper.find(`[data-testid='chain-have-mark-${t}']`).exists()
			).toBe(true);
		expect(
			wrapper.find("[data-testid='chain-have-mark-RAT']").exists()
		).toBe(false);
		expect(wrapper.find("[data-testid='chain-node-GRN']").text()).toContain(
			"production_chains.have.graph_full_more"
		);
		// partly had: the amount in the mark, the usual second line
		expect(wrapper.find("[data-testid='chain-have-mark-NUT']").text()).toBe(
			"production_chains.have.graph_mark_part"
		);
		expect(wrapper.find("[data-testid='chain-node-NUT']").text()).toContain(
			" · "
		);
		expect(wrapper.text()).toContain("production_chains.have.stage_raw");
	});
});
