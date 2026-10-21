import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, RouterLinkStub } from "@vue/test-utils";

import HomepageHeader from "@/layout/components/HomepageHeader.vue";
import LoginComponent from "@/features/account/components/LoginComponent.vue";
import RegistrationComponent from "@/features/account/components/RegistrationComponent.vue";
import { PDrawer } from "@/ui";
import { useAuthPanel } from "@/features/account/useAuthPanel";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { prefetchMarketReport } from "@/features/market_report/marketReportPrefetch.util";
import { mountComponent } from "@/tests/mountComponent";

const route = vi.hoisted(() => ({ name: "homepage" as string }));
vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	useRoute: () => route,
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/market_report/marketReportPrefetch.util", () => ({
	prefetchMarketReport: vi.fn(),
}));

// the forms have their own tests: only their presence matters here
vi.mock("@/features/account/components/LoginComponent.vue", () => ({
	default: {
		name: "LoginComponent",
		template: "<p>login form <input aria-label='username' /></p>",
	},
}));
vi.mock("@/features/account/components/RegistrationComponent.vue", () => ({
	default: {
		name: "RegistrationComponent",
		emits: ["login"],
		template: "<p>registration form</p>",
	},
}));

describe("HomepageHeader", () => {
	const panel = useAuthPanel();

	beforeEach(() => {
		panel.close();
		route.name = "homepage";
		vi.mocked(trackEvent).mockClear();
	});

	// the forms load with the panel
	const forms = async (
		wrapper: Awaited<ReturnType<typeof mountComponent>>["wrapper"]
	) => {
		await vi.dynamicImportSettled();
		await flushPromises();
		return [
			wrapper.findComponent(LoginComponent).exists(),
			wrapper.findComponent(RegistrationComponent).exists(),
		];
	};

	it("opens the panel on the form of the header button, the same button closes it", async () => {
		const { wrapper } = await mountComponent(HomepageHeader);
		const drawer = wrapper.findComponent(PDrawer);
		expect(drawer.props("show")).toBe(false);

		await wrapper.find("[data-login]").trigger("click");
		// opens once its forms have loaded
		expect(await forms(wrapper)).toEqual([true, false]);
		expect(drawer.props("show")).toBe(true);

		await wrapper.find("[data-registration]").trigger("click");
		expect(await forms(wrapper)).toEqual([false, true]);

		await wrapper.find("[data-registration]").trigger("click");
		expect(drawer.props("show")).toBe(false);
		expect(trackEvent).toHaveBeenCalledWith("landing:auth_open", {
			panel: "login",
			source: "header",
		});
	});

	it("opens the panel with its form loaded, on the form's first field", async () => {
		const { wrapper } = await mountComponent(HomepageHeader);

		await wrapper.find("[data-login]").trigger("click");
		await vi.dynamicImportSettled();
		await flushPromises();

		expect(wrapper.findComponent(PDrawer).props("show")).toBe(true);
		expect(document.activeElement?.getAttribute("aria-label")).toBe(
			"username"
		);
	});

	it("switches the form inside the open panel", async () => {
		panel.open("login", "hero");
		const { wrapper } = await mountComponent(HomepageHeader);
		// the drawer is teleported to the body
		const [login, registration] = document.querySelectorAll<HTMLElement>(
			"[role=dialog] [role=group] button"
		);
		expect(login.getAttribute("aria-pressed")).toBe("true");

		registration.click();
		await nextTick();
		expect(await forms(wrapper)).toEqual([false, true]);
		expect(trackEvent).toHaveBeenLastCalledWith("landing:auth_switch", {
			panel: "registration",
		});

		// the welcome state's button after a registration: not a switch
		vi.mocked(trackEvent).mockClear();
		wrapper.findComponent(RegistrationComponent).vm.$emit("login");
		expect(await forms(wrapper)).toEqual([true, false]);
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("closes the panel from the drawer (X, Esc, backdrop)", async () => {
		panel.open("registration", "closing");
		const { wrapper } = await mountComponent(HomepageHeader);

		wrapper.findComponent(PDrawer).vm.$emit("update:show", false);
		expect(panel.showRegistration.value).toBe(false);

		// opening is the header's buttons' job, the drawer only closes
		wrapper.findComponent(PDrawer).vm.$emit("update:show", true);
		expect(panel.showLogin.value || panel.showRegistration.value).toBe(false);
	});

	it("closes the panel when the header leaves", async () => {
		panel.open("registration", "hero");
		const { wrapper } = await mountComponent(HomepageHeader);

		wrapper.unmount();

		expect(panel.showLogin.value).toBe(false);
		expect(panel.showRegistration.value).toBe(false);
	});

	it.each([
		["homepage", 5],
		["shared-plan", 0],
	])("on %s shows %i section links", async (name, links) => {
		route.name = name;
		const { wrapper } = await mountComponent(HomepageHeader);

		expect(wrapper.findAll("nav a")).toHaveLength(links);
		expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe("/");
	});

	it("links the market report right after How it works, prefetching it", async () => {
		const { wrapper } = await mountComponent(HomepageHeader);
		const nav = wrapper.find("nav");
		const items = nav.findAll("a").map((a) => a.text());
		expect(items.indexOf("homepage.navigation.market")).toBe(
			items.indexOf("homepage.navigation.how") + 1
		);
		const link = nav.find("[data-market-link]");
		expect(link.text()).toBe("homepage.navigation.market");

		await link.trigger("mouseenter");
		await link.trigger("focus");
		expect(prefetchMarketReport).toHaveBeenCalledTimes(2);
		await link.trigger("click");
		expect(trackEvent).toHaveBeenCalledWith("landing:market_click", {
			target: "header",
		});
	});
});
