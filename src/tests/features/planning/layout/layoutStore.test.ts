import { describe, expect, it, vi } from "vitest";

// Util
import { sessionLayoutStore } from "@/features/planning/layout/layoutStore";
import { STORAGE_KEY } from "@/features/planning/layout/planLayout.constants";
import { presetLayout } from "@/features/planning/layout/presets";
import { wideLayout } from "@/tests/features/planning/layout/layout.fixtures";

describe("sessionLayoutStore", () => {
	it("keeps the layout in the tab's sessionStorage", () => {
		const stored = {
			v: 1 as const,
			preset: "custom" as const,
			custom: {
				wide: wideLayout(),
				phone: { ...presetLayout("standard"), cols: 2 },
				known: ["planet" as const],
			},
			folded: { wide: ["planet" as const], phone: [] },
		};
		sessionLayoutStore.save(stored);
		expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
		const out = sessionLayoutStore.load()!;
		expect(out.custom!.wide).toEqual(wideLayout());
		expect(out.custom!.phone!.cols).toBe(2);
		expect(out.custom!.known).toEqual(["planet"]);
		expect(out.folded).toEqual(stored.folded);
	});

	it("reads nothing stored as null", () => {
		expect(sessionLayoutStore.load()).toBeNull();
	});

	it("reads broken JSON or an older shape as null", () => {
		sessionStorage.setItem(STORAGE_KEY, "{oops");
		expect(sessionLayoutStore.load()).toBeNull();
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ v: 0, rows: [], preset: "standard" })
		);
		expect(sessionLayoutStore.load()).toBeNull();
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ v: 1, preset: "mine", custom: null })
		);
		expect(sessionLayoutStore.load()).toBeNull();
	});

	it("fixes up what it reads", () => {
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				v: 1,
				preset: "standard",
				custom: { cols: 30, items: [{ els: ["empire", "nope"] }] },
				folded: ["planet", "nope"],
			})
		);
		const out = sessionLayoutStore.load()!;
		// the shape before the phone arrangement: its grid is Wide, its
		// folds Wide's
		expect(out.custom!.wide.cols).toBe(24);
		expect(out.custom!.wide.items.map((i) => i.els)).toEqual([
			["empire"],
			["production"],
		]);
		expect(out.custom!.phone).toBeUndefined();
		expect(out.folded).toEqual({ wide: ["planet"], phone: [] });
		// Tinted parts: off is left out
		expect(out).not.toHaveProperty("tinted");
	});

	it("keeps Tinted parts when on, drops a bad value", () => {
		const base = { v: 1, preset: "standard", custom: null, folded: [] };
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ ...base, tinted: true })
		);
		expect(sessionLayoutStore.load()).toMatchObject({ tinted: true });
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ ...base, tinted: "yes" })
		);
		expect(sessionLayoutStore.load()).toEqual({
			...base,
			folded: { wide: [], phone: [] },
		});
	});

	it("keeps working with storage blocked", () => {
		const blocked = () => {
			throw new DOMException("blocked", "SecurityError");
		};
		vi.stubGlobal("sessionStorage", {
			getItem: blocked,
			setItem: blocked,
			removeItem: blocked,
		});
		expect(() =>
			sessionLayoutStore.save({
				v: 1,
				preset: "standard",
				custom: null,
				folded: { wide: [], phone: [] },
			})
		).not.toThrow();
		expect(sessionLayoutStore.load()).toBeNull();
	});
});
