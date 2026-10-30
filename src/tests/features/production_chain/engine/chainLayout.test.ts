import { describe, it, expect } from "vitest";

// Engine
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import {
	LAYOUT,
	layoutChain,
} from "@/features/production_chain/engine/chainLayout";
import { formatQty } from "@/features/production_chain/productionChain.util";

import type { ChainHave } from "@/features/production_chain/engine/chainSolver.types";

interface IBox {
	x: number;
	y: number;
	w: number;
	h: number;
}

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
			if (r.rows[t].source !== "make")
				expect(layout.nodes[t].stage).toBe(0);
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
			expect(n.x).toBe(
				LAYOUT.pad + n.stage * (LAYOUT.nodeWidth + LAYOUT.gapX)
			);
			expect(n.x + LAYOUT.nodeWidth).toBeLessThanOrEqual(layout.width);
			expect(n.y + LAYOUT.nodeHeight).toBeLessThanOrEqual(layout.height);
		}
		expect(layout.edges[0].path).toMatch(/^M[\d.]+,[\d.]+ C/);
	});

	it("puts edge labels where they cover no node and no other label", () => {
		const r = solveChain(
			chainInput([
				["RAT", 100],
				["DW", 50],
			]),
			ctx
		);
		const layout = layoutChain(r);
		const { nodeWidth: W, nodeHeight: H } = LAYOUT;
		// a label's point: its baseline is 4 above, its box 16 high
		const spots = layout.edges.map((e) => ({
			x: e.labelX,
			y: e.labelY + 4,
		}));
		expect(spots.length).toBeGreaterThan(5);
		for (const s of spots)
			for (const n of Object.values(layout.nodes))
				expect(
					s.x + 12 > n.x &&
						s.x - 12 < n.x + W &&
						s.y > n.y &&
						s.y - 16 < n.y + H
				).toBe(false);
		spots.forEach((a, i) =>
			spots
				.slice(i + 1)
				.forEach((b) =>
					expect(
						Math.abs(a.x - b.x) < 24 && Math.abs(a.y - b.y) < 16
					).toBe(false)
				)
		);
	});

	it("lays out an empty chain", () => {
		const layout = layoutChain(solveChain(chainInput([]), ctx));
		expect(layout.stages).toBe(1);
		expect(layout.edges).toEqual([]);
	});
	it("puts fully had materials in column 0, partly had ones in their stage (AC 13)", () => {
		const plain = layoutChain(solveChain(chainInput([["RAT", 100]]), ctx));
		expect(plain.nodes.GRN.stage).toBeGreaterThan(0);
		const full = layoutChain(
			solveChain(
				chainInput([["RAT", 100]], { have: { GRN: "all" } }),
				ctx
			)
		);
		expect(full.nodes.GRN.stage).toBe(0);
		const part = layoutChain(
			solveChain(chainInput([["RAT", 100]], { have: { GRN: 1 } }), ctx)
		);
		expect(part.nodes.GRN.stage).toBe(plain.nodes.GRN.stage);
	});

	it("keeps edge labels clear of each other and of the nodes", () => {
		const cases: Record<string, ChainHave>[] = [
			{},
			{ AL: 480, C: 110, BTS: 600 },
			{ AL: 100, FE: "all" },
		];
		for (const have of cases) {
			const layout = layoutChain(
				solveChain(chainInput([["HCB", 1]], { have }), ctx)
			);
			// a little wider than the layout's estimate, as the browser draws them
			const boxes = layout.edges.map((e) => {
				const w = formatQty(e.perDay).length * 7.5 + 4;
				return { x: e.labelX - w / 2, y: e.labelY - 12, w, h: 14 };
			});
			const nodes = Object.values(layout.nodes).map((n) => ({
				x: n.x,
				y: n.y,
				w: LAYOUT.nodeWidth,
				h: LAYOUT.nodeHeight,
			}));
			const hit = (a: IBox, b: IBox) =>
				a.x < b.x + b.w &&
				b.x < a.x + a.w &&
				a.y < b.y + b.h &&
				b.y < a.y + a.h;
			for (const [i, a] of boxes.entries()) {
				for (const b of boxes.slice(i + 1))
					expect(hit(a, b)).toBe(false);
				for (const n of nodes) expect(hit(a, n)).toBe(false);
			}
		}
	});
});
