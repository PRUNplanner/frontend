import { describe, it, expect } from "vitest";

import {
	UserPreferencePatchSchema,
	UserPreferenceSchema,
	UserProfileSchema,
} from "@/features/api/schemas/user.schemas";
import { preferenceDefaults } from "@/features/preferences/userDefaults";
import { standardStoredLayout } from "@/features/planning/layout/planLayout.constants";
import { normaliseLayout } from "@/features/planning/layout/normaliseLayout";
import { presetLayout } from "@/features/planning/layout/presets";
import { ELEMENT_IDS } from "@/features/planning/layout/elements";
import { wideLayout } from "@/tests/features/planning/layout/layout.fixtures";

const base = {
	id: 1,
	username: "test",
	email: null,
	is_email_verified: true,
	fio_apikey: "key",
	prun_username: "PRUN",
};

describe("UserProfileSchema", () => {
	it("takes the FIO status and the last refresh", () => {
		const parsed = UserProfileSchema.parse({
			...base,
			fio_status: "no_data",
			fio_last_refreshed_at: "2026-10-01T12:00:00Z",
		});

		expect(parsed.fio_status).toBe("no_data");
		expect(parsed.fio_last_refreshed_at).toBe("2026-10-01T12:00:00Z");
	});

	it("allows no refresh yet", () => {
		expect(
			UserProfileSchema.parse({
				...base,
				fio_status: "syncing",
				fio_last_refreshed_at: null,
			}).fio_last_refreshed_at
		).toBeNull();
	});

	it("rejects an unknown status", () => {
		expect(
			UserProfileSchema.safeParse({
				...base,
				fio_status: "broken",
				fio_last_refreshed_at: null,
			}).success
		).toBe(false);
	});
});

describe("UserPreferenceSchema: planLayout", () => {
	const { planDefaults: _, ...prefs } = preferenceDefaults;
	const parse = (planLayout: unknown) =>
		UserPreferenceSchema.parse({ ...prefs, planLayout }).planLayout;

	it("is Standard when the account has none", () => {
		const { planLayout: _l, ...without } = prefs;
		expect(UserPreferenceSchema.parse(without).planLayout).toEqual(
			standardStoredLayout()
		);
	});

	it("keeps a full Custom Layout: both arrangements, known, folds, Tinted parts", () => {
		const layout = {
			v: 1,
			preset: "custom",
			custom: {
				wide: normaliseLayout(wideLayout()),
				phone: normaliseLayout(presetLayout("standard"), "phone"),
				known: [...ELEMENT_IDS],
			},
			folded: { wide: ["planet"], phone: ["empire"] },
			tinted: true,
		};
		expect(parse(layout)).toEqual(layout);
	});

	it("fixes up what the frontend can't use, item by item", () => {
		const out = parse({
			v: 1,
			preset: "custom",
			custom: {
				wide: { cols: 30, items: [{ els: ["empire", "nope"] }] },
				phone: null,
			},
			folded: { wide: ["planet", "nope"] },
		});
		expect(out.custom!.wide.cols).toBe(24);
		expect(out.custom!.wide.items.flatMap((i) => i.els)).toEqual([
			"empire",
			"production",
		]);
		expect(out.custom).not.toHaveProperty("phone");
		expect(out.folded).toEqual({ wide: ["planet"], phone: [] });
	});

	it("falls back to Standard for a value it rejects", () => {
		for (const bad of ["oops", { v: 2 }, { v: 1, preset: "mine" }, null])
			expect(parse(bad)).toEqual(standardStoredLayout());
	});

	it("never sends an unusable layout as Standard", () => {
		expect(() =>
			UserPreferencePatchSchema.parse({ planLayout: { v: 2 } })
		).toThrow();
		expect(
			UserPreferencePatchSchema.parse({
				planLayout: standardStoredLayout(),
			})
		).toEqual({ planLayout: standardStoredLayout() });
	});
});
