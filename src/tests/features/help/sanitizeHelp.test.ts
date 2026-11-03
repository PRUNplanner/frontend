import { describe, it, expect } from "vitest";
import { showdown } from "vue-showdown";

import {
	sanitizeExtension,
	sanitizeHelpHtml,
} from "@/features/help/sanitizeHelp";

// every help page: all locales (Crowdin) and the changelog
const HELP_FILES = import.meta.glob("@/assets/help/**/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

// HelpMarkdown's options
function converter(sanitize: boolean): showdown.Converter {
	const c = new showdown.Converter({
		tables: true,
		emoji: true,
		extensions: sanitize ? [sanitizeExtension] : [],
	});
	c.setFlavor("github");
	return c;
}

// what innerHTML makes of showdown's raw output: the DOM it renders today
function asRendered(html: string): string {
	const div = document.createElement("div");
	div.innerHTML = html;
	return div.innerHTML;
}

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

describe("help markdown sanitising", () => {
	it("finds the help files", () => {
		expect(Object.keys(HELP_FILES).length).toBeGreaterThan(100);
	});

	it.each(Object.entries(HELP_FILES))(
		"renders %s as before",
		(_path, markdown) => {
			expect(converter(true).makeHtml(markdown)).toBe(
				asRendered(converter(false).makeHtml(markdown))
			);
		}
	);

	it("drops script, event handlers and javascript: links", () => {
		const div = document.createElement("div");
		div.innerHTML = converter(true).makeHtml(HOSTILE);

		expect(div.querySelector("h1")?.textContent).toBe("Title");
		expect(div.querySelector("script")).toBeNull();
		expect(div.querySelector("img")?.hasAttribute("onerror")).toBe(false);
		for (const a of div.querySelectorAll("a"))
			expect(a.getAttribute("href") ?? "").not.toMatch(/javascript:/i);
		expect(div.innerHTML).not.toMatch(/onerror|<script|javascript:/i);
	});

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
