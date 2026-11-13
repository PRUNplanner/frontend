import { describe, it, expect } from "vitest";

import { parseHelp, slugify } from "@/features/help/helpMarkdown";
import { sanitizeHelpHtml } from "@/features/help/sanitizeHelp";
import planCheck from "@/assets/help/en_US/plan_check.md?help";

const parse = (md: string) => parseHelp(md, sanitizeHelpHtml);

describe("parseHelp", () => {
	it("reads {#id} headings into ids, contents and sections", () => {
		const doc = parse(
			[
				"Lead text here.",
				"## Market check {#market-check}",
				"Some **bold** words.",
				"### Flags {#flags}",
				"- one",
				"- two",
			].join("\n\n")
		);
		expect(doc.toc).toEqual([
			{ id: "market-check", title: "Market check", level: 2 },
			{ id: "flags", title: "Flags", level: 3 },
		]);
		expect(doc.html).toContain('<h2 id="market-check">Market check</h2>');
		expect(doc.html).not.toContain("{#");
		expect(doc.sections).toEqual([
			{ id: "", title: "", text: "Lead text here." },
			{
				id: "market-check",
				title: "Market check",
				text: "Some bold words.",
			},
			{ id: "flags", title: "Flags", text: "one two" },
		]);
		expect(doc.words).toBe(8);
	});

	it("renders a top level # as h2 and gives releases their version id", () => {
		const doc = parse(
			"# 2026-11-10 - v. 0.36.0\n\nText\n\n# Other\n\n# Other"
		);
		expect(doc.toc.map((t) => [t.id, t.level])).toEqual([
			["0-36-0", 2],
			["other", 2],
			["other-2", 2],
		]);
	});

	it("turns tip and warning quotes into callouts, nothing else", () => {
		const doc = parse(
			"> [!tip]\n> Switch to %.\n\n> [!warning] Careful\n\n> [!note] stays"
		);
		expect(doc.html).toContain(
			'<blockquote class="help-callout help-callout-tip" data-callout="tip">'
		);
		expect(doc.html).toContain("<p>Switch to %.</p>");
		expect(doc.html).toContain('data-callout="warning"');
		expect(doc.html).toContain("<p>Careful</p>");
		expect(doc.html).toContain("<blockquote>\n<p>[!note] stays</p>");
	});

	it("renders tables and links bare URLs", () => {
		const doc = parse(
			"| a | b |\n| - | - |\n| 1 | 2 |\n\nhttps://example.com"
		);
		expect(doc.html).toContain("<table>");
		expect(doc.html).toContain('<a href="https://example.com">');
	});

	it("leaves a hostile file inert", () => {
		const doc = parse(
			[
				'<img src="x" onerror="alert(1)">',
				"<script>alert(2)</script>",
				"[click](javascript:alert(3))",
				'## Bad {#bad}" onclick="x',
			].join("\n\n")
		);
		const div = document.createElement("div");
		div.innerHTML = doc.html;
		expect(
			div.querySelector("script, img, [onerror], [onclick]")
		).toBeNull();
		expect(div.querySelector('a[href^="javascript"]')).toBeNull();
	});

	it("slugifies", () => {
		expect(slugify("Price Basis: VWAP, Ask & Bid")).toBe(
			"price-basis-vwap-ask-bid"
		);
	});
});

describe("the ?help import (build)", () => {
	it("is parsed and sanitised at build time", () => {
		expect(planCheck!.toc.map((t) => t.id)).toContain("flags");
		expect(planCheck!.html).toContain('<h2 id="flags">');
	});
});
