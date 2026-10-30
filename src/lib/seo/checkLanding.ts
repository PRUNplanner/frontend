import homepage from "@/locales/en_US/homepage.json";
import {
	EXAMPLE_PLAN_PATH,
	GITHUB_URL,
} from "@/features/homepage/homepage.constants";
import { SITE_URL } from "@/lib/seo/site";

const FAQ = ["what", "free", "fio", "try", "official", "languages"] as const;
const OG = [
	'meta[property="og:type"]',
	'meta[property="og:site_name"]',
	'meta[property="og:title"]',
	'meta[property="og:description"]',
	'meta[property="og:url"]',
	'meta[property="og:image"]',
	'meta[property="og:image:width"]',
	'meta[property="og:image:height"]',
	'meta[property="og:image:alt"]',
	'meta[name="twitter:card"]',
];

/**
 * What a crawler without JavaScript has to get from the build (landing
 * redesign criteria 17 to 19). The prerender fails the build on any of it.
 *
 * @returns {string[]} what is missing, empty when all is there
 */
export function checkLanding(
	indexHtml: string,
	robots: string,
	sitemap: string
): string[] {
	const errors: string[] = [];
	const expect = (ok: boolean, message: string) => ok || errors.push(message);
	const doc = new DOMParser().parseFromString(indexHtml, "text/html");
	const text = doc.body.textContent!.replace(/\s+/g, " ");
	const count = (selector: string) => doc.querySelectorAll(selector).length;

	// the page text
	const h1 = doc.querySelectorAll("#app h1");
	expect(h1.length === 1, `${h1.length} h1, not 1`);
	const title = homepage.hero.title.replace(
		"{accent}",
		homepage.hero.title_accent
	);
	expect(
		!!h1[0]?.textContent?.includes(title) &&
			h1[0].textContent.includes("Prosperous Universe"),
		"h1 without the claim or the game"
	);
	for (const [label, value] of [
		["positioning line", homepage.hero.positioning],
		["player count", "6,000+"],
		...FAQ.flatMap((key) => [
			[`FAQ question ${key}`, homepage.faq[key].question],
			[`FAQ answer ${key}`, homepage.faq[key].answer.split("{")[0]],
		]),
	])
		expect(text.includes(value), `no ${label}`);
	expect(
		count(`#app a[href="${EXAMPLE_PLAN_PATH}"]`) > 0,
		"no link to the example plan"
	);
	expect(count(`#app a[href="${GITHUB_URL}"]`) > 0, "no link to GitHub");

	// the head
	expect(count("title") === 1, "not exactly one <title>");
	expect(
		doc.title === homepage.seo.title,
		`title "${doc.title}", not the landing title`
	);
	expect(
		count('meta[name="description"]') === 1,
		"not exactly one description"
	);
	expect(
		doc
			.querySelector('meta[name="description"]')
			?.getAttribute("content") === homepage.seo.description,
		"description differs from homepage.seo.description"
	);
	expect(
		count('link[rel="canonical"]') === 1 &&
			doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ===
				`${SITE_URL}/`,
		"not exactly one canonical to /"
	);
	for (const selector of OG) expect(count(selector) === 1, `no ${selector}`);

	const types = [
		...doc.querySelectorAll('script[type="application/ld+json"]'),
	].map((script) => {
		try {
			return JSON.parse(script.textContent!)["@type"];
		} catch {
			return "invalid JSON";
		}
	});
	expect(
		types.join() === "WebSite,WebApplication",
		`JSON-LD blocks: ${types.join() || "none"}`
	);

	// robots and sitemap
	expect(
		robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`),
		"robots.txt names no sitemap"
	);
	const xml = new DOMParser().parseFromString(sitemap, "application/xml");
	expect(
		!xml.querySelector("parsererror") &&
			xml.querySelectorAll("url > loc").length > 0,
		"sitemap.xml is no valid sitemap"
	);

	return errors;
}
