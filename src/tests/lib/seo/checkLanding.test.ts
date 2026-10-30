import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";

import { checkLanding } from "@/lib/seo/checkLanding";
import { memoryStorage } from "@/tests/memoryStorage";
import { injectLanding, renderLanding } from "@/prerender";
import { SupportedLanguages } from "@/lib/i18n";

const read = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf-8");

const shell = read("../../../../index.html");
const robots = read("../../../../public/robots.txt");
const SITEMAP =
	'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://prunplanner.org/</loc></url></urlset>';

describe("index.html", () => {
	const doc = new DOMParser().parseFromString(shell, "text/html");
	const jsonLd = [
		...doc.querySelectorAll('script[type="application/ld+json"]'),
	].map((s) => JSON.parse(s.textContent!));

	it("names the game in the title and description", () => {
		expect(doc.title).toContain("Prosperous Universe");
		expect(
			doc
				.querySelector('meta[name="description"]')!
				.getAttribute("content")
		).toContain("Prosperous Universe (PrUn)");
	});

	it("drops keywords, language and author", () => {
		for (const name of ["keywords", "language", "author"])
			expect(doc.querySelector(`meta[name="${name}"]`)).toBeNull();
	});

	it("lists the supported languages and no rating in its JSON-LD", () => {
		const app = jsonLd.find((d) => d["@type"] === "WebApplication");
		expect(app.inLanguage).toEqual(
			SupportedLanguages.map((l) => String(l.value).replace("_", "-"))
		);
		expect(app.aggregateRating).toBeUndefined();
		expect(app.offers.price).toBe("0");
	});
});

describe("index.html's prerender check", () => {
	// the inline script that hides the landing page where it doesn't belong
	const check = new DOMParser()
		.parseFromString(shell, "text/html")
		.querySelector("head script:not([type])")!.textContent!;
	const hidden = (path: string, user?: object) => {
		document.documentElement.className = "";
		window.history.replaceState({}, "", path);
		vi.stubGlobal(
			"localStorage",
			memoryStorage(
				user ? { prunplanner_user: JSON.stringify(user) } : {}
			)
		);
		new Function(check)();
		return document.documentElement.classList.contains("skip-prerender");
	};

	const preload = () =>
		document.head.querySelector('link[rel="preload"][as="image"]');

	afterEach(() => {
		window.history.replaceState({}, "", "/");
		document.documentElement.className = "";
		preload()?.remove();
	});

	it.each([
		["/", undefined, false],
		["/", { preferences: { locale: "en_US" } }, false],
		["/market", undefined, true],
		["/shared/abc", undefined, true],
		["/", { accessToken: "a", refreshToken: "r" }, true],
		["/", { preferences: { locale: "de_DE" } }, true],
	])("on %s with %o hides it: %s", (path, user, hide) => {
		expect(hidden(path, user)).toBe(hide);
	});

	it("preloads the hero image only where the landing page shows", async () => {
		hidden("/market");
		expect(preload()).toBeNull();
		hidden("/", { accessToken: "a", refreshToken: "r" });
		expect(preload()).toBeNull();

		hidden("/");
		const link = preload()!;
		expect(link.getAttribute("fetchpriority")).toBe("high");
		// the same candidates as the hero's img, so the preload is used
		const { html } = await renderLanding();
		const img = new DOMParser()
			.parseFromString(html, "text/html")
			.querySelector('img[fetchpriority="high"]')!;
		expect(link.getAttribute("imagesrcset")).toBe(
			img.getAttribute("srcset")
		);
		expect(link.getAttribute("imagesizes")).toBe(img.getAttribute("sizes"));
	});

	it("still hides it off / when storage is unreadable", () => {
		const blocked = () => {
			document.documentElement.className = "";
			vi.stubGlobal("localStorage", {
				getItem: () => {
					throw new Error("blocked");
				},
			});
			new Function(check)();
			return document.documentElement.classList.contains(
				"skip-prerender"
			);
		};
		window.history.replaceState({}, "", "/market");
		expect(blocked()).toBe(true);
		window.history.replaceState({}, "", "/");
		expect(blocked()).toBe(false);
	});
});

describe("checkLanding", () => {
	let index: string;

	beforeAll(async () => {
		const { html, teleports } = await renderLanding();
		index = injectLanding(shell, html, teleports);
	});

	it("passes the prerendered landing page", () => {
		expect(checkLanding(index, robots, SITEMAP)).toEqual([]);
	});

	it("names what a crawler would miss", () => {
		const broken = index
			.replace(/<h1[\s\S]*?<\/h1>/, "")
			.replace(/<link rel="canonical"[^>]*>/, "")
			.replace(/<meta property="og:type"[^>]*>/, "")
			.replace(
				/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
				""
			)
			.replace("<title>", "<title>x ");

		expect(checkLanding(broken, "", "<urlset>")).toEqual([
			"0 h1, not 1",
			"h1 without the claim or the game",
			expect.stringContaining('title "x'),
			"not exactly one canonical to /",
			'no meta[property="og:type"]',
			"JSON-LD blocks: WebApplication",
			"robots.txt names no sitemap",
			"sitemap.xml is no valid sitemap",
		]);
	});

	it("reports missing page text, links and a doubled description", () => {
		const broken = index
			.replaceAll("6,000+", "6000")
			.replaceAll('href="/shared/', 'href="/x/')
			.replace(
				"</head>",
				'<meta name="description" content="again"></head>'
			)
			.replace(
				/<script type="application\/ld\+json">/,
				'<script type="application/ld+json">{'
			);

		expect(checkLanding(broken, robots, SITEMAP)).toEqual([
			"no player count",
			"no link to the example plan",
			"not exactly one description",
			"JSON-LD blocks: invalid JSON,WebApplication",
		]);
	});
});
