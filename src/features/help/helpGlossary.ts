/**
 * The glossary's entries for the term popover: a term's title and its
 * first paragraph, from the glossary article in the active locale.
 *
 * @author jplacht
 */
import { getArticle } from "./helpArticles";
import { loadArticle } from "./helpContent";

export const GLOSSARY = "glossary";

export interface IGlossaryTerm {
	id: string;
	title: string;
	/** the entry's first paragraph, plain text */
	definition: string;
}

const cache = new Map<string, Promise<Map<string, IGlossaryTerm>>>();

async function load(locale: string): Promise<Map<string, IGlossaryTerm>> {
	const terms = new Map<string, IGlossaryTerm>();
	const loaded = await loadArticle(getArticle(GLOSSARY)!, locale);
	if (!loaded) return terms;
	// sanitised at build; only text is read from it
	const page = new DOMParser().parseFromString(loaded.doc.html, "text/html");
	for (const { id, title } of loaded.doc.toc) {
		const heading = page.getElementById(id);
		const next = heading?.nextElementSibling;
		const definition = next?.tagName === "P" ? next.textContent : "";
		terms.set(id, { id, title, definition: definition ?? "" });
	}
	return terms;
}

/**
 * @param {string} id A glossary id (`data-term`)
 * @param {string} locale The active locale
 * @returns {Promise} The term, or null when the glossary has no such entry
 */
export async function glossaryTerm(
	id: string,
	locale: string
): Promise<IGlossaryTerm | null> {
	let terms = cache.get(locale);
	if (!terms) {
		terms = load(locale);
		cache.set(locale, terms);
		terms.catch(() => cache.delete(locale));
	}
	return (await terms).get(id) ?? null;
}
