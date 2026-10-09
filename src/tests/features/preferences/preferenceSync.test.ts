import { describe, expect, it } from "vitest";
import { cloneDeep } from "lodash-es";

import {
	applyPreferencePatch,
	diffPreferences,
	markPreferencesSynced,
	setSyncedPreferences,
	unsyncedPreferences,
} from "@/features/preferences/preferenceSync";
import { preferenceDefaults } from "@/features/preferences/userDefaults";

// Types & Interfaces
import type { UserPreference } from "@/features/api/schemas/user.schemas";

const OVERRIDE = { autoOptimizeHabs: true, includeCM: false };

function prefs(): UserPreference {
	return {
		...cloneDeep(preferenceDefaults),
		defaultEmpireUuid: "empire-a",
		planOverrides: { a: { ...OVERRIDE }, b: { ...OVERRIDE } },
	};
}

describe("preferenceSync", () => {
	it("no difference, frontend-only keys ignored", () => {
		const other = prefs();
		// @ts-expect-error not a stored preference
		other.planDefaults = { includeCM: true };
		expect(diffPreferences(prefs(), other)).toStrictEqual({});
	});

	it("changed top-level keys, unset ones as null", () => {
		const to = prefs();
		to.burnDaysRed = 3;
		to.defaultEmpireUuid = undefined;

		expect(diffPreferences(prefs(), to)).toStrictEqual({
			defaultEmpireUuid: null,
			burnDaysRed: 3,
		});
	});

	it("plan overrides per uuid, removed ones as null", () => {
		const to = prefs();
		to.planOverrides.a.includeCM = true;
		delete to.planOverrides.b;
		to.planOverrides.c = { ...OVERRIDE };

		expect(diffPreferences(prefs(), to)).toStrictEqual({
			planOverrides: {
				a: { ...OVERRIDE, includeCM: true },
				b: null,
				c: OVERRIDE,
			},
		});
	});

	it("applies a patch, null deletes an override", () => {
		const target = prefs();
		applyPreferencePatch(target, {
			burnDaysYellow: 12,
			defaultEmpireUuid: null,
			planOverrides: { a: null, c: OVERRIDE },
		});

		expect(target.burnDaysYellow).toBe(12);
		expect(target.defaultEmpireUuid).toBeUndefined();
		expect(Object.keys(target.planOverrides).sort()).toStrictEqual([
			"b",
			"c",
		]);
	});

	it("unsynced: only what changed since the synced state", () => {
		const current = prefs();
		setSyncedPreferences(current);
		current.burnDaysRed = 2;
		current.planOverrides.a.includeCM = true;

		const patch = unsyncedPreferences(current);
		expect(patch).toStrictEqual({
			burnDaysRed: 2,
			planOverrides: { a: { ...OVERRIDE, includeCM: true } },
		});

		markPreferencesSynced(patch);
		expect(unsyncedPreferences(current)).toStrictEqual({});
	});
});
