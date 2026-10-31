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
	tokenExpiresAt,
	tokenUserId,
} from "@/lib/crossTab";
import { persistStorage } from "@/lib/persistStorage";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useUserStore } from "@/stores/userStore";
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { unsyncedPreferences } from "@/features/preferences/preferenceSync";
import { preferenceDefaults } from "@/features/preferences/userDefaults";
import type { UserProfile } from "@/features/api/schemas/user.schemas";

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

const USER_KEY = "prunplanner_user";

const profile: UserProfile = {
	id: 7,
	username: "tester",
	email: null,
	is_email_verified: false,
	fio_apikey: null,
	prun_username: null,
	fio_status: "none",
	fio_last_refreshed_at: null,
};

// what another tab's write does: stores the value, then sends the event
function storageEvent(
	oldValue: object | null,
	newValue: object | null
): StorageEvent {
	if (newValue) localStorage.setItem(USER_KEY, JSON.stringify(newValue));
	else localStorage.removeItem(USER_KEY);
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
		localStorage.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reads the user id of a token", () => {
		expect(tokenUserId(jwt(7))).toBe("7");
		expect(tokenUserId(undefined)).toBeUndefined();
		expect(tokenUserId("not-a-jwt")).toBeUndefined();
		// a readable token without the claim
		const noClaim = btoa(JSON.stringify({ jti: "a" }));
		expect(tokenUserId(`header.${noClaim}.signature`)).toBeUndefined();
	});

	it("reads when a token expires", () => {
		const claims = btoa(JSON.stringify({ exp: 1_800_000_000 }));
		expect(tokenExpiresAt(`header.${claims}.signature`)).toBe(
			1_800_000_000_000
		);
		expect(tokenExpiresAt(jwt(7))).toBeUndefined();
		expect(tokenExpiresAt("not-a-jwt")).toBeUndefined();
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

			broadcastChange([["planningdata", "plan"]], ["plan-a"]);

			expect((await message).data).toStrictEqual({
				userId: "7",
				keys: [["planningdata", "plan"]],
				uuid: "plan-a",
				uuids: ["plan-a"],
			});
		});

		it("posts several uuids without the single one", async () => {
			userStore.setToken("access", jwt(7));
			const message = received();

			broadcastChange([["planningdata", "plan"]], ["plan-a", "plan-b"]);

			expect((await message).data).toStrictEqual({
				userId: "7",
				keys: [["planningdata", "plan"]],
				uuid: undefined,
				uuids: ["plan-a", "plan-b"],
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
			// an older build sends only the single uuid
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
				uuids: ["plan-a"],
			});
			expect(invalidateKey).toHaveBeenCalledTimes(1);
			expect(invalidateKey).toHaveBeenCalledWith(
				["planningdata", "plan"],
				{
					exact: false,
				}
			);
		});

		it("announces every uuid of a batch, none without any", async () => {
			userStore.setToken("access", jwt(7));
			const before = remoteChange.value?.seq ?? 0;

			otherTab.postMessage({
				userId: "7",
				keys: [["planningdata", "plan"]],
				uuids: ["plan-a", "plan-b"],
			});
			await vi.waitFor(() =>
				expect(remoteChange.value?.seq).toBe(before + 1)
			);
			expect(remoteChange.value?.uuids).toStrictEqual([
				"plan-a",
				"plan-b",
			]);

			otherTab.postMessage({
				userId: "7",
				keys: [["planningdata", "cx"]],
			});
			await vi.waitFor(() =>
				expect(remoteChange.value?.seq).toBe(before + 2)
			);
			expect(remoteChange.value?.uuids).toStrictEqual([]);
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
			localStorage.clear();
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

		it("logout on a page that needs no login stays on it", () => {
			const publicRouter = {
				currentRoute: { value: { meta: {} } },
				push: vi.fn(),
			} as unknown as Router;
			userStore.setToken("access", jwt(7));

			onUserStorage(
				storageEvent({ refreshToken: jwt(7) }, { refreshToken: null }),
				publicRouter
			);

			expect(userStore.isLoggedIn).toBe(false);
			expect(publicRouter.push).not.toHaveBeenCalled();
		});

		it("same user: adopts a new profile, keeps an equal one", () => {
			userStore.setToken("access", jwt(7));
			userStore.profile = profile;

			onUserStorage(
				storageEvent(null, {
					accessToken: userStore.accessToken,
					refreshToken: jwt(7),
					profile: { ...profile, username: "renamed" },
				}),
				router
			);
			expect(userStore.profile?.username).toBe("renamed");

			const adopted = userStore.profile;
			onUserStorage(
				storageEvent(null, {
					accessToken: userStore.accessToken,
					refreshToken: jwt(7),
					profile: { ...profile, username: "renamed" },
				}),
				router
			);
			expect(userStore.profile).toBe(adopted);
		});

		it("keeps its own unsent preference when storage already holds it", () => {
			userStore.setToken("access", jwt(7));
			userStore.setPreference("burnDaysYellow", 15);
			const old = cloneDeep(preferenceDefaults);
			const event = storageEvent(
				{ refreshToken: jwt(7), preferences: old },
				{
					refreshToken: jwt(7),
					preferences: { ...old, burnDaysRed: 2 },
				}
			);
			// this tab persisted its change before handling the event
			localStorage.setItem(
				USER_KEY,
				JSON.stringify({
					refreshToken: jwt(7),
					preferences: { ...old, burnDaysRed: 2, burnDaysYellow: 15 },
				})
			);

			onUserStorage(event, router);

			expect(userStore.preferences.burnDaysRed).toBe(2);
			expect(unsyncedPreferences(userStore.preferences)).toStrictEqual({
				burnDaysYellow: 15,
			});
		});

		it("same user: adopts the stored user, not an older event's", () => {
			userStore.setToken("access", jwt(7));
			const event = storageEvent(null, {
				refreshToken: jwt(7),
				profile: { ...profile, fio_status: "syncing" },
			});
			// the other tab wrote again before this event was handled
			localStorage.setItem(
				USER_KEY,
				JSON.stringify({
					refreshToken: jwt(7),
					profile: { ...profile, fio_status: "ok" },
				})
			);

			onUserStorage(event, router);

			expect(userStore.fioStatus).toBe("ok");
		});

		it("two tabs' crossing writes settle instead of swapping", () => {
			// two tabs, each with its own store; a write stores the tab's
			// state and sends the event to the other tab
			const tabs = [createPinia(), createPinia()];
			const storeOf = (tab: number) => {
				setActivePinia(tabs[tab]);
				return useUserStore();
			};
			// `tab`: the states differ in something adopting never aligns,
			// as the key order of planOverrides did in the incident
			const stateOf = (tab: number) => {
				const store = storeOf(tab);
				return JSON.stringify({
					tab,
					accessToken: store.accessToken,
					refreshToken: store.refreshToken,
					profile: store.profile,
				});
			};
			const pending: { tab: number; event: StorageEvent }[] = [];
			const written = ["", ""];
			const write = (tab: number) => {
				const value = stateOf(tab);
				written[tab] = value;
				const oldValue = localStorage.getItem(USER_KEY);
				// localStorage sends no event for an unchanged value
				if (value === oldValue) return;
				localStorage.setItem(USER_KEY, value);
				pending.push({
					tab: 1 - tab,
					event: new StorageEvent("storage", {
						key: USER_KEY,
						oldValue,
						newValue: value,
					}),
				});
			};
			const statuses = ["ok", "syncing"] as const;
			for (const tab of [0, 1]) {
				const store = storeOf(tab);
				store.accessToken = "access";
				store.refreshToken = jwt(7);
				store.profile = { ...profile, fio_status: statuses[tab] };
			}
			// both write before either sees the other's event
			write(0);
			write(1);

			let delivered = 0;
			while (pending.length && delivered < 100) {
				const { tab, event } = pending.shift()!;
				delivered++;
				storeOf(tab);
				onUserStorage(event, router);
				if (stateOf(tab) !== written[tab]) write(tab);
			}

			expect(delivered).toBeLessThan(10);
			expect(storeOf(0).fioStatus).toBe(storeOf(1).fioStatus);
		});

		it("same user: new refresh token is adopted", () => {
			userStore.setToken("access", jwt(7, "a"));

			onUserStorage(
				storageEvent(null, {
					accessToken: "access",
					refreshToken: jwt(7, "b"),
				}),
				router
			);

			expect(userStore.refreshToken).toBe(jwt(7, "b"));
			expect(userStore.accessToken).toBe("access");
		});

		it("registerCrossTab applies storage events of the window", () => {
			userStore.setToken("access", jwt(7));
			registerCrossTab(router);

			window.dispatchEvent(
				storageEvent({ refreshToken: jwt(7) }, { refreshToken: null })
			);

			expect(userStore.isLoggedIn).toBe(false);
			expect(router.push).toHaveBeenCalledWith("/");
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
