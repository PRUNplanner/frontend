import { describe, it, expect } from "vitest";

import { buildSitemap, htmlLang } from "@/lib/seo/site";

describe("htmlLang", () => {
	it.each([
		["en_US", "en-US"],
		["zh_CN", "zh-CN"],
		["keymode", "en"],
	])("%s is %s", (locale, lang) => expect(htmlLang(locale)).toBe(lang));
});

describe("buildSitemap", () => {
	it("lists every path with the build date", () => {
		const xml = buildSitemap(
			["/", "/imprint-tos"],
			new Date("2026-10-20T12:00:00Z")
		);
		const doc = new DOMParser().parseFromString(xml, "application/xml");

		expect(doc.querySelector("parsererror")).toBeNull();
		expect(
			[...doc.querySelectorAll("url")].map((url) => [
				url.querySelector("loc")!.textContent,
				url.querySelector("lastmod")!.textContent,
			])
		).toEqual([
			["https://prunplanner.org/", "2026-10-20"],
			["https://prunplanner.org/imprint-tos", "2026-10-20"],
		]);
	});
});
