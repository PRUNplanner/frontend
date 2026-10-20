import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import axe from "axe-core";

import { useUserStore } from "@/stores/userStore";
import AnalyticsConsentBanner from "@/features/analytics/components/AnalyticsConsentBanner.vue";
import AnalyticsFooterLink from "@/features/analytics/components/AnalyticsFooterLink.vue";
import { mountComponent } from "@/tests/mountComponent";

const state = vi.hoisted(() => ({
	// set by the mock factory below
	consent: undefined as unknown as { value: "granted" | "denied" | null },
	reopened: undefined as unknown as { value: boolean },
	isDNT: false,
	key: undefined as string | undefined,
	grant: vi.fn(),
	deny: vi.fn(),
}));

vi.mock("@/lib/analytics/useAnalyticsConsent", async () => {
	const { ref } = await import("vue");
	state.consent = ref(null);
	state.reopened = ref(false);
	return {
		useAnalyticsConsent: () => ({
			consent: state.consent,
			reopened: state.reopened,
			isDNT: state.isDNT,
			grant: state.grant,
			deny: state.deny,
			reopen: () => (state.reopened.value = true),
		}),
	};
});

vi.mock("@/lib/analytics/usePostHog", async (importOriginal) => ({
	...(await importOriginal<object>()),
	getPostHogKey: () => state.key,
}));

let pinia: Pinia;

function login(): void {
	const userStore = useUserStore();
	userStore.accessToken = "access";
	userStore.refreshToken = "refresh";
}

// the banner and a footer with the link, as on every logged-out page
const Page = defineComponent({
	render: () => h("div", [h(AnalyticsConsentBanner), h(AnalyticsFooterLink)]),
});
const mountPage = () => mountComponent(Page, {}, { pinia, attach: true });

const banner = () => document.body.querySelector("[role=region]");
const button = (label: string) =>
	[...document.body.querySelectorAll("button")].find(
		(b) => b.textContent?.trim() === label
	);

describe("AnalyticsConsentBanner", () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		state.consent.value = null;
		state.reopened.value = false;
		state.isDNT = false;
		state.key = "phc_test";
		vi.clearAllMocks();
	});

	it("asks a visitor who has not chosen, as a labelled region", async () => {
		await mountPage();

		expect(banner()?.getAttribute("aria-label")).toBe(
			"analytics.banner.label"
		);
		expect(button("analytics.consent.allow")).toBeDefined();
		expect(button("analytics.consent.deny")).toBeDefined();
		// no modal, no backdrop, nothing grabs focus
		expect(document.body.querySelector("[role=dialog]")).toBeNull();
		expect(banner()!.contains(document.activeElement)).toBe(false);
	});

	it("passes the a11y check", async () => {
		await mountPage();

		const result = await axe.run(banner()!, {
			rules: { "color-contrast": { enabled: false } },
		});
		expect(result.violations.map((v) => v.id)).toEqual([]);
	});

	it("does not ask a logged in user, who gets the dialog", async () => {
		login();
		await mountPage();

		expect(banner()).toBeNull();
		// the Profile toggle changes it then
		expect(button("analytics.banner.footer_link")).toBeUndefined();
	});

	it.each(["granted", "denied"] as const)(
		"does not ask when the choice is %s",
		async (consent) => {
			state.consent.value = consent;
			await mountPage();

			expect(banner()).toBeNull();
		}
	);

	it("never shows with DNT, not even from the footer", async () => {
		state.isDNT = true;
		state.consent.value = "denied";
		await mountPage();

		expect(banner()).toBeNull();
		expect(button("analytics.banner.footer_link")).toBeUndefined();
	});

	it("does not ask without a PostHog key", async () => {
		state.key = undefined;
		await mountPage();

		expect(banner()).toBeNull();
	});

	it.each([
		["analytics.consent.allow", "grant"],
		["analytics.consent.deny", "deny"],
	] as const)("%s stores the choice", async (label, fn) => {
		await mountPage();

		button(label)!.click();

		expect(state[fn]).toHaveBeenCalledTimes(1);
	});

	it("the footer link reopens it after a choice", async () => {
		state.consent.value = "denied";
		await mountPage();
		expect(banner()).toBeNull();

		button("analytics.banner.footer_link")!.click();
		await flushPromises();

		expect(banner()).not.toBeNull();
	});
});
