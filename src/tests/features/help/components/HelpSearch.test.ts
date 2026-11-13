import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import HelpSearch from "@/features/help/components/HelpSearch.vue";
import { takeHelpSource } from "@/features/help/helpSource";
import { mountComponent } from "@/tests/mountComponent";

const { trackEvent, push } = vi.hoisted(() => ({
	trackEvent: vi.fn(),
	push: vi.fn(),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackEvent,
	reportError: vi.fn(),
}));
vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	useRouter: () => ({ push }),
}));

// titles as in the app, so a title match counts
const messages = {
	help: {
		articles: {
			exchanges: { title: "Exchanges & CX preferences" },
			plan_production: { title: "Production & recipes" },
		},
		search: { ask: "Ask on {discord}." },
	},
};

async function mountSearch() {
	Element.prototype.scrollIntoView = vi.fn();
	const mounted = await mountComponent(
		HelpSearch,
		{ show: true, "onUpdate:show": vi.fn() },
		{ messages, attach: true }
	);
	await vi.waitFor(async () => {
		await flushPromises();
		expect(document.querySelector("input")).not.toBeNull();
	});
	const input = document.querySelector("input") as HTMLInputElement;
	const type = async (q: string) => {
		input.value = q;
		input.dispatchEvent(new Event("input"));
		await flushPromises();
	};
	const key = async (k: string) => {
		input.dispatchEvent(new KeyboardEvent("keydown", { key: k }));
		await flushPromises();
	};
	return { ...mounted, input, type, key };
}

describe("HelpSearch", () => {
	it("finds COGM, highlights it and opens the section on Enter", async () => {
		const { type, key, component } = await mountSearch();
		await vi.waitFor(async () => {
			await type("cogm");
			expect(
				document.querySelector("[data-testid=help-search-results]")
			).not.toBeNull();
		});

		const links = [
			...document.querySelectorAll("[data-testid=help-search-results] a"),
		];
		const hrefs = links.map((a) => a.getAttribute("href"));
		expect(hrefs).toContain("/help/exchanges#fixed-prices-and-cogm");
		expect(hrefs.some((h) => h?.startsWith("/help/plan_production"))).toBe(
			true
		);
		expect(document.querySelector("mark")?.textContent?.trim()).toMatch(
			/cogm/i
		);
		expect(links[0]!.getAttribute("aria-current")).toBe("true");

		await key("ArrowDown");
		expect(links[1]!.getAttribute("aria-current")).toBe("true");
		await key("ArrowUp");
		await key("ArrowUp");
		expect(links.at(-1)!.getAttribute("aria-current")).toBe("true");
		await key("ArrowDown");
		await key("Enter");

		expect(push).toHaveBeenCalledWith(links[0]!.getAttribute("href"));
		expect(takeHelpSource()).toBe("search");
		expect(component.emitted("update:show")?.at(-1)).toEqual([false]);
	});

	it("shows the empty state for nonsense, and tracks searches once typing stops", async () => {
		const { type } = await mountSearch();
		await vi.waitFor(async () => {
			await type("xqzzv");
			expect(
				document.querySelector("[data-testid=help-search-empty]")
			).not.toBeNull();
		});
		expect(trackEvent).not.toHaveBeenCalled();

		// 600 ms after the last key
		await vi.waitFor(
			() =>
				expect(trackEvent).toHaveBeenCalledWith("help:search", {
					query_length: 5,
					result_count: 0,
				}),
			{ timeout: 2000 }
		);
		expect(trackEvent).toHaveBeenCalledWith("help:search_no_results", {
			query_length: 5,
		});
		expect(
			document
				.querySelector("[data-testid=help-search-empty] a")
				?.getAttribute("href")
		).toBe("https://discord.gg/2MDR5DYSfY");
	});

	it("opens a result by click", async () => {
		const { type } = await mountSearch();
		await vi.waitFor(async () => {
			await type("versions");
			expect(
				document.querySelector("[data-testid=help-search-results] a")
			).not.toBeNull();
		});
		const first = document.querySelector(
			"[data-testid=help-search-results] a"
		) as HTMLElement;
		first.click();
		await flushPromises();
		expect(push).toHaveBeenCalledWith(first.getAttribute("href"));
	});
});
