import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { cloneDeep } from "lodash-es";
import type { Router } from "vue-router";

import {
	broadcastChange,
	onUserStorage,
	registerCrossTab,
	remoteChange,
	sessionReplaced,
	tokenUserId,
} from "@/lib/crossTab";
import { persistStorage } from "@/lib/persistStorage";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useUserStore } from "@/stores/userStore";
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { unsyncedPreferences } from "@/features/preferences/preferenceSync";
import { preferenceDefaults } from "@/features/preferences/userDefaults";

vi.mock("@/lib/analytics/useAnalytics", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: vi.fn(),
}));

// setToken loads the profile
vi.mock("@/features/api/userData.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/features/api/userData.api")>()),
	callGetProfile: vi.fn(() => new Promise(() => {})),
}));

function jwt(userId: number, jti: string = "a"): string {
	const payload = btoa(JSON.stringify({ user_id: userId, jti }))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	return `header.${payload}.signature`;
}

function storageEvent(
	oldValue: object | null,
	newValue: object | null
): StorageEvent {
	return new StorageEvent("storage", {
		key: "prunplanner_user",
		oldValue: oldValue && JSON.stringify(oldValue),
		newValue: newValue && JSON.stringify(newValue),
	});
}

const router = {
	currentRoute: { value: { meta: { requiresAuth: true } } },
	push: vi.fn(),
} as unknown as Router;

describe("crossTab", () => {
	let userStore: ReturnType<typeof useUserStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		userStore = useUserStore();
		vi.mocked(router.push).mockClear();
		vi.mocked(trackEvent).mockClear();
		sessionReplaced.value = false;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reads the user id of a token", () => {
		expect(tokenUserId(jwt(7))).toBe("7");
		expect(tokenUserId(undefined)).toBeUndefined();
		expect(tokenUserId("not-a-jwt")).toBeUndefined();
	});

	describe("planning changes", () => {
		let otherTab: BroadcastChannel;

		beforeEach(() => {
			registerCrossTab(router);
			otherTab = new BroadcastChannel("prunplanner");
		});

		afterEach(() => otherTab.close());

		function received(): Promise<MessageEvent> {
			return new Promise((resolve) =>
				otherTab.addEventListener("message", resolve, { once: true })
			);
		}

		it("posts the keys and uuid with the user id", async () => {
			userStore.setToken("access", jwt(7));
			const message = received();

			broadcastChange([["planningdata", "plan"]], "plan-a");

			expect((await message).data).toStrictEqual({
				userId: "7",
				keys: [["planningdata", "plan"]],
				uuid: "plan-a",
			});
		});

		it("posts nothing when logged out", async () => {
			const listener = vi.fn();
			otherTab.addEventListener("message", listener);

			broadcastChange([["planningdata", "plan"]]);
			await new Promise((r) => setTimeout(r, 20));

			expect(listener).not.toHaveBeenCalled();
		});

		it("invalidates and announces a change of the same user", async () => {
			userStore.setToken("access", jwt(7));
			const invalidateKey = vi.spyOn(useQueryStore(), "invalidateKey");
			const before = remoteChange.value?.seq ?? 0;

			otherTab.postMessage({
				userId: "8",
				keys: [["planningdata", "cx"]],
			});
			otherTab.postMessage({
				userId: "7",
				keys: [["planningdata", "plan"]],
				uuid: "plan-a",
			});
			await vi.waitFor(() =>
				expect(remoteChange.value?.seq).toBe(before + 1)
			);

			expect(remoteChange.value).toMatchObject({
				keys: [["planningdata", "plan"]],
				uuid: "plan-a",
			});
			expect(invalidateKey).toHaveBeenCalledTimes(1);
			expect(invalidateKey).toHaveBeenCalledWith(
				["planningdata", "plan"],
				{
					exact: false,
				}
			);
		});
	});

	describe("login state", () => {
		it("logout in another tab resets this one and leaves the page", () => {
			userStore.setToken("access", jwt(7));
			userStore.setPreference("burnDaysRed", 1);

			onUserStorage(
				storageEvent({ refreshToken: jwt(7) }, { refreshToken: null }),
				router
			);

			expect(userStore.isLoggedIn).toBe(false);
			expect(userStore.preferences.burnDaysRed).toBe(
				preferenceDefaults.burnDaysRed
			);
			expect(router.push).toHaveBeenCalledWith("/");
			expect(trackEvent).toHaveBeenCalledWith("app:session_change", {
				reason: "logout",
			});
		});

		it("cleared storage counts as logout, nothing to do when logged out", () => {
			userStore.setToken("access", jwt(7));
			onUserStorage(
				new StorageEvent("storage", { key: null, newValue: null }),
				router
			);
			expect(userStore.isLoggedIn).toBe(false);

			onUserStorage(storageEvent(null, { refreshToken: null }), router);
			expect(router.push).toHaveBeenCalledTimes(1);
		});

		it.each([
			["another user", jwt(7), "other_user"],
			["a login while logged out", undefined, "login"],
		])("%s ends this session and reloads", (_, current, reason) => {
			const reload = vi.fn();
			vi.stubGlobal("location", { reload });
			if (current) userStore.setToken("access", current);

			onUserStorage(storageEvent(null, { refreshToken: jwt(8) }), router);

			expect(trackEvent).toHaveBeenCalledWith("app:session_change", {
				reason,
			});
			expect(userStore.isLoggedIn).toBe(false);
			expect(sessionReplaced.value).toBe(true);
			expect(reload).toHaveBeenCalled();
			// stays open (leave-page prompt): it never writes the new
			// session's storage
			const setItem = vi.fn();
			vi.stubGlobal("localStorage", { setItem });
			persistStorage.setItem("prunplanner_user", "old session");
			expect(setItem).not.toHaveBeenCalled();

			// the new session's later writes change nothing here
			vi.mocked(trackEvent).mockClear();
			onUserStorage(storageEvent(null, { refreshToken: jwt(8) }), router);
			expect(trackEvent).not.toHaveBeenCalled();
			expect(reload).toHaveBeenCalledTimes(1);
		});

		it("same user: adopts tokens and the other tab's preferences only", () => {
			const reload = vi.fn();
			vi.stubGlobal("location", { reload });
			userStore.setToken("access", jwt(7));
			// this tab's own change, not sent yet
			userStore.setPreference("burnDaysYellow", 15);

			const old = cloneDeep(preferenceDefaults);
			onUserStorage(
				storageEvent(
					{ refreshToken: jwt(7), preferences: old },
					{
						accessToken: "access-2",
						refreshToken: jwt(7),
						preferences: { ...old, burnDaysRed: 2 },
					}
				),
				router
			);

			expect(reload).not.toHaveBeenCalled();
			expect(userStore.accessToken).toBe("access-2");
			expect(userStore.preferences.burnDaysRed).toBe(2);
			expect(userStore.preferences.burnDaysYellow).toBe(15);
			// the other tab sends its change, this one only its own
			expect(unsyncedPreferences(userStore.preferences)).toStrictEqual({
				burnDaysYellow: 15,
			});
		});

		it("ignores other keys", () => {
			userStore.setToken("access", jwt(7));
			onUserStorage(
				new StorageEvent("storage", {
					key: "prunplanner_planning",
					newValue: null,
				}),
				router
			);
			expect(userStore.isLoggedIn).toBe(true);
		});
	});
});
