import { describe, it, expect } from "vitest";

import { highlight, MAX_RESULTS, searchHelp } from "@/features/help/helpSearch";
import { HELP_ARTICLES } from "@/features/help/helpArticles";
import indexes from "virtual:help-search";
import help from "@/locales/en_US/help.json";

const titles = help.articles as Record<string, { title: string }>;
const titleOf = (id: string) => titles[id]!.title;
const order = HELP_ARTICLES.map((a) => a.id);

describe("helpSearch", () => {
	it("has an index per help locale", () => {
		expect(Object.keys(indexes)).toContain("en_US");
		expect(Object.keys(indexes)).toContain("de_DE");
	});

	it("finds COGM in Exchanges and Plan production", async () => {
		const index = (await indexes.en_US!()).default;
		const results = searchHelp(index, "cogm", titleOf, order);
		const articles = results.map((r) => r.article);
		expect(articles).toContain("exchanges");
		expect(articles).toContain("plan_production");
		// the section title match ranks first
		expect(results[0]).toMatchObject({
			article: "exchanges",
			section: "fixed-prices-and-cogm",
		});
		expect(results[0]!.title.find((p) => p.mark)?.text).toBe("COGM");
	});

	it("finds nothing for nonsense, and nothing for an empty query", async () => {
		const index = (await indexes.en_US!()).default;
		expect(searchHelp(index, "xqzzv", titleOf, order)).toEqual([]);
		expect(searchHelp(index, "  ", titleOf, order)).toEqual([]);
	});

	it("needs every word and caps the results", async () => {
		const index = (await indexes.en_US!()).default;
		const both = searchHelp(index, "plan versions", titleOf, order);
		expect(
			both.every((r) => r.article === "plan_saving" || r.title.length)
		).toBe(true);
		expect(searchHelp(index, "the", titleOf, order)).toHaveLength(
			MAX_RESULTS
		);
	});

	it("cuts a long text around the match", () => {
		const index = [
			{
				article: "x",
				id: "s",
				title: "S",
				text: `${"a ".repeat(200)}needle ${"b ".repeat(200)}`,
			},
		];
		const [r] = searchHelp(index, "needle", () => "X", ["x"]);
		const text = r!.snippet.map((p) => p.text).join("");
		expect(text.startsWith("…")).toBe(true);
		expect(text.endsWith("…")).toBe(true);
		expect(r!.snippet.filter((p) => p.mark).map((p) => p.text)).toEqual([
			"needle",
		]);
	});

	it("highlights every word, case kept", () => {
		expect(highlight("Fixed Prices and COGM", "cogm fixed")).toEqual([
			{ text: "Fixed", mark: true },
			{ text: " Prices and ", mark: false },
			{ text: "COGM", mark: true },
		]);
		expect(highlight("", "x")).toEqual([]);
		expect(highlight("abc", "")).toEqual([{ text: "abc", mark: false }]);
	});
});
