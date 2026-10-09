import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia, type Pinia } from "pinia";

import SharedPlanBanner from "@/features/sharing/components/SharedPlanBanner.vue";
import { useAuthPanel } from "@/features/account/useAuthPanel";
import { useUserStore } from "@/stores/userStore";
import { mountComponent } from "@/tests/mountComponent";

const SAVE = "sharing.banner.save";
const SIGNUP = "sharing.banner.signup";
const LOGIN = "homepage.navigation.login";
const RESET = "sharing.banner.reset";
const COPY = "sharing.banner.copy";

describe("SharedPlanBanner", () => {
	let pinia: Pinia;
	const panel = useAuthPanel();

	async function mountBanner(props = {}) {
		const { wrapper, component } = await mountComponent(
			SharedPlanBanner,
			{ priceSource: "universe", ...props },
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

	it("says it is a copy and which prices it uses", async () => {
		const { wrapper, button } = await mountBanner();

		expect(wrapper.text()).toContain("sharing.banner.title");
		expect(wrapper.text()).toContain("sharing.banner.info");
		expect(wrapper.text()).toContain("sharing.banner.prices");
		expect(wrapper.text()).toContain("sharing.banner.prices_hint");
		// nothing to reset or copy yet
		expect(button(RESET)).toBeUndefined();
		expect(button(COPY)).toBeUndefined();
	});

	it("offers visitors an account and opens the header panels", async () => {
		const { button } = await mountBanner();

		expect(button(SAVE)).toBeUndefined();

		await button(SIGNUP)!.trigger("click");
		expect(panel.showRegistration.value).toBe(true);

		await button(LOGIN)!.trigger("click");
		expect(panel.showLogin.value).toBe(true);
		expect(panel.showRegistration.value).toBe(false);
	});

	it("lets a logged in viewer save the copy", async () => {
		useUserStore().setToken("access", "refresh");
		const { component, button } = await mountBanner();

		expect(button(SIGNUP)).toBeUndefined();
		await button(SAVE)!.trigger("click");
		expect(component.emitted("save")).toHaveLength(1);
	});

	it("offers reset and copy once changed", async () => {
		const { wrapper, component, button } = await mountBanner({
			changed: true,
		});

		expect(wrapper.text()).toContain("sharing.banner.changed");
		await button(RESET)!.trigger("click");
		await button(COPY)!.trigger("click");
		expect(component.emitted("reset")).toHaveLength(1);
		expect(component.emitted("copy")).toHaveLength(1);
	});
});
