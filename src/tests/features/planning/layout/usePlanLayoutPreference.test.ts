import { describe, expect, it, vi } from "vitest";

// Util
import { usePlanLayoutPreference } from "@/features/planning/layout/usePlanLayoutPreference";
import { presetLayout } from "@/features/planning/layout/presets";
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
	it("starts with Today's and nothing folded", () => {
		const pref = usePlanLayoutPreference(memoryStore());
		expect(pref.choice.value).toBe("today");
		expect(pref.custom.value).toBeNull();
		expect(pref.folded.value).toEqual([]);
		expect(pref.layout.value).toEqual(presetLayout("today"));
	});

	it("reads the tab's store by default", () => {
		sessionLayoutStore.save({
			v: 1,
			preset: "wide",
			custom: null,
			folded: ["planet"],
		});
		const pref = usePlanLayoutPreference();
		expect(pref.choice.value).toBe("wide");
		expect(pref.folded.value).toEqual(["planet"]);
	});

	it("falls back to Today's when Custom Layout is chosen but missing", () => {
		const pref = usePlanLayoutPreference(
			memoryStore({ v: 1, preset: "custom", custom: null, folded: [] })
		);
		expect(pref.choice.value).toBe("today");
		// and can't pick it either
		pref.pick("custom");
		expect(pref.choice.value).toBe("today");
	});

	it("picks a preset and keeps it", () => {
		const store = memoryStore();
		const pref = usePlanLayoutPreference(store);
		pref.pick("stacked");
		expect(pref.layout.value).toEqual(presetLayout("stacked"));
		expect(store.save).toHaveBeenLastCalledWith({
			v: 1,
			preset: "stacked",
			custom: null,
			folded: [],
		});
	});

	it("saves Custom Layout normalised and uses it", () => {
		const store = memoryStore();
		const pref = usePlanLayoutPreference(store);
		const mine = presetLayout("wide");
		mine.cols = 99;
		pref.saveCustom(mine);
		expect(pref.choice.value).toBe("custom");
		expect(pref.layout.value.cols).toBe(24);
		expect(store.load()?.custom?.cols).toBe(24);
		// a preset is still there to go back to, Custom Layout stays
		pref.pick("today");
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
			preset: "today",
			folded: ["planet"],
		});
	});
});
