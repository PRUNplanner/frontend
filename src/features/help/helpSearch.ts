/**
 * Help search in the browser over one locale's index (vite.help.ts):
 * every query word must appear in the article title, the section title or
 * its text; titles rank first.
 *
 * @author jplacht
 */
import type { IHelpSearchEntry } from "./help.types";

export const MAX_RESULTS = 20;
const SNIPPET = 140;

/** a run of text, marked where it matches the query */
export interface IHelpTextPart {
	text: string;
	mark: boolean;
}

export interface IHelpSearchResult {
	article: string;
	section: string;
	title: IHelpTextPart[];
	snippet: IHelpTextPart[];
	score: number;
}

const words = (query: string) =>
	query
		.toLowerCase()
		.split(/\s+/)
		.filter((w) => w.length > 0);

/** the text cut into marked and unmarked runs */
export function highlight(text: string, query: string): IHelpTextPart[] {
	const ws = words(query).map((w) =>
		w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	);
	if (!ws.length || !text) return text ? [{ text, mark: false }] : [];
	const re = new RegExp(`(${ws.join("|")})`, "i");
	// split with a capture group: the matches sit at the odd places
	return text
		.split(re)
		.map((part, i) => ({ text: part, mark: i % 2 === 1 }))
		.filter((p) => p.text);
}

/** the text around the first match */
function snippet(text: string, query: string): string {
	const at = Math.min(
		...words(query).map((w) => {
			const i = text.toLowerCase().indexOf(w);
			return i < 0 ? Infinity : i;
		})
	);
	if (!Number.isFinite(at) || text.length <= SNIPPET)
		return text.slice(0, SNIPPET);
	const start = Math.max(0, at - 40);
	const cut = text.slice(start, start + SNIPPET);
	return `${start > 0 ? "…" : ""}${cut}${start + SNIPPET < text.length ? "…" : ""}`;
}

/**
 * @param {IHelpSearchEntry[]} index One locale's sections
 * @param {string} query What the reader typed
 * @param {(article: string) => string} titleOf An article's title
 * @param {string[]} order Article ids in registry order, for ties
 */
export function searchHelp(
	index: IHelpSearchEntry[],
	query: string,
	titleOf: (article: string) => string,
	order: string[]
): IHelpSearchResult[] {
	const ws = words(query);
	if (!ws.length) return [];
	const results: IHelpSearchResult[] = [];
	for (const e of index) {
		const article = titleOf(e.article).toLowerCase();
		const title = e.title.toLowerCase();
		const text = e.text.toLowerCase();
		if (
			!ws.every(
				(w) =>
					article.includes(w) || title.includes(w) || text.includes(w)
			)
		)
			continue;
		let score = 0;
		for (const w of ws) {
			if (article.includes(w) && !e.id) score += 4;
			if (title.includes(w)) score += 3;
			if (text.includes(w)) score += 1;
		}
		results.push({
			article: e.article,
			section: e.id,
			title: highlight(e.title || titleOf(e.article), query),
			snippet: highlight(snippet(e.text, query), query),
			score,
		});
	}
	const rank = (a: string) => {
		const i = order.indexOf(a);
		return i < 0 ? order.length : i;
	};
	return results
		.sort((a, b) => b.score - a.score || rank(a.article) - rank(b.article))
		.slice(0, MAX_RESULTS);
}
