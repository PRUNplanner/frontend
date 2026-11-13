import { describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import { flushPromises } from "@vue/test-utils";

import HelpArticleView from "@/views/HelpArticleView.vue";
import HelpArticle from "@/features/help/components/HelpArticle.vue";
import HelpToc from "@/features/help/components/HelpToc.vue";
import { markHelpSource } from "@/features/help/helpSource";
import { mountComponent } from "@/tests/mountComponent";

const { head, trackEvent, route, history } = vi.hoisted(() => ({
	head: { useHead: vi.fn() },
	trackEvent: vi.fn(),
	route: { params: { article: "plan_check" }, hash: "#flags" },
	history: { state: { back: null as string | null } },
}));
vi.mock("@unhead/vue", () => head);
vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackEvent,
	reportError: vi.fn(),
}));
vi.mock("@/lib/analytics/usePostHog", () => ({ capture: vi.fn() }));
const reactiveRoute = reactive(route);
vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	useRoute: () => reactiveRoute,
	useRouter: () => ({ push: vi.fn(), options: { history } }),
}));

async function mountView(options: Parameters<typeof mountComponent>[2] = {}) {
	Element.prototype.scrollIntoView = vi.fn();
	const mounted = await mountComponent(HelpArticleView, {}, options);
	await vi.waitFor(async () => {
		await flushPromises();
		expect(mounted.wrapper.findComponent(HelpArticle).exists()).toBe(true);
	});
	return mounted;
}

describe("HelpArticleView", () => {
	it("shows the article with breadcrumbs, contents and its neighbours", async () => {
		reactiveRoute.params.article = "plan_check";
		reactiveRoute.hash = "#flags";
		const { wrapper } = await mountView();

		expect(wrapper.find("h1").text()).toBe(
			"help.articles.plan_check.title"
		);
		expect(wrapper.find("nav").text()).toContain("help.parents.plan");
		const article = wrapper.findComponent(HelpArticle);
		expect(article.props("section")).toBe("flags");
		const toc = wrapper.findAllComponents(HelpToc);
		expect(toc[0]!.props("toc").map((t: { id: string }) => t.id)).toContain(
			"flags"
		);
		const links = wrapper
			.findAllComponents({ name: "RouterLinkStub" })
			.map((l) => l.props("to"));
		expect(links).toContain("/help/plan_saving");
		expect(links).toContain("/help/empire");

		const useHead = head.useHead.mock.calls[0]![0];
		expect(useHead.title.value).toBe("help.articles.plan_check.title");
		expect(useHead.meta[0].content.value).toMatch(
			/^Plan check tests a plan/
		);
	});

	it("tracks a direct visit, then the source of the next one", async () => {
		reactiveRoute.params.article = "plan_check";
		reactiveRoute.hash = "#flags";
		await mountView();
		expect(trackEvent).toHaveBeenCalledWith("help:article_view", {
			article: "plan_check",
			section: "flags",
			source: "direct",
			is_fallback_locale: false,
		});

		markHelpSource("nav");
		reactiveRoute.hash = "";
		reactiveRoute.params.article = "exchanges";
		await vi.waitFor(async () => {
			await flushPromises();
			expect(trackEvent).toHaveBeenCalledWith("help:article_view", {
				article: "exchanges",
				section: undefined,
				source: "nav",
				is_fallback_locale: false,
			});
		});

		history.state.back = "/empire";
		reactiveRoute.params.article = "empire";
		await vi.waitFor(async () => {
			await flushPromises();
			expect(trackEvent).toHaveBeenLastCalledWith(
				"help:article_view",
				expect.objectContaining({ article: "empire", source: "link" })
			);
		});
	});

	it("shows English where the locale has no file", async () => {
		reactiveRoute.params.article = "plan_check";
		const { wrapper } = await mountView({ locale: "de_DE" });
		expect(wrapper.findComponent(HelpArticle).props("isFallback")).toBe(
			true
		);
	});

	it("marks the section in view", async () => {
		reactiveRoute.params.article = "plan_check";
		reactiveRoute.hash = "";
		const { wrapper } = await mountView({ attach: true });
		// headings below the window, up to the flags
		const ids = ["market-check", "flags"];
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
			function (this: Element) {
				return { top: ids.includes(this.id) ? 10 : 900 } as DOMRect;
			}
		);
		window.dispatchEvent(new Event("scroll"));
		await flushPromises();
		expect(wrapper.findAllComponents(HelpToc)[0]!.props("active")).toBe(
			"flags"
		);
	});
});
