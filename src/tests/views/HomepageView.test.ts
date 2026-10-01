import { describe, it, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { RouterLinkStub } from "@vue/test-utils";

import HomepageView from "@/views/HomepageView.vue";
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
});
