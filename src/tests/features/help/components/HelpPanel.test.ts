import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import HelpPanel from "@/features/help/components/HelpPanel.vue";
import HelpArticle from "@/features/help/components/HelpArticle.vue";
import { mountComponent } from "@/tests/mountComponent";

const { trackEvent, reportError } = vi.hoisted(() => ({
	trackEvent: vi.fn(),
	reportError: vi.fn(),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent, reportError }));
vi.mock("@/lib/analytics/usePostHog", () => ({ capture: vi.fn() }));
vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	useRouter: () => ({ push: vi.fn() }),
}));

const panel = () => document.querySelector("[data-testid=help-panel]");

async function open(props: Record<string, unknown>) {
	Element.prototype.scrollIntoView = vi.fn();
	const mounted = await mountComponent(HelpPanel, props, { attach: true });
	const button = mounted.wrapper.find("button");
	(button.element as HTMLButtonElement).focus();
	await button.trigger("click");
	await flushPromises();
	await vi.waitFor(() =>
		expect(mounted.wrapper.findComponent(HelpArticle).exists()).toBe(true)
	);
	return { ...mounted, button };
}

describe("HelpPanel", () => {
	it("opens its article at the section, tracked", async () => {
		const { wrapper } = await open({
			article: "plan_check",
			section: "flags",
		});

		expect(trackEvent).toHaveBeenCalledWith("help:panel_open", {
			article: "plan_check",
			section: "flags",
		});
		expect(trackEvent).toHaveBeenCalledWith("help:article_view", {
			article: "plan_check",
			section: "flags",
			source: "panel",
			is_fallback_locale: false,
		});
		const article = wrapper.findComponent(HelpArticle);
		expect(article.props("section")).toBe("flags");
		expect(article.props("inPanel")).toBe(true);
		expect(panel()!.querySelector("#flags")).not.toBeNull();
	});

	it("links to the same section in the help centre", async () => {
		const { wrapper } = await open({
			article: "plan_check",
			section: "flags",
		});
		const link = wrapper
			.findAllComponents({ name: "RouterLinkStub" })
			.find((l) => l.text() === "help.panel.open_in_centre")!;
		expect(link.props("to")).toBe("/help/plan_check#flags");
	});

	it("switches to a sibling of the plan page with its chips", async () => {
		const { wrapper } = await open({
			article: "plan_check",
			section: "flags",
		});
		const chips = [
			...panel()!.querySelectorAll("[data-testid=help-chips] button"),
		];
		expect(chips.map((c) => c.textContent?.trim())).toEqual([
			"help.articles.plan_layout.title",
			"help.articles.plan_results.title",
			"help.articles.plan_production.title",
			"help.articles.plan_saving.title",
			"help.articles.plan_check.title",
		]);
		expect(chips[4]!.getAttribute("aria-current")).toBe("page");

		(chips[0] as HTMLButtonElement).click();
		await flushPromises();
		await vi.waitFor(() =>
			expect(wrapper.findComponent(HelpArticle).props("article").id).toBe(
				"plan_layout"
			)
		);
		expect(
			wrapper.findComponent(HelpArticle).props("section")
		).toBeUndefined();
	});

	it("has no chips outside the plan page", async () => {
		await open({ article: "exchanges" });
		expect(panel()!.querySelector("[data-testid=help-chips]")).toBeNull();
	});

	it("gives focus back to the Help button when it closes", async () => {
		const { button } = await open({ article: "exchanges" });
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		await flushPromises();
		await vi.waitFor(() =>
			expect(document.activeElement).toBe(button.element)
		);
	});

	it("reports an unknown article", async () => {
		const { wrapper } = await mountComponent(HelpPanel, {
			article: "nope",
		});
		await wrapper.find("button").trigger("click");
		await flushPromises();
		expect(reportError).toHaveBeenCalled();
		expect(panel()!.textContent).toContain("help.article.not_found");
	});
});
