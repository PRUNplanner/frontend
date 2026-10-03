/**
 * Keeps the tabs of one browser in step: planning changes saved in one tab
 * refresh the others, and a login, logout or token refresh in one tab
 * applies to all of them, so a stale tab never writes old tokens or
 * preferences back.
 */

import { ref, type Ref } from "vue";
import type { Router } from "vue-router";
import { isEqual } from "lodash-es";

// Stores
import { useUserStore } from "@/stores/userStore";

// Util
import { invalidate } from "@/lib/query_cache/queries/queries.util";
import { stopPersisting } from "@/lib/persistStorage";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import {
	applyPreferencePatch,
	diffPreferences,
	markPreferencesSynced,
} from "@/features/preferences/preferenceSync";

// Types & Interfaces
import type { JSONValue } from "@/lib/query_cache/queryCache.types";
import type {
	UserPreference,
	UserProfile,
} from "@/features/api/schemas/user.schemas";

export interface IRemoteChange {
	keys: JSONValue[];
	uuid?: string;
	// tells two changes with the same keys apart
	seq: number;
}

interface IChangeMessage {
	userId: string;
	keys: JSONValue[];
	uuid?: string;
}

// the user store as the persist plugin writes it to localStorage
interface IPersistedUser {
	accessToken?: string;
	refreshToken?: string;
	profile?: UserProfile;
	preferences?: UserPreference;
}

const USER_KEY = "prunplanner_user";

/** Another tab logged in, this one must reload */
export const sessionReplaced: Ref<boolean> = ref(false);

/** The last planning change another tab of this user saved */
export const remoteChange: Ref<IRemoteChange | null> = ref(null);

let channel: BroadcastChannel | null = null;

/**
 * User id of a JWT (the `user_id` claim)
 *
 * @param {string} [token] JWT
 * @returns {string | undefined} User id, undefined if none or unreadable
 */
export function tokenUserId(token: string | undefined): string | undefined {
	try {
		const payload = token!.split(".")[1];
		const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
		const id = JSON.parse(json).user_id;
		return id === undefined ? undefined : String(id);
	} catch {
		return undefined;
	}
}

async function onMessage(event: MessageEvent<IChangeMessage>): Promise<void> {
	const { userId, keys, uuid } = event.data;
	if (userId !== tokenUserId(useUserStore().refreshToken)) return;

	await invalidate(...keys);
	remoteChange.value = {
		keys,
		uuid,
		seq: (remoteChange.value?.seq ?? 0) + 1,
	};
}

function getChannel(): BroadcastChannel | null {
	if (!channel && typeof BroadcastChannel !== "undefined") {
		channel = new BroadcastChannel("prunplanner");
		channel.onmessage = onMessage;
	}
	return channel;
}

/**
 * Tells the user's other tabs that planning data changed, they invalidate
 * the same keys and refresh what they show
 *
 * @param {JSONValue[]} keys Invalidated key prefixes
 * @param {string} [uuid] Plan, empire or CX that changed
 */
export function broadcastChange(keys: JSONValue[], uuid?: string): void {
	const userId = tokenUserId(useUserStore().refreshToken);
	if (userId === undefined) return;
	getChannel()?.postMessage({ userId, keys, uuid } satisfies IChangeMessage);
}

function parseUser(value: string | null): IPersistedUser | null {
	try {
		return value ? (JSON.parse(value) as IPersistedUser) : null;
	} catch {
		return null;
	}
}

/**
 * Applies the user store another tab wrote: its logout, a login as someone
 * else, or its new tokens and preferences
 *
 * @param {StorageEvent} event Storage event
 * @param {Router} router Router
 */
export function onUserStorage(event: StorageEvent, router: Router): void {
	// null: the whole storage was cleared. A tab whose session another
	// tab replaced only waits for its reload.
	if ((event.key !== USER_KEY && event.key !== null) || sessionReplaced.value)
		return;

	const userStore = useUserStore();
	const next = parseUser(event.newValue);

	if (!next?.refreshToken) {
		if (!userStore.refreshToken) return;
		// before the reset, which ends the analytics session too
		trackEvent("app:session_change", { reason: "logout" });
		userStore.resetSession();
		if (router.currentRoute.value.meta.requiresAuth) router.push("/");
		return;
	}

	if (
		!userStore.refreshToken ||
		tokenUserId(next.refreshToken) !== tokenUserId(userStore.refreshToken)
	) {
		trackEvent("app:session_change", {
			reason: userStore.refreshToken ? "other_user" : "login",
		});
		// another session took over: this tab never writes its old one
		// back, also if it stays open on the leave-page prompt
		stopPersisting();
		userStore.resetSession();
		sessionReplaced.value = true;
		location.reload();
		return;
	}

	// same user: adopt, assigning only what differs so this tab's persist
	// doesn't write back and trigger the other tab again
	if (userStore.accessToken !== next.accessToken)
		userStore.accessToken = next.accessToken;
	if (userStore.refreshToken !== next.refreshToken)
		userStore.refreshToken = next.refreshToken;
	if (next.profile && !isEqual(userStore.profile, next.profile))
		userStore.profile = next.profile;

	// only what the other tab changed, keys this tab changed and hasn't
	// sent yet stay; the other tab sends its own changes
	const previous = parseUser(event.oldValue)?.preferences;
	if (previous && next.preferences) {
		const patch = diffPreferences(previous, next.preferences);
		applyPreferencePatch(userStore.preferences, patch);
		markPreferencesSynced(patch);
	}
}

/**
 * Starts listening to the other tabs
 *
 * @param {Router} router Router
 */
export function registerCrossTab(router: Router): void {
	getChannel();
	window.addEventListener("storage", (event) => onUserStorage(event, router));
}
