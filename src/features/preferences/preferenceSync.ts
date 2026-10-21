import { cloneDeep, isEqual } from "lodash-es";

import { preferenceDefaults } from "@/features/preferences/userDefaults";

// Types & Interfaces
import type {
	UserPreference,
	UserPreferencePatch,
} from "@/features/api/schemas/user.schemas";

// the keys the backend stores (UserPreferenceSchema's, a test keeps them in
// step), never frontend-only ones like planDefaults. Not read from the
// schema: the app shell loads this module, zod comes with the API layer
const KEYS = Object.keys(preferenceDefaults).filter(
	(key) => key !== "planDefaults"
) as (keyof UserPreference)[];

// maps the backend merges per key, a key sent as null is deleted
const KEYED = ["planOverrides", "fioRepairPlanLinks"] as const;
type KeyedPatch = Record<string, unknown>;

// last preferences known to match the backend, a PATCH sends the difference
let synced: UserPreference | undefined;

/**
 * Changes from one preference state to another: changed top-level keys
 * and, for plan overrides and FIO Repair plan links, changed entries per
 * key, removed ones as null
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
		if ((KEYED as readonly string[]).includes(key)) continue;
		if (isEqual(from[key], to[key])) continue;
		// an unset uuid must be sent as null, undefined is dropped
		patch[key] = cloneDeep(to[key]) ?? null;
	}

	for (const key of KEYED) {
		const fromMap: KeyedPatch = from[key] ?? {};
		const toMap: KeyedPatch = to[key] ?? {};
		const changes: KeyedPatch = {};
		for (const id of new Set([
			...Object.keys(fromMap),
			...Object.keys(toMap),
		]))
			if (!isEqual(fromMap[id], toMap[id]))
				changes[id] = cloneDeep(toMap[id]) ?? null;

		if (Object.keys(changes).length > 0) patch[key] = changes;
	}

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
	const record = target as Record<string, unknown>;

	for (const [key, value] of Object.entries(patch)) {
		if ((KEYED as readonly string[]).includes(key)) continue;
		const next = value ?? undefined;
		if (!isEqual(record[key], next)) record[key] = cloneDeep(next);
	}

	for (const key of KEYED) {
		const map = (record[key] ??= {}) as KeyedPatch;
		for (const [id, value] of Object.entries(
			(patch[key] ?? {}) as KeyedPatch
		)) {
			if (value === null) delete map[id];
			else if (!isEqual(map[id], value)) map[id] = cloneDeep(value);
		}
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
