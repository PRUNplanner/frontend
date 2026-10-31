import { describe, expect, it } from "vitest";
import { parse } from "vue/compiler-sfc";

const sources = import.meta.glob("/src/**/*.vue", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

// the template AST, as far as the check reads it (compiler-core's NodeTypes)
interface INode {
	type: number;
	tagType?: number;
	content?: string;
	props?: { type: number; name: string }[];
	children?: INode[];
	loc: { start: { line: number }; source: string };
}
const ELEMENT = 1;
const TEXT = 2;
const COMMENT = 3;
const INTERPOLATION = 5;
const TEMPLATE = 3;
const SLOT = 2;

const has = (n: INode, name: string) =>
	!!n.props?.some((p) => p.type === 7 && p.name === name);
const kids = (n: INode) => (n.children ?? []).filter((c) => c.type !== COMMENT);
const isTemplateFragment = (n: INode) =>
	n.type === ELEMENT &&
	n.tagType === TEMPLATE &&
	["if", "else-if", "else", "for"].some((d) => has(n, d));
const isFragment = (n: INode) =>
	isTemplateFragment(n) ||
	(n.type === ELEMENT && (has(n, "for") || n.tagType === SLOT));
/** does the node's left or right edge render as text? */
const isText = (n: INode | undefined, side: "l" | "r"): boolean => {
	if (!n) return false;
	if (n.type === INTERPOLATION || (n.type === TEXT && n.content?.trim()))
		return true;
	return (
		isTemplateFragment(n) &&
		isText(side === "l" ? kids(n)[0] : kids(n).at(-1), side)
	);
};

/** fragments (v-if/v-for templates, v-for lists, slots) with text at an edge */
function textEdgedFragments(source: string): string[] {
	const ast = parse(source).descriptor.template?.ast as INode | undefined;
	const found: string[] = [];
	const walk = (node: INode) => {
		const list = kids(node);
		list.forEach((child, i) => {
			if (
				isFragment(child) &&
				(isText(list[i - 1], "r") ||
					isText(list[i + 1], "l") ||
					(isTemplateFragment(child) &&
						(isText(child, "l") || isText(child, "r"))))
			)
				found.push(
					`${child.loc.start.line}: ${child.loc.source.split("\n")[0].trim()}`
				);
			walk(child);
		});
	};
	if (ast) walk(ast);
	return found;
}

// Browser page translation replaces each run of text nodes with its own
// <font>, Vue's empty fragment markers included. Removing or moving such a
// fragment then crashes the patch, and the page stops updating
// (#700). Text next to a fragment goes in an element (a <span v-if>).
describe("templates survive page translation", () => {
	it("finds text at a fragment's edge", () => {
		expect(
			textEdgedFragments(
				`<template><p>a <template v-if="x">b</template></p><p><span v-for="i in 2" :key="i" />c</p><p><template v-if="y"><b /></template><i /></p></template>`
			)
		).toEqual([
			`1: <template v-if="x">b</template>`,
			`1: <span v-for="i in 2" :key="i" />`,
		]);
	});

	it("keeps text out of fragment edges", () => {
		expect(Object.keys(sources).length).toBeGreaterThan(250);
		for (const [file, source] of Object.entries(sources))
			expect(textEdgedFragments(source), file).toEqual([]);
	});
});
