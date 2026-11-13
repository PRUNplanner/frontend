import { describe, expect, it, vi } from "vitest";

import HelpArticle from "@/features/help/components/HelpArticle.vue";
import HelpFeedback from "@/features/help/components/HelpFeedback.vue";
import HelpWelcome from "@/features/help/components/HelpWelcome.vue";
import { getArticle } from "@/features/help/helpArticles";
import planCheck from "@/assets/help/en_US/plan_check.md?help";
import { mountComponent } from "@/tests/mountComponent";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	useRouter: () => router,
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/analytics/usePostHog", () => ({ capture: vi.fn() }));

const article = getArticle("plan_check")!;

describe("HelpArticle", () => {
	it("renders the meta line, the article and its related links", async () => {
		const { wrapper } = await mountComponent(HelpArticle, {
			article,
			doc: planCheck,
		});

		expect(wrapper.find("[data-testid=help-meta]").text()).toContain(
			"help.article.updated_in"
		);
		const body = wrapper.find("[data-testid=help-body]");
		expect(body.find("h2#flags").text()).toBe("What the flags mean");
		expect(wrapper.text()).toContain("help.articles.exchanges.title");
		expect(wrapper.findComponent(HelpFeedback).props("article")).toBe(
			"plan_check"
		);
		expect(wrapper.text()).not.toContain("help.article.fallback");
	});

	it("says when it shows the English text, and hides Related in the panel", async () => {
		const { wrapper } = await mountComponent(HelpArticle, {
			article,
			doc: planCheck,
			isFallback: true,
			inPanel: true,
		});
		expect(wrapper.text()).toContain("help.article.fallback");
		expect(wrapper.text()).not.toContain("help.article.related");
	});

	it("scrolls to its section", async () => {
		const scroll = vi.fn();
		Element.prototype.scrollIntoView = scroll;
		const { wrapper, setProps } = await mountComponent(HelpArticle, {
			article,
			doc: planCheck,
			section: "flags",
		});
		expect(scroll.mock.contexts.at(-1)).toBe(
			wrapper.find("#flags").element
		);
		await setProps({ section: "target-price" });
		expect(scroll.mock.contexts.at(-1)).toBe(
			wrapper.find("#target-price").element
		);
	});

	it("starts an unknown section at the top", async () => {
		Element.prototype.scrollIntoView = vi.fn();
		const top = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		await mountComponent(HelpArticle, {
			article,
			doc: planCheck,
			section: "nope",
		});
		expect(top).toHaveBeenCalledWith({ top: 0 });
	});

	it("routes in-app links and scrolls to anchors in the panel", async () => {
		const scroll = vi.fn();
		Element.prototype.scrollIntoView = scroll;
		const doc = {
			...planCheck!,
			html: '<p><a href="/help/exchanges">x</a> <a href="#flags">y</a> <a href="https://x.org">z</a></p><h2 id="flags">F</h2>',
		};
		const { wrapper, component } = await mountComponent(HelpArticle, {
			article,
			doc,
			inPanel: true,
		});
		const links = wrapper.findAll("[data-testid=help-body] a");
		await links[0]!.trigger("click");
		expect(router.push).toHaveBeenCalledWith("/help/exchanges");
		expect(component.emitted("navigate")).toHaveLength(1);

		await links[1]!.trigger("click");
		expect(scroll.mock.contexts.at(-1)).toBe(
			wrapper.find("#flags").element
		);

		router.push.mockClear();
		await links[2]!.trigger("click");
		expect(router.push).not.toHaveBeenCalled();
	});

	it("pushes the hash for an anchor on the page", async () => {
		const doc = { ...planCheck!, html: '<a href="#flags">y</a>' };
		const { wrapper } = await mountComponent(HelpArticle, { article, doc });
		await wrapper.find("[data-testid=help-body] a").trigger("click");
		expect(router.push).toHaveBeenCalledWith({ hash: "#flags" });
	});

	it("renders the Welcome article from its component", async () => {
		const { wrapper } = await mountComponent(HelpArticle, {
			article: getArticle("help_welcome")!,
			doc: null,
		});
		expect(wrapper.findComponent(HelpWelcome).exists()).toBe(true);
		expect(wrapper.text()).not.toContain("help.article.read_time");
	});
});
