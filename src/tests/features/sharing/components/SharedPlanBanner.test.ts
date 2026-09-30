import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia, type Pinia } from "pinia";

import SharedPlanBanner from "@/features/sharing/components/SharedPlanBanner.vue";
import { useAuthPanel } from "@/features/account/useAuthPanel";
import { useUserStore } from "@/stores/userStore";
import { mountComponent } from "@/tests/mountComponent";

const CLONE = "common.buttons.clone_plan";
const REGISTER = "homepage.navigation.registration";
const LOGIN = "homepage.navigation.login";

describe("SharedPlanBanner", () => {
	let pinia: Pinia;
	const panel = useAuthPanel();

	async function mountBanner(props = {}) {
		const { wrapper, component } = await mountComponent(
			SharedPlanBanner,
			props,
			{ pinia }
		);
		const button = (text: string) =>
			wrapper.findAll("button").find((b) => b.text() === text);
		return { wrapper, component, button };
	}

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		panel.close();
		window.scrollTo = vi.fn();
	});

	it("says the plan is read-only and which prices it uses", async () => {
		const { wrapper } = await mountBanner();

		expect(wrapper.text()).toContain("sharing.banner.title");
		expect(wrapper.text()).toContain("sharing.banner.info");
	});

	it("offers visitors an account and opens the header panels", async () => {
		const { wrapper, button } = await mountBanner();

		expect(wrapper.text()).toContain("sharing.banner.signup_hint");
		expect(button(CLONE)).toBeUndefined();

		await button(REGISTER)!.trigger("click");
		expect(panel.showRegistration.value).toBe(true);

		await button(LOGIN)!.trigger("click");
		expect(panel.showLogin.value).toBe(true);
		expect(panel.showRegistration.value).toBe(false);
	});

	it("lets a logged in user clone, once", async () => {
		useUserStore().setToken("access", "refresh");
		const { component, button } = await mountBanner();

		expect(button(REGISTER)).toBeUndefined();
		await button(CLONE)!.trigger("click");
		expect(component.emitted("clone")).toHaveLength(1);

		const done = await mountBanner({ cloned: true });
		expect(
			done.button("common.buttons.clone_complete")!.element.disabled
		).toBe(true);
	});
});
