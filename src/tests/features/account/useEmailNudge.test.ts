import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { createPinia, setActivePinia } from "pinia";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useUserStore } from "@/stores/userStore";
import { useEmailNudge } from "@/features/account/useEmailNudge";

// Types & Interfaces
import type { UserProfile } from "@/features/api/schemas/user.schemas";

vi.mock("vue-i18n", async (importOriginal) => ({
	...(await importOriginal<typeof import("vue-i18n")>()),
	useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
	trackException: vi.fn(),
	trackUser: vi.fn(),
	identifyUser: vi.fn(),
	resetUser: vi.fn(),
}));

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) =>
	new Date(Date.now() - days * DAY).toISOString();

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

// logged in, preferences loaded, no email, nothing dismissed
function setup(patch: Partial<UserProfile> = {}) {
	const userStore = useUserStore();
	userStore.accessToken = "a".repeat(120);
	userStore.refreshToken = "r".repeat(120);
	userStore.profile = profile(patch);
	userStore.preferencesLoaded = true;
	return userStore;
}

describe("useEmailNudge", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(trackEvent).mockClear();
	});

	it.each([
		[{}, "none"],
		[{ email: "a@b.co" }, "unconfirmed"],
		[{ email: "a@b.co", is_email_verified: true }, "ready"],
	] as const)("reads the state of %o as %s", (patch, state) => {
		setup(patch);
		expect(useEmailNudge(1).state.value).toBe(state);
	});

	it("shows for a user with plans and no confirmed email", () => {
		setup();
		expect(useEmailNudge(3).show.value).toBe(true);
		setup({ email: "a@b.co" });
		expect(useEmailNudge(3).show.value).toBe(true);
	});

	it.each([
		[
			"a confirmed email",
			() => setup({ email: "a@b.co", is_email_verified: true }),
			1,
		],
		["no plans", () => setup(), 0],
		[
			"preferences not loaded",
			() => (setup().preferencesLoaded = false),
			1,
		],
		["no profile", () => (setup().profile = undefined), 1],
		["logged out", () => (setup().accessToken = undefined), 1],
		[
			"never",
			() => setup().setPreference("emailNudgeDismissal", "never"),
			1,
		],
		[
			"later, 29 days ago",
			() => {
				const store = setup();
				store.setPreference("emailNudgeDismissal", "later");
				store.setPreference("emailNudgeDismissedAt", daysAgo(29));
			},
			1,
		],
	])("hides with %s", (_, arrange, plans) => {
		arrange();
		expect(useEmailNudge(plans).show.value).toBe(false);
	});

	it("shows again 31 days after Not now", () => {
		const store = setup();
		store.setPreference("emailNudgeDismissal", "later");
		store.setPreference("emailNudgeDismissedAt", daysAgo(31));
		expect(useEmailNudge(1).show.value).toBe(true);
	});

	it("follows the plan count", () => {
		setup();
		const plans = ref(0);
		const { show } = useEmailNudge(plans);
		expect(show.value).toBe(false);
		plans.value = 2;
		expect(show.value).toBe(true);
	});

	it("saves Not now with a timestamp", () => {
		const store = setup();
		const nudge = useEmailNudge(1);

		nudge.later();

		expect(store.preferences.emailNudgeDismissal).toBe("later");
		expect(
			Date.now() - Date.parse(store.preferences.emailNudgeDismissedAt!)
		).toBeLessThan(1000);
		expect(nudge.show.value).toBe(false);
		expect(trackEvent).toHaveBeenCalledWith("account:email_nudge_action", {
			action: "later",
			state: "none",
		});
	});

	it("undoes Don't remind me to the values before", () => {
		const store = setup();
		const before = daysAgo(40);
		store.setPreference("emailNudgeDismissal", "later");
		store.setPreference("emailNudgeDismissedAt", before);
		const nudge = useEmailNudge(1);

		nudge.never();
		expect(store.preferences.emailNudgeDismissal).toBe("never");
		expect(nudge.show.value).toBe(false);

		nudge.undo();
		expect(store.preferences.emailNudgeDismissal).toBe("later");
		expect(store.preferences.emailNudgeDismissedAt).toBe(before);
		expect(nudge.show.value).toBe(true);
		expect(trackEvent).toHaveBeenCalledWith("account:email_nudge_action", {
			action: "undo",
			state: "none",
		});
	});

	it("counts the banner as shown once per visit and state", () => {
		setup();
		useEmailNudge(1).trackShown();
		useEmailNudge(1).trackShown();
		expect(trackEvent).toHaveBeenCalledTimes(1);
		expect(trackEvent).toHaveBeenCalledWith("account:email_nudge_shown", {
			state: "none",
		});

		setup({ email: "a@b.co" });
		useEmailNudge(1).trackShown();
		expect(trackEvent).toHaveBeenCalledTimes(2);
	});
});
