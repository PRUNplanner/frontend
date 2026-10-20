import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { RouterLinkStub } from "@vue/test-utils";

import HomepageView from "@/views/HomepageView.vue";
import HomepageLanguage from "@/layout/components/HomepageLanguage.vue";
import HomepageTour from "@/features/homepage/components/HomepageTour.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { useAuthPanel } from "@/features/account/useAuthPanel";
import { useUserStore } from "@/stores/userStore";
import { SupportedLanguages } from "@/lib/i18n";
import { EXAMPLE_PLAN_PATH } from "@/features/homepage/homepage.constants";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import homepage from "@/locales/en_US/homepage.json";
import { mountComponent } from "@/tests/mountComponent";

const head = vi.hoisted(() => ({ useHead: vi.fn() }));
vi.mock("@unhead/vue", () => head);
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

describe("HomepageView", () => {
	let pinia: Pinia;
	const panel = useAuthPanel();
	const mount = (messages?: Record<string, unknown>) =>
		mountComponent(HomepageView, {}, { pinia, messages });

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		panel.close();
		vi.mocked(trackEvent).mockClear();
		window.scrollTo = vi.fn();
	});

	afterEach(() => vi.restoreAllMocks());

	it("keeps its full title, without the title template", async () => {
		await mount();

		const { title, titleTemplate } = head.useHead.mock.lastCall![0];
		expect(title()).toBe("homepage.seo.title");
		expect(titleTemplate).toBe("%s");
	});

	it("has one h1 that names the game, one primary hero CTA and no blue button", async () => {
		const { wrapper } = await mount({ homepage });

		const h1 = wrapper.findAll("h1");
		expect(h1).toHaveLength(1);
		expect(h1[0].text()).toContain("Prosperous Universe");
		expect(h1[0].text()).toContain("Plan a base before you build it.");
		expect(wrapper.findAll("[data-cta]")).toHaveLength(1);
		expect(wrapper.html()).not.toContain("bg-primary");
	});

	it.each([
		["[data-cta]", "hero"],
		["[data-closing-cta]", "closing"],
	])("%s opens the registration panel where the page is", async (selector, source) => {
		const { wrapper } = await mount();

		await wrapper.find(selector).trigger("click");

		expect(panel.showRegistration.value).toBe(true);
		expect(window.scrollTo).not.toHaveBeenCalled();
		expect(trackEvent).toHaveBeenCalledWith("landing:auth_open", {
			panel: "registration",
			source,
		});
	});

	it("links the example plan twice and tracks each link", async () => {
		const { wrapper } = await mount();

		const links = wrapper
			.findAllComponents(RouterLinkStub)
			.filter((l) => l.props("to") === EXAMPLE_PLAN_PATH);
		expect(links).toHaveLength(2);

		await links[0].trigger("click");
		await links[1].trigger("click");
		expect(vi.mocked(trackEvent).mock.calls).toEqual([
			["landing:example_open", { source: "hero" }],
			["landing:example_open", { source: "shared_plans" }],
		]);
	});

	it("sends a logged in user to the empire, without sign-up prompts", async () => {
		useUserStore().setToken("access", "refresh");
		const { wrapper } = await mount();

		const cta = wrapper.findAll("[data-cta]");
		expect(cta).toHaveLength(1);
		expect(cta[0].text()).toBe("homepage.hero.cta_logged_in");
		expect(
			wrapper.findAllComponents(RouterLinkStub).map((l) => l.props("to"))
		).toContain("/empire");
		expect(wrapper.find("[data-closing-cta]").exists()).toBe(false);
		expect(wrapper.text()).not.toContain("homepage.hero.example_note");
	});

	it("shows the numbers, the language count from the supported languages", async () => {
		const { wrapper } = await mount({ homepage });

		const cells = wrapper.findAll("[data-number]").map((c) => c.text());
		expect(cells).toHaveLength(4);
		expect(cells[0]).toContain("6,000+");
		expect(cells[1]).toContain("40,000+");
		expect(cells[3]).toContain(`${SupportedLanguages.length} languages`);
		expect(wrapper.text()).toContain(
			`English and ${SupportedLanguages.length - 1} more`
		);
		expect(wrapper.text()).toContain("Over 6,000 players already do.");
	});

	it("has three tours, eight tools and six FAQ answers in the DOM while closed", async () => {
		const { wrapper } = await mount();

		expect(
			wrapper.findAllComponents(HomepageTour).map((t) => t.props("name"))
		).toEqual(["plan", "planet_search", "empire"]);
		expect(wrapper.findAll("[data-tool] h3")).toHaveLength(8);
		const faq = wrapper.findAll("#faq details");
		expect(faq).toHaveLength(6);
		faq.forEach((item) => {
			expect(item.attributes("open")).toBeUndefined();
			expect(item.find("summary h3").exists()).toBe(true);
			expect(item.find("p").text()).toMatch(/^homepage\.faq\..+\.answer$/);
		});
	});

	it("swaps the set-up shot with the selected step", async () => {
		const { wrapper } = await mount();
		const steps = wrapper.findAll("#how [role=group] button");
		const shot = () => wrapper.find("#how img").attributes("src");
		expect(steps[0].attributes("aria-pressed")).toBe("true");
		expect(shot()).toBe("/images/homepage/plan.webp");

		await steps[2].trigger("click");

		expect(steps[2].attributes("aria-pressed")).toBe("true");
		expect(steps[0].attributes("aria-pressed")).toBe("false");
		expect(shot()).toBe("/images/homepage/exchanges.webp");
	});

	it.each([
		["en-US", false],
		["en", false],
		["de-DE", true],
	])(
		"with browser language %s shows the translation banner: %s",
		async (language, banner) => {
			vi.spyOn(navigator, "language", "get").mockReturnValue(language);
			const { wrapper } = await mount();

			expect(wrapper.findComponent(HomepageLanguage).exists()).toBe(banner);
			// the footer select is always there
			expect(wrapper.findAllComponents(PSelect)).toHaveLength(banner ? 2 : 1);
		}
	);

	it("hides the translation banner when the active locale is the browser's", async () => {
		vi.spyOn(navigator, "language", "get").mockReturnValue("de-DE");
		useUserStore().preferences.locale = "de_DE";
		const { wrapper } = await mount();

		expect(wrapper.findComponent(HomepageLanguage).exists()).toBe(false);
	});
});
