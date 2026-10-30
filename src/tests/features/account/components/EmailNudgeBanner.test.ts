import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useUserStore } from "@/stores/userStore";
import { toasts } from "@/ui/useToast";
import EmailNudgeBanner from "@/features/account/components/EmailNudgeBanner.vue";
import PNotice from "@/ui/components/PNotice.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { UserProfile } from "@/features/api/schemas/user.schemas";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
	trackException: vi.fn(),
	trackUser: vi.fn(),
	identifyUser: vi.fn(),
	resetUser: vi.fn(),
}));

const mock = new AxiosMockAdapter(apiService.client);
const PLANS_URL = /planning\/plan\/$/;

const NUDGE = "account.email_nudge";
const messages = {
	account: {
		email_nudge: {
			none: { body: "your plan | your {count} plans", body_plain: "plain" },
			unconfirmed: { body: "sent to {email}" },
		},
	},
};

function profile(patch: Partial<UserProfile> = {}): UserProfile {
	return {
		id: 1,
		username: "test-user",
		email: null,
		is_email_verified: false,
		fio_apikey: null,
		prun_username: null,
		fio_status: "none",
		fio_last_refreshed_at: null,
		...patch,
	};
}

let pinia: Pinia;

async function mountBanner(patch: Partial<UserProfile> = {}, knownPlans = 1) {
	const userStore = useUserStore();
	userStore.accessToken = "a".repeat(120);
	userStore.refreshToken = "r".repeat(120);
	userStore.profile = profile(patch);
	userStore.preferencesLoaded = true;
	return mountComponent(EmailNudgeBanner, { knownPlans }, { pinia, messages });
}

const notice = (wrapper: VueWrapper) => wrapper.findComponent(PNotice);
const button = (wrapper: VueWrapper, label: string) =>
	wrapper
		.findAll("button")
		.find((b) => b.text() === `${NUDGE}.buttons.${label}`);
const labels = (wrapper: VueWrapper) =>
	wrapper.findAll("button").map((b) => b.text().replace(`${NUDGE}.buttons.`, ""));

describe("EmailNudgeBanner", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		mock.reset();
		mock.onGet(PLANS_URL).reply(200, []);
		toasts.value = [];
		vi.mocked(trackEvent).mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("asks for an email, with the plan count once known", async () => {
		const { wrapper } = await mountBanner({}, 3);

		expect(notice(wrapper).props("type")).toBe("info");
		expect(wrapper.text()).toContain(`${NUDGE}.none.title`);
		expect(labels(wrapper)).toEqual(["add", "later", "never"]);
		// never fewer than the empire shows
		expect(wrapper.text()).toContain("your 3 plans");
		expect(trackEvent).toHaveBeenCalledWith("account:email_nudge_shown", {
			state: "none",
		});
	});

	it("uses the copy without a number when the plans can't be counted", async () => {
		mock.onGet(PLANS_URL).reply(500);
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountBanner();

		expect(wrapper.text()).toContain("plain");
	});

	it("asks to confirm an unconfirmed email, masked, without Don't remind me", async () => {
		const { wrapper } = await mountBanner({ email: "jan@gmail.com" });

		expect(notice(wrapper).props("type")).toBe("warning");
		expect(wrapper.text()).toContain("sent to j•••@gmail.com");
		expect(labels(wrapper)).toEqual(["enter_code", "resend", "later"]);
	});

	it.each([
		["a confirmed email", { email: "a@ex.com", is_email_verified: true }, 1],
		["no plans", {}, 0],
	])("stays hidden with %s", async (_, patch, plans) => {
		const { wrapper } = await mountBanner(patch, plans);

		expect(notice(wrapper).exists()).toBe(false);
		expect(trackEvent).not.toHaveBeenCalled();
		expect(mock.history.get).toHaveLength(0);
	});

	it("hides on Not now", async () => {
		const { wrapper } = await mountBanner();

		await button(wrapper, "later")!.trigger("click");

		expect(useUserStore().preferences.emailNudgeDismissal).toBe("later");
		expect(notice(wrapper).exists()).toBe(false);
		expect(toasts.value).toEqual([]);
	});

	it("hides on Don't remind me, and Undo in the toast brings it back", async () => {
		const { wrapper } = await mountBanner();

		await button(wrapper, "never")!.trigger("click");
		expect(useUserStore().preferences.emailNudgeDismissal).toBe("never");
		expect(notice(wrapper).exists()).toBe(false);
		expect(toasts.value[0].text).toBe(`${NUDGE}.never_toast`);

		toasts.value[0].action!.onClick();
		await flushPromises();

		expect(useUserStore().preferences.emailNudgeDismissal).toBeNull();
		expect(notice(wrapper).exists()).toBe(true);
	});

	it("opens the dialog at the matching step", async () => {
		const { wrapper } = await mountBanner({ email: "a@ex.com" });

		await button(wrapper, "enter_code")!.trigger("click");
		await flushPromises();

		expect(new DOMWrapper(document.body).text()).toContain(
			"account.email_dialog.title.code"
		);
		expect(trackEvent).toHaveBeenCalledWith("account:email_nudge_action", {
			action: "enter_code",
			state: "unconfirmed",
		});
	});
});
