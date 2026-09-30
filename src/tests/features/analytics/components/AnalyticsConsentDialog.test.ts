import { describe, it, expect, beforeEach, vi } from "vitest";
import { DOMWrapper, flushPromises } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";
import { NModal } from "naive-ui";

import { useUserStore } from "@/stores/userStore";
import AnalyticsConsentDialog from "@/features/analytics/components/AnalyticsConsentDialog.vue";
import { mountComponent } from "@/tests/mountComponent";

const state = vi.hoisted(() => ({
	// set by the mock factory below
	consent: undefined as unknown as { value: "granted" | "denied" | null },
	key: undefined as string | undefined,
	grant: vi.fn(),
	deny: vi.fn(),
}));

vi.mock("@/lib/analytics/useAnalyticsConsent", async () => {
	const { ref } = await import("vue");
	state.consent = ref(null);
	return {
		useAnalyticsConsent: () => ({
			consent: state.consent,
			isDNT: false,
			grant: state.grant,
			deny: state.deny,
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

const mountDialog = () => mountComponent(AnalyticsConsentDialog, {}, { pinia });

const body = () => new DOMWrapper(document.body);
const modal = () => body().find(".n-modal");
const button = (label: string) =>
	modal()
		.findAll("button")
		.find((b) => b.text() === label)!;

describe("AnalyticsConsentDialog", () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		state.consent.value = null;
		state.key = "phc_test";
		vi.clearAllMocks();
	});

	it("asks a logged in user who has not chosen yet", async () => {
		login();
		await mountDialog();

		expect(modal().exists()).toBe(true);
		expect(modal().text()).toContain("analytics.consent.title");
		expect(button("analytics.consent.allow").exists()).toBe(true);
		expect(button("analytics.consent.deny").exists()).toBe(true);
	});

	it("does not ask when logged out", async () => {
		await mountDialog();

		expect(modal().exists()).toBe(false);
	});

	it("asks right after a login", async () => {
		await mountDialog();

		login();
		await flushPromises();

		expect(modal().exists()).toBe(true);
	});

	it.each(["granted", "denied"] as const)(
		"does not ask when the choice is %s (denied also covers DNT)",
		async (consent) => {
			login();
			state.consent.value = consent;
			await mountDialog();

			expect(modal().exists()).toBe(false);
		}
	);

	it("does not ask without a PostHog key", async () => {
		login();
		state.key = undefined;
		await mountDialog();

		expect(modal().exists()).toBe(false);
	});

	it("grants on Allow", async () => {
		login();
		await mountDialog();

		await button("analytics.consent.allow").trigger("click");

		expect(state.grant).toHaveBeenCalledTimes(1);
		expect(state.deny).not.toHaveBeenCalled();
	});

	it("denies on No thanks", async () => {
		login();
		await mountDialog();

		await button("analytics.consent.deny").trigger("click");

		expect(state.deny).toHaveBeenCalledTimes(1);
		expect(state.grant).not.toHaveBeenCalled();
	});

	it("closing makes no choice and hides it until the next app start", async () => {
		login();
		const { wrapper } = await mountDialog();

		// Esc, mask click and the close button all end here
		wrapper.findComponent(NModal).vm.$emit("update:show", false);
		await flushPromises();

		expect(wrapper.findComponent(NModal).props("show")).toBe(false);
		expect(state.grant).not.toHaveBeenCalled();
		expect(state.deny).not.toHaveBeenCalled();
	});
});
