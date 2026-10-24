import { describe, it, expect } from "vitest";

// Engine
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import {
	LAYOUT,
	layoutChain,
} from "@/features/production_chain/engine/chainLayout";

// Fixtures
import {
	chainInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

describe("layoutChain", () => {
	const ctx = testContext();

	it("puts bought materials in stage 0 and consumers after inputs", () => {
		const r = solveChain(chainInput([["RAT", 100]]), ctx);
		const layout = layoutChain(r);

		for (const t of r.order)
			if (r.rows[t].source !== "make") expect(layout.nodes[t].stage).toBe(0);
		for (const l of r.links)
			expect(layout.nodes[l.consumer].stage).toBeGreaterThan(
				layout.nodes[l.input].stage
			);
		expect(layout.nodes.RAT.stage).toBe(layout.stages - 1);
		expect(layout.edges.length).toBe(r.links.length);
	});

	it("places nodes in columns without overlap", () => {
		const r = solveChain(chainInput([["GWS", 1]]), ctx);
		const layout = layoutChain(r);
		const seen = new Set<string>();
		for (const n of Object.values(layout.nodes)) {
			const key = `${n.x}|${n.y}`;
			expect(seen.has(key)).toBe(false);
			seen.add(key);
			expect(n.x).toBe(LAYOUT.pad + n.stage * (LAYOUT.nodeWidth + LAYOUT.gapX));
			expect(n.x + LAYOUT.nodeWidth).toBeLessThanOrEqual(layout.width);
			expect(n.y + LAYOUT.nodeHeight).toBeLessThanOrEqual(layout.height);
		}
		expect(layout.edges[0].path).toMatch(/^M[\d.]+,[\d.]+ C/);
	});

	it("lays out an empty chain", () => {
		const layout = layoutChain(solveChain(chainInput([]), ctx));
		expect(layout.stages).toBe(1);
		expect(layout.edges).toEqual([]);
	});
});
