import { cloneDeep, isEqual } from "lodash-es";

// Schemas
import { UserPreferenceSchema } from "@/features/api/schemas/user.schemas";
import { preferenceDefaults } from "@/features/preferences/userDefaults";

// Types & Interfaces
import type {
	UserPreference,
	UserPreferencePatch,
} from "@/features/api/schemas/user.schemas";

// the keys the backend stores, never frontend-only ones like planDefaults
const KEYS = Object.keys(
	UserPreferenceSchema.shape
) as (keyof UserPreference)[];

// last preferences known to match the backend, a PATCH sends the difference
let synced: UserPreference | undefined;

/**
 * Changes from one preference state to another: changed top-level keys
 * and changed plan overrides per uuid, removed ones as null
 *
 * @author jplacht
 *
 * @param {UserPreference} from Previous state
 * @param {UserPreference} to New state
 * @returns {UserPreferencePatch} Patch, empty if nothing changed
 */
export function diffPreferences(
	from: UserPreference,
	to: UserPreference
): UserPreferencePatch {
	const patch: Record<string, unknown> = {};

	for (const key of KEYS) {
		if (key === "planOverrides" || isEqual(from[key], to[key])) continue;
		// an unset uuid must be sent as null, undefined is dropped
		patch[key] = cloneDeep(to[key]) ?? null;
	}

	const fromOverrides = from.planOverrides ?? {};
	const toOverrides = to.planOverrides ?? {};
	const overrides: NonNullable<UserPreferencePatch["planOverrides"]> = {};
	for (const uuid of new Set([
		...Object.keys(fromOverrides),
		...Object.keys(toOverrides),
	]))
		if (!isEqual(fromOverrides[uuid], toOverrides[uuid]))
			overrides[uuid] = cloneDeep(toOverrides[uuid]) ?? null;

	if (Object.keys(overrides).length > 0) patch.planOverrides = overrides;

	return patch as UserPreferencePatch;
}

/**
 * Applies a patch in place, only where values differ so reactive
 * preferences don't change (and persist) for nothing
 *
 * @author jplacht
 *
 * @param {UserPreference} target Preferences to change
 * @param {UserPreferencePatch} patch Patch from diffPreferences
 */
export function applyPreferencePatch(
	target: UserPreference,
	patch: UserPreferencePatch
): void {
	const { planOverrides, ...rest } = patch;
	const record = target as Record<string, unknown>;

	for (const [key, value] of Object.entries(rest)) {
		const next = value ?? undefined;
		if (!isEqual(record[key], next)) record[key] = cloneDeep(next);
	}

	for (const [uuid, value] of Object.entries(planOverrides ?? {})) {
		if (value === null) delete target.planOverrides[uuid];
		else if (!isEqual(target.planOverrides[uuid], value))
			target.planOverrides[uuid] = cloneDeep(value);
	}
}

/**
 * Sets the state known to match the backend
 *
 * @param {UserPreference} prefs Preferences
 */
export function setSyncedPreferences(prefs: UserPreference): void {
	synced = cloneDeep(prefs);
}

/**
 * Changes the backend has now: sent by this tab, or by another
 *
 * @param {UserPreferencePatch} patch Patch
 */
export function markPreferencesSynced(patch: UserPreferencePatch): void {
	if (synced) applyPreferencePatch(synced, patch);
}

/**
 * What the backend doesn't have yet
 *
 * @param {UserPreference} current Current preferences
 * @returns {UserPreferencePatch} Patch to send
 */
export function unsyncedPreferences(
	current: UserPreference
): UserPreferencePatch {
	// none known (the user store sets it): the backend has the defaults
	synced ??= cloneDeep(preferenceDefaults);
	return diffPreferences(synced, current);
}
