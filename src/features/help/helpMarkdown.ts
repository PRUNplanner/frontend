/**
 * Help markdown to HTML, table of contents and search sections. Runs at
 * build time (the `?help` import in vite.help.ts) and in tests, so it
 * imports nothing from the app; the sanitiser is passed in.
 *
 * @author jplacht
 */
import MarkdownIt from "markdown-it";
import type { Token } from "markdown-it";

import type { IHelpDoc, IHelpSection, IHelpTocEntry } from "./help.types";

// the only directives a translation can use: `> [!tip]` and `> [!warning]`
const CALLOUTS = ["tip", "warning"] as const;
const ID_SUFFIX = /\s*\{#([a-z0-9-]+)\}\s*$/;
// a changelog release: "# 2026-11-10 - v. 0.36.0" -> 0-36-0
const RELEASE = /v\.?\s*(\d+\.\d+\.\d+)/;

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/** a heading's id: its `{#id}`, a release's version, else its text */
function headingId(text: string): { id: string; title: string } {
	const own = text.match(ID_SUFFIX);
	if (own) return { id: own[1]!, title: text.replace(ID_SUFFIX, "") };
	const release = text.match(RELEASE);
	return { id: slugify(release ? release[1]! : text), title: text };
}

function plainText(inline: Token): string {
	return (inline.children ?? [])
		.filter((c) => c.type === "text" || c.type === "code_inline")
		.map((c) => c.content)
		.join("");
}

const md = new MarkdownIt({ html: false, linkify: true });

/**
 * @param {string} markdown A help file
 * @param {(html: string) => string} sanitize DOMPurify (browser or jsdom)
 * @returns {IHelpDoc} Sanitised HTML, contents, word count and sections
 */
export function parseHelp(
	markdown: string,
	sanitize: (html: string) => string
): IHelpDoc {
	const tokens = md.parse(markdown, {});

	// the top level renders as h2: the page's h1 is the article title
	const levels = tokens
		.filter((t) => t.type === "heading_open")
		.map((t) => Number(t.tag.slice(1)));
	const shift = levels.length ? 2 - Math.min(...levels) : 0;

	const toc: IHelpTocEntry[] = [];
	const sections: IHelpSection[] = [{ id: "", title: "", text: "" }];
	const seen = new Set<string>();
	let words = 0;

	tokens.forEach((token, i) => {
		if (token.type === "heading_open" || token.type === "heading_close")
			token.tag = `h${Math.min(6, Number(token.tag.slice(1)) + shift)}`;

		if (token.type === "heading_open") {
			const inline = tokens[i + 1]!;
			const { id, title } = headingId(inline.content);
			// a repeated heading keeps a unique anchor
			let unique = id;
			for (let n = 2; seen.has(unique); n++) unique = `${id}-${n}`;
			seen.add(unique);
			token.attrSet("id", unique);
			inline.content = title;
			const last = inline.children?.at(-1);
			if (last?.type === "text")
				last.content = last.content.replace(ID_SUFFIX, "");
			const level = Number(token.tag.slice(1));
			toc.push({ id: unique, title, level });
			sections.push({ id: unique, title, text: "" });
			return;
		}

		if (token.type === "blockquote_open") {
			const inline = tokens[i + 2];
			const marker = inline?.content.match(/^\[!(\w+)\]\s*/);
			const kind = CALLOUTS.find((k) => k === marker?.[1]?.toLowerCase());
			if (inline && marker && kind) {
				token.attrSet("class", `help-callout help-callout-${kind}`);
				token.attrSet("data-callout", kind);
				inline.content = inline.content.slice(marker[0].length);
				const first = inline.children?.[0];
				if (first?.type === "text")
					first.content = first.content.replace(/^\[!\w+\]\s*/, "");
				// the marker's own line leaves a softbreak behind
				if (inline.children?.[0]?.content === "")
					inline.children.splice(
						0,
						inline.children[1]?.type === "softbreak" ? 2 : 1
					);
			}
		}

		if (token.type === "inline" && tokens[i - 1]?.type !== "heading_open") {
			const text = plainText(token);
			words += text.split(/\s+/).filter(Boolean).length;
			const section = sections.at(-1)!;
			section.text = section.text ? `${section.text} ${text}` : text;
		}
	});

	return {
		html: sanitize(md.renderer.render(tokens, md.options, {})),
		toc,
		words,
		sections: sections.filter((s) => s.id || s.text),
	};
}
