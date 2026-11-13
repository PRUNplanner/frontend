import { describe, it, expect } from "vitest";

import {
	articlesByArea,
	getArticle,
	HELP_ARTICLES,
	prevNext,
	siblings,
} from "@/features/help/helpArticles";
import { loadArticle } from "@/features/help/helpContent";
import { SUPPORTED_LOCALES } from "@/lib/i18n";
import help from "@/locales/en_US/help.json";

// the English help files, as written
const EN_FILES = import.meta.glob("@/assets/help/en_US/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

// every HelpPanel of the app, with its article and section
const SOURCES = import.meta.glob("@/**/*.vue", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

// Planet Search opens its help at the view shown
const MODE_SECTIONS = { planet_search: ["list-and-matrix", "chart"] };

const fileName = (path: string) => path.split("/").pop()!.replace(".md", "");

function callSites(): { file: string; article: string; section?: string }[] {
	const sites = [];
	for (const [file, source] of Object.entries(SOURCES))
		for (const m of source.matchAll(/<HelpPanel\b([^>]*)>/g)) {
			const article = m[1]!.match(/\barticle="([^"]+)"/)?.[1];
			const section = m[1]!.match(/(?<![:\w-])section="([^"]+)"/)?.[1];
			sites.push({ file, article: article!, section });
		}
	return sites;
}

describe("help article registry", () => {
	it("has an entry per English file and a file per entry", () => {
		const files = Object.keys(EN_FILES).map(fileName).sort();
		const entries = HELP_ARTICLES.filter(
			(a) => a.file && a.file !== "changelog"
		)
			.map((a) => a.file)
			.sort();
		expect(entries).toEqual(files);
	});

	it("has a title key per article and an area key per area", () => {
		for (const a of HELP_ARTICLES)
			expect(
				(help.articles as Record<string, { title: string }>)[a.id]
					?.title,
				a.id
			).toBeTruthy();
		for (const { area } of articlesByArea())
			expect((help.areas as Record<string, string>)[area]).toBeTruthy();
	});

	it("gives every English heading a unique {#id}", () => {
		for (const [path, md] of Object.entries(EN_FILES)) {
			const headings = md.match(/^#{1,6} .*$/gm) ?? [];
			const ids = headings.map((h) => h.match(/\{#([a-z0-9-]+)\}$/)?.[1]);
			expect(
				ids.filter((id) => !id),
				`${path}: heading without id`
			).toEqual([]);
			expect(new Set(ids).size, `${path}: duplicate id`).toBe(ids.length);
		}
	});

	it("links related articles that exist", () => {
		for (const a of HELP_ARTICLES)
			for (const r of a.related)
				expect(getArticle(r), `${a.id} → ${r}`).toBeDefined();
	});

	it("walks siblings and neighbours in registry order", () => {
		const check = getArticle("plan_check")!;
		expect(siblings(check).map((a) => a.id)).toEqual([
			"plan_layout",
			"plan_results",
			"plan_production",
			"plan_saving",
			"plan_check",
		]);
		expect(siblings(getArticle("empire")!)).toEqual([]);
		expect(prevNext(check).prev?.id).toBe("plan_saving");
		expect(prevNext(check).next?.id).toBe("empire");
		expect(prevNext(HELP_ARTICLES[0]!).prev).toBeUndefined();
	});
});

describe("help links resolve in every locale", () => {
	const sites = callSites();

	it("finds the 18 Help buttons", () => {
		expect(sites).toHaveLength(18);
	});

	it.each([...SUPPORTED_LOCALES])(
		"%s: every article loads and every linked section exists",
		async (locale) => {
			for (const a of HELP_ARTICLES) {
				const loaded = await loadArticle(a, locale);
				if (!a.file) {
					expect(loaded).toBeNull();
					continue;
				}
				expect(loaded!.doc.html, a.id).toBeTruthy();
			}
			// sections bound to a page's mode (:section)
			for (const [id, sections] of Object.entries(MODE_SECTIONS)) {
				const loaded = await loadArticle(getArticle(id)!, locale);
				for (const section of sections)
					expect(
						loaded!.doc.toc.map((t) => t.id),
						`${id}#${section}`
					).toContain(section);
			}
			for (const site of sites) {
				const article = getArticle(site.article);
				expect(article, `${site.file}: ${site.article}`).toBeDefined();
				if (!site.section) continue;
				const loaded = await loadArticle(article!, locale);
				expect(
					loaded!.doc.toc.map((t) => t.id),
					`${site.file}: ${site.article}#${site.section}`
				).toContain(site.section);
			}
		}
	);
});
