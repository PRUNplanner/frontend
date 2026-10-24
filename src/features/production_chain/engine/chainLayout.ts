// Types & Interfaces
import type { IChainResult } from "@/features/production_chain/engine/chainSolver.types";

/** node and gap sizes of the chain graph, in SVG units */
export const LAYOUT = {
	nodeWidth: 172,
	nodeHeight: 52,
	gapX: 92,
	gapY: 16,
	pad: 28,
	header: 18,
} as const;

const BARYCENTER_PASSES = 4;

export interface IChainLayoutNode {
	ticker: string;
	stage: number;
	x: number;
	y: number;
}

export interface IChainLayoutEdge {
	input: string;
	consumer: string;
	perDay: number;
	/** cubic path from the input's right to the consumer's left */
	path: string;
	labelX: number;
	labelY: number;
}

export interface IChainLayout {
	stages: number;
	nodes: Record<string, IChainLayoutNode>;
	edges: IChainLayoutEdge[];
	width: number;
	height: number;
}

/**
 * Lays out a solved chain in stage columns: 0 for bought and extracted
 * materials, else one more than the highest input. A few barycenter passes
 * order each column to reduce crossings. A plain function, so a library
 * layout could replace it.
 * @author jplacht
 *
 * @param {IChainResult} result Solved chain
 * @returns {IChainLayout} Positions
 */
export function layoutChain(result: IChainResult): IChainLayout {
	const inputsOf = new Map<string, string[]>();
	const usersOf = new Map<string, string[]>();
	for (const l of result.links) {
		inputsOf.set(l.consumer, [...(inputsOf.get(l.consumer) ?? []), l.input]);
		usersOf.set(l.input, [...(usersOf.get(l.input) ?? []), l.consumer]);
	}

	// order lists inputs before consumers, so one pass sets every stage
	const stage = new Map<string, number>();
	for (const t of result.order) {
		const ins = result.rows[t].source === "make" ? inputsOf.get(t) ?? [] : [];
		stage.set(t, 1 + Math.max(-1, ...ins.map((i) => stage.get(i) ?? 0)));
	}

	const stages = Math.max(0, ...stage.values()) + 1;
	const columns: string[][] = Array.from({ length: stages }, () => []);
	for (let k = result.order.length - 1; k >= 0; k--)
		columns[stage.get(result.order[k])!].push(result.order[k]);

	const y = new Map<string, number>();
	const place = () =>
		columns.forEach((c) => c.forEach((t, i) => y.set(t, i)));
	// a node without neighbours keeps its place
	const mean = (t: string, list: string[] | undefined) =>
		list?.length
			? list.reduce((s, x) => s + y.get(x)!, 0) / list.length
			: y.get(t)!;

	place();
	for (let it = 0; it < BARYCENTER_PASSES; it++) {
		for (let c = 1; c < stages; c++)
			columns[c].sort((a, b) => mean(a, inputsOf.get(a)) - mean(b, inputsOf.get(b)));
		place();
		for (let c = stages - 2; c >= 0; c--)
			columns[c].sort((a, b) => mean(a, usersOf.get(a)) - mean(b, usersOf.get(b)));
		place();
	}

	const { nodeWidth: W, nodeHeight: H, gapX, gapY, pad, header } = LAYOUT;
	const nodes: Record<string, IChainLayoutNode> = {};
	columns.forEach((c, ci) =>
		c.forEach((t, i) => {
			nodes[t] = {
				ticker: t,
				stage: ci,
				x: pad + ci * (W + gapX),
				y: pad + header + i * (H + gapY),
			};
		})
	);

	const edges: IChainLayoutEdge[] = result.links.map((l) => {
		const a = nodes[l.input];
		const b = nodes[l.consumer];
		const x1 = a.x + W;
		const y1 = a.y + H / 2;
		const x2 = b.x;
		const y2 = b.y + H / 2;
		const mx = (x1 + x2) / 2;
		return {
			...l,
			path: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`,
			labelX: mx,
			labelY: (y1 + y2) / 2 - 4,
		};
	});

	return {
		stages,
		nodes,
		edges,
		width: pad * 2 + stages * W + (stages - 1) * gapX,
		height:
			pad * 2 +
			header +
			Math.max(0, ...columns.map((c) => c.length)) * (H + gapY),
	};
}
