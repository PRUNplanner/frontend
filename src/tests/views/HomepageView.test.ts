import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { RouterLinkStub } from "@vue/test-utils";

import HomepageView from "@/views/HomepageView.vue";
import HomepageLanguage from "@/layout/components/HomepageLanguage.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { useAuthPanel } from "@/features/account/useAuthPanel";
import { useUserStore } from "@/stores/userStore";
import { mountComponent } from "@/tests/mountComponent";

describe("HomepageView", () => {
	let pinia: Pinia;
	const panel = useAuthPanel();

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		panel.close();
	});

	afterEach(() => vi.restoreAllMocks());

	it("has one hero CTA that opens the registration panel", async () => {
		const { wrapper } = await mountComponent(HomepageView, {}, { pinia });

		const cta = wrapper.findAll("[data-cta]");
		expect(cta).toHaveLength(1);
		expect(cta[0].text()).toBe("homepage.hero.cta");

		await cta[0].trigger("click");
		expect(panel.showRegistration.value).toBe(true);
	});

	it("links 'How it works' to the setup section", async () => {
		const { wrapper } = await mountComponent(HomepageView, {}, { pinia });

		const how = wrapper
			.findAll("a")
			.find((a) => a.text().startsWith("homepage.hero.how"))!;
		expect(how.attributes("href")).toBe("#how");
		expect(wrapper.find("section#how").exists()).toBe(true);
	});

	it("sends a logged in user to the empire", async () => {
		useUserStore().setToken("access", "refresh");
		const { wrapper } = await mountComponent(HomepageView, {}, { pinia });

		const cta = wrapper.findAll("[data-cta]");
		expect(cta).toHaveLength(1);
		expect(cta[0].text()).toBe("homepage.hero.cta_logged_in");
		expect(
			wrapper.findAllComponents(RouterLinkStub).map((l) => l.props("to"))
		).toContain("/empire");
	});

	it.each([
		["en-US", false],
		["en", false],
		["de-DE", true],
	])(
		"with browser language %s shows the translation banner: %s",
		async (language, banner) => {
			vi.spyOn(navigator, "language", "get").mockReturnValue(language);
			const { wrapper } = await mountComponent(HomepageView, {}, { pinia });

			expect(wrapper.findComponent(HomepageLanguage).exists()).toBe(banner);
			// the footer select is always there
			expect(wrapper.findAllComponents(PSelect)).toHaveLength(banner ? 2 : 1);
		}
	);

	it("hides the translation banner when the active locale is the browser's", async () => {
		vi.spyOn(navigator, "language", "get").mockReturnValue("de-DE");
		useUserStore().preferences.locale = "de_DE";
		const { wrapper } = await mountComponent(HomepageView, {}, { pinia });

		expect(wrapper.findComponent(HomepageLanguage).exists()).toBe(false);
	});
});
