import { describe, expect, it, vi } from "vitest";

// Util
import { sessionLayoutStore } from "@/features/planning/layout/layoutStore";
import { STORAGE_KEY } from "@/features/planning/layout/planLayout.constants";
import { presetLayout } from "@/features/planning/layout/presets";

describe("sessionLayoutStore", () => {
	it("keeps the layout in the tab's sessionStorage", () => {
		const stored = {
			v: 1 as const,
			preset: "custom" as const,
			custom: presetLayout("wide"),
			folded: ["planet" as const],
		};
		sessionLayoutStore.save(stored);
		expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
		expect(sessionLayoutStore.load()).toEqual(stored);
	});

	it("reads nothing stored as null", () => {
		expect(sessionLayoutStore.load()).toBeNull();
	});

	it("reads broken JSON or an older shape as null", () => {
		sessionStorage.setItem(STORAGE_KEY, "{oops");
		expect(sessionLayoutStore.load()).toBeNull();
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ v: 0, rows: [], preset: "today" })
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
				preset: "today",
				custom: { cols: 30, items: [{ els: ["empire", "nope"] }] },
				folded: ["planet", "nope"],
			})
		);
		const out = sessionLayoutStore.load()!;
		expect(out.custom!.cols).toBe(24);
		expect(out.custom!.items.map((i) => i.els)).toEqual([
			["empire"],
			["production"],
		]);
		expect(out.folded).toEqual(["planet"]);
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
				preset: "wide",
				custom: null,
				folded: [],
			})
		).not.toThrow();
		expect(sessionLayoutStore.load()).toBeNull();
	});
});
