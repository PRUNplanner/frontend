import { describe, it, expect, vi } from "vitest";

import { apiService } from "@/lib/apiService";
import { trackEvent, trackPageview } from "@/lib/analytics/useAnalytics";
import {
	checkLanding,
	injectLanding,
	renderLanding,
	renderSitemap,
} from "@/prerender";

vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: vi.fn(),
	trackPageview: vi.fn(),
}));

const SHELL = `<!DOCTYPE html><html><head><title>t</title>
		<link rel="canonical" href="https://prunplanner.org/" />
		<script type="module" crossorigin src="/assets/index.abc.js"></script>
		<link rel="modulepreload" crossorigin href="/assets/chunks/vendor_vue.abc.js">
	</head><body><div id="app"></div></body></html>`;

describe("prerender", () => {
	it("renders the logged-out landing page in English, without events or requests", async () => {
		const get = vi.spyOn(apiService, "get");
		const { html, teleports } = await renderLanding();
		const doc = new DOMParser().parseFromString(html, "text/html");

		expect(doc.querySelectorAll("h1")).toHaveLength(1);
		expect(doc.querySelector("h1")!.textContent).toContain(
			"Plan a base before you build it."
		);
		expect(doc.querySelectorAll("#faq details")).toHaveLength(6);
		// the auth panel is closed, the tours on their first step
		expect(doc.querySelector("[role=dialog]")).toBeNull();
		expect(
			doc.querySelector('[role=group] button[aria-pressed="true"]')!.textContent
		).toContain("01");
		// confirm host, toast host, drawer: the order the client hydrates
		// them in <body> (HomepageHeader, async, comes last on both sides)
		const parts = teleports.split("<!--teleport start anchor-->").slice(1);
		expect(parts).toHaveLength(3);
		expect(parts[1]).toContain("ptoast-host");
		expect(trackEvent).not.toHaveBeenCalled();
		expect(get).not.toHaveBeenCalled();
		// the router records its pageview; PostHog never starts in the
		// prerender, so capture() drops it
		expect(vi.mocked(trackPageview).mock.calls.flat()).toEqual(["homepage"]);
	});

	it("puts the markup into #app and the teleports first in <body>", () => {
		const index = injectLanding(
			SHELL,
			"<h1>landing</h1>",
			"<!--teleport anchor-->"
		);

		expect(index).toContain(
			'<body><!--teleport anchor--><div id="app" data-prerendered><h1>landing</h1></div>'
		);
		expect(index).toContain('rel="canonical"');
	});

	it("starts the scripts after the first paint, without modulepreloads", () => {
		const index = injectLanding(SHELL, "<h1>landing</h1>");

		expect(index).not.toContain("modulepreload");
		expect(index).not.toContain('<script type="module"');
		expect(index).toContain('e.src="/assets/index.abc.js"');
		expect(index).toContain("first-contentful-paint");
	});

	it("starts right away where the landing page is hidden, once the page is parsed", () => {
		const appended = vi
			.spyOn(document.head, "appendChild")
			.mockImplementation((n) => n);
		const state = vi
			.spyOn(document, "readyState", "get")
			.mockReturnValue("loading");
		document.documentElement.classList.add("skip-prerender");
		const index = injectLanding(SHELL, "");

		new Function(index.match(/<script>(.*?)<\/script>/)![1])();
		expect(appended).not.toHaveBeenCalled();
		document.dispatchEvent(new Event("DOMContentLoaded"));

		expect(appended).toHaveBeenCalledTimes(1);
		document.documentElement.classList.remove("skip-prerender");
		state.mockRestore();
		appended.mockRestore();
	});

	it("loads the entry once, after the first paint or the fallback timer", () => {
		vi.useFakeTimers();
		const appended = vi
			.spyOn(document.head, "appendChild")
			.mockImplementation((n) => n);
		// the paint observer: reports a first paint, then the timer runs out
		let report!: (list: { getEntriesByName: (n: string) => unknown[] }) => void;
		vi.stubGlobal(
			"PerformanceObserver",
			class {
				constructor(cb: typeof report) {
					report = cb;
				}
				observe() {}
			}
		);
		const index = injectLanding(SHELL, "");
		const loader = index.match(/<script>(.*?)<\/script>/)![1];

		new Function(loader)();
		report({ getEntriesByName: () => [] });
		expect(appended).not.toHaveBeenCalled();
		report({ getEntriesByName: () => [{}] });
		vi.advanceTimersByTime(1000);

		expect(appended).toHaveBeenCalledTimes(1);
		const script = appended.mock.calls[0][0] as HTMLScriptElement;
		expect(script.type).toBe("module");
		expect(script.getAttribute("src")).toBe("/assets/index.abc.js");
		appended.mockRestore();
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it("refuses a shell without a body or a module entry", () => {
		expect(() => injectLanding('<div id="app"></div>', "x")).toThrow(
			"no <body>"
		);
		expect(() =>
			injectLanding('<body><div id="app"></div></body>', "x")
		).toThrow("no module entry");
	});

	it("refuses a shell without an empty #app", () => {
		expect(() => injectLanding("<html></html>", "x")).toThrow("no empty #app");
	});

	it("lists the indexable routes in the sitemap", () => {
		const xml = renderSitemap(new Date("2026-10-20"));

		expect(
			[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort()
		).toEqual([
			"https://prunplanner.org/",
			"https://prunplanner.org/imprint-tos",
			"https://prunplanner.org/market",
		]);
	});

	it("exports the build check", () => {
		expect(checkLanding).toBeTypeOf("function");
	});
});
