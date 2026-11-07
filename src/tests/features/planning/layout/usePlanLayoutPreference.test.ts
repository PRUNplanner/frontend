import { describe, expect, it, vi } from "vitest";

// Util
import { usePlanLayoutPreference } from "@/features/planning/layout/usePlanLayoutPreference";
import { presetLayout } from "@/features/planning/layout/presets";
import {
	stackedLayout,
	wideLayout,
} from "@/tests/features/planning/layout/layout.fixtures";
import { sessionLayoutStore } from "@/features/planning/layout/layoutStore";

// Types & Interfaces
import type { LayoutStore } from "@/features/planning/layout/layoutStore";
import type { StoredLayout } from "@/features/planning/layout/planLayout.schemas";

const memoryStore = (initial: StoredLayout | null = null) => {
	let value = initial;
	const store: LayoutStore = {
		load: () => value,
		save: vi.fn((v: StoredLayout) => (value = v)),
	};
	return store;
};

describe("usePlanLayoutPreference", () => {
	it("starts with Standard and nothing folded", () => {
		const pref = usePlanLayoutPreference(memoryStore());
		expect(pref.choice.value).toBe("standard");
		expect(pref.custom.value).toBeNull();
		expect(pref.folded.value).toEqual([]);
		expect(pref.layout.value).toEqual(presetLayout("standard"));
	});

	it("reads the tab's store by default", () => {
		sessionLayoutStore.save({
			v: 1,
			preset: "custom",
			custom: wideLayout(),
			folded: ["planet"],
		});
		const pref = usePlanLayoutPreference();
		expect(pref.choice.value).toBe("custom");
		expect(pref.layout.value).toEqual(wideLayout());
		expect(pref.folded.value).toEqual(["planet"]);
	});

	it("falls back to Standard when Custom Layout is chosen but missing", () => {
		const pref = usePlanLayoutPreference(
			memoryStore({ v: 1, preset: "custom", custom: null, folded: [] })
		);
		expect(pref.choice.value).toBe("standard");
		// and can't pick it either
		pref.pick("custom");
		expect(pref.choice.value).toBe("standard");
	});

	it("picks Standard and keeps it, Custom Layout kept too", () => {
		const custom = stackedLayout();
		const store = memoryStore({
			v: 1,
			preset: "custom",
			custom,
			folded: [],
		});
		const pref = usePlanLayoutPreference(store);
		pref.pick("standard");
		expect(pref.layout.value).toEqual(presetLayout("standard"));
		expect(store.save).toHaveBeenLastCalledWith({
			v: 1,
			preset: "standard",
			custom,
			folded: [],
		});
	});

	it("saves Custom Layout normalised and uses it", () => {
		const store = memoryStore();
		const pref = usePlanLayoutPreference(store);
		const mine = wideLayout();
		mine.cols = 99;
		pref.saveCustom(mine);
		expect(pref.choice.value).toBe("custom");
		expect(pref.layout.value.cols).toBe(24);
		expect(store.load()?.custom?.cols).toBe(24);
		// a preset is still there to go back to, Custom Layout stays
		pref.pick("standard");
		expect(pref.custom.value?.cols).toBe(24);
		pref.pick("custom");
		expect(pref.layout.value.cols).toBe(24);
	});

	it("folds and unfolds without changing the layout chosen", () => {
		const store = memoryStore();
		const pref = usePlanLayoutPreference(store);
		pref.setFolded("planet", true);
		pref.setFolded("experts", true);
		pref.setFolded("planet", true);
		expect(pref.folded.value).toEqual(["experts", "planet"]);
		pref.setFolded("experts", false);
		expect(pref.folded.value).toEqual(["planet"]);
		expect(store.load()).toMatchObject({
			preset: "standard",
			folded: ["planet"],
		});
	});

	it("turns Tinted parts on and off, for every layout", () => {
		const store = memoryStore();
		const pref = usePlanLayoutPreference(store);
		expect(pref.tinted.value).toBe(false);
		pref.setTinted(true);
		expect(store.load()).toMatchObject({
			preset: "standard",
			tinted: true,
		});
		pref.saveCustom(wideLayout());
		expect(store.load()).toMatchObject({ preset: "custom", tinted: true });
		expect(usePlanLayoutPreference(store).tinted.value).toBe(true);
		pref.setTinted(false);
		expect(store.load()).not.toHaveProperty("tinted");
	});
});
