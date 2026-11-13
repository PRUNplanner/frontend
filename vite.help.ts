// Help markdown, parsed at build time (docs/features/help.md):
// - `<file>.md?help` exports the parsed article (HTML, contents, words,
//   sections), or null for a translation that lacks one of the English
//   section ids (it lags behind; the app shows English instead);
// - `virtual:help-search` exports one lazy search index per locale.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import type { Plugin } from "vite";

import { parseHelp } from "./src/features/help/helpMarkdown";
import { HELP_PURIFY_CONFIG } from "./src/features/help/sanitizeHelp";
import type {
	IHelpDoc,
	IHelpSearchEntry,
} from "./src/features/help/help.types";

const HELP_DIR = path.resolve(import.meta.dirname, "src/assets/help");
const SEARCH = "virtual:help-search";
const FALLBACK = "en_US";

const purify = createDOMPurify(new JSDOM("").window);
const sanitize = (html: string) =>
	purify.sanitize(html, HELP_PURIFY_CONFIG) as string;

const GLOSSARY = path.join(HELP_DIR, FALLBACK, "glossary.md");

let glossary: { mtime: number; ids: Set<string> } | undefined;

/**
 * The English glossary's term ids, the targets of `[[term]]` links; read
 * again only when the file changed (dev server)
 */
function glossaryIds(): Set<string> {
	if (!existsSync(GLOSSARY)) return new Set();
	const mtime = statSync(GLOSSARY).mtimeMs;
	if (glossary?.mtime !== mtime) {
		const md = readFileSync(GLOSSARY, "utf8");
		const ids = [...md.matchAll(/^#{1,6} .*\{#([a-z0-9-]+)\}\s*$/gm)];
		glossary = { mtime, ids: new Set(ids.map((m) => m[1]!)) };
	}
	return glossary.ids;
}

// an unknown term fails the build in English, translations show it as text
const parseFile = (file: string): IHelpDoc =>
	parseHelp(readFileSync(file, "utf8"), sanitize, {
		ids: glossaryIds(),
		strict: path.basename(path.dirname(file)) === FALLBACK,
	});

/**
 * The parsed help file, or null when it is a translation without every
 * section id of the English file
 */
export function loadHelpDoc(file: string): IHelpDoc | null {
	const doc = parseFile(file);
	const locale = path.basename(path.dirname(file));
	const english = path.join(HELP_DIR, FALLBACK, path.basename(file));
	if (locale === FALLBACK || path.dirname(file) === HELP_DIR) return doc;
	let ids: string[];
	try {
		ids = parseFile(english).toc.map((t) => t.id);
	} catch {
		return doc;
	}
	const own = new Set(doc.toc.map((t) => t.id));
	return ids.every((id) => own.has(id)) ? doc : null;
}

const locales = () =>
	readdirSync(HELP_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);

/** every article's sections in a locale, English where it lags behind */
function searchIndex(locale: string): IHelpSearchEntry[] {
	const files = readdirSync(path.join(HELP_DIR, FALLBACK)).filter((f) =>
		f.endsWith(".md")
	);
	const entries: IHelpSearchEntry[] = [];
	for (const name of files) {
		const own = path.join(HELP_DIR, locale, name);
		let doc: IHelpDoc | null = null;
		try {
			doc = loadHelpDoc(own);
		} catch {
			// no translation yet
		}
		doc ??= parseFile(path.join(HELP_DIR, FALLBACK, name));
		const article = name.replace(/\.md$/, "");
		for (const s of doc.sections) entries.push({ article, ...s });
	}
	// What's new: English only
	for (const s of parseFile(path.join(HELP_DIR, "changelog.md")).sections)
		entries.push({ article: "whats-new", ...s });
	return entries;
}

export function helpMarkdown(): Plugin {
	return {
		name: "help-markdown",
		resolveId(id) {
			if (id === SEARCH || id.startsWith(`${SEARCH}/`)) return `\0${id}`;
		},
		load(id) {
			if (id === `\0${SEARCH}`) {
				const loaders = locales()
					.map(
						(l) =>
							`${JSON.stringify(l)}: () => import("${SEARCH}/${l}")`
					)
					.join(",\n");
				return `export default {\n${loaders}\n};`;
			}
			if (id.startsWith(`\0${SEARCH}/`)) {
				const locale = id.slice(SEARCH.length + 2);
				// rebuilt when any help file changes
				for (const l of [locale, FALLBACK])
					for (const f of readdirSync(path.join(HELP_DIR, l)))
						this.addWatchFile(path.join(HELP_DIR, l, f));
				return `export default ${JSON.stringify(searchIndex(locale))};`;
			}
			const [file, query] = id.split("?");
			if (query !== "help" || !file!.endsWith(".md")) return;
			// a translation is checked against its English file
			const english = path.join(HELP_DIR, FALLBACK, path.basename(file!));
			if (english !== file && existsSync(english))
				this.addWatchFile(english);
			// its [[term]] links are checked against the glossary
			if (existsSync(GLOSSARY)) this.addWatchFile(GLOSSARY);
			return `export default ${JSON.stringify(loadHelpDoc(file!))};`;
		},
	};
}
