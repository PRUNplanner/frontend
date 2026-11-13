import { describe, it, expect } from "vitest";

import { parseHelp } from "@/features/help/helpMarkdown";
import { sanitizeHelpHtml } from "@/features/help/sanitizeHelp";
import hostileBuilt from "./fixtures/hostile.md?help";

// every help page: all locales (Crowdin) and the changelog
const HELP_FILES = import.meta.glob("@/assets/help/**/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

// the same files as the build parses them (vite.help.ts)
const HELP_DOCS = import.meta.glob("@/assets/help/**/*.md", {
	query: "?help",
	import: "default",
	eager: true,
}) as Record<string, { html: string } | null>;

const ALLOWED_TARGET = /^(https?:|\/|#)/;

/**
 * Problems a translation must not bring in: raw HTML, or a link or image
 * target other than http(s), a site path or an anchor.
 */
function lintHelpMarkdown(markdown: string): string[] {
	const text = markdown
		.replace(/```[\s\S]*?```/g, "")
		.replace(/`[^`\n]*`/g, "");
	const problems: string[] = [];
	for (const m of text.matchAll(/<\/?[a-zA-Z!][^>]*>/g))
		problems.push(`raw HTML ${m[0]}`);
	const targets = [
		...text.matchAll(/\]\(\s*<?([^)\s>]+)/g),
		...text.matchAll(/^\s*\[[^\]]+\]:\s*<?(\S+?)>?\s*$/gm),
	];
	for (const [, target] of targets)
		if (!ALLOWED_TARGET.test(target!)) problems.push(`target ${target}`);
	return problems;
}

const HOSTILE = [
	"# Title",
	'<img src="x" onerror="alert(1)">',
	"<script>alert(2)</script>",
	"[click](javascript:alert(3))",
	'<a href="javascript:alert(4)">a</a>',
].join("\n\n");

function expectInert(html: string): void {
	const div = document.createElement("div");
	div.innerHTML = html;
	expect(div.querySelector("script, img[onerror], [onclick]")).toBeNull();
	for (const a of div.querySelectorAll("a"))
		expect(a.getAttribute("href") ?? "").not.toMatch(/javascript:/i);
	// raw HTML is escaped to text: no element carries a handler
	for (const el of div.querySelectorAll("*"))
		for (const attr of el.getAttributeNames())
			expect(attr).not.toMatch(/^on/i);
}

describe("help markdown sanitising", () => {
	it("finds the help files", () => {
		expect(Object.keys(HELP_FILES).length).toBeGreaterThan(100);
	});

	it("leaves a hostile file inert on the client", () => {
		const doc = parseHelp(HOSTILE, sanitizeHelpHtml);
		expect(doc.toc[0]?.title).toBe("Title");
		expectInert(doc.html);
	});

	it("leaves a hostile file inert at build time", () => {
		expectInert(hostileBuilt!.html);
		expectInert(sanitizeHelpHtml(hostileBuilt!.html));
	});

	it.each(Object.entries(HELP_DOCS).filter(([, d]) => d))(
		"%s builds to inert HTML",
		(_path, doc) => expectInert(doc!.html)
	);

	it("drops style elements", () => {
		expect(sanitizeHelpHtml("<style>p{}</style><p>a</p>")).toBe("<p>a</p>");
	});
});

describe("help file lint", () => {
	it("flags raw HTML and disallowed targets", () => {
		expect(lintHelpMarkdown(HOSTILE)).toEqual([
			'raw HTML <img src="x" onerror="alert(1)">',
			"raw HTML <script>",
			"raw HTML </script>",
			'raw HTML <a href="javascript:alert(4)">',
			"raw HTML </a>",
			"target javascript:alert(3",
		]);
		expect(lintHelpMarkdown("[x]: data:text/html,hi")).toEqual([
			"target data:text/html,hi",
		]);
	});

	it("passes code spans and allowed targets", () => {
		expect(
			lintHelpMarkdown(
				"`<b>` [a](https://x.org) [b](/plan) [c](#top) ![i](/images/a.png)"
			)
		).toEqual([]);
	});

	it.each(Object.entries(HELP_FILES))("%s is clean", (_path, markdown) => {
		expect(lintHelpMarkdown(markdown)).toEqual([]);
	});
});
