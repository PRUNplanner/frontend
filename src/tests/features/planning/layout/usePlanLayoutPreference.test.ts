import { describe, expect, it, vi } from "vitest";

// Util
import { usePlanLayoutPreference } from "@/features/planning/layout/usePlanLayoutPreference";
import { presetLayout } from "@/features/planning/layout/presets";
import {
	stackedLayout,
	wideLayout,
} from "@/tests/features/planning/layout/layout.fixtures";
import { sessionLayoutStore } from "@/features/planning/layout/layoutStore";
import { normaliseLayout } from "@/features/planning/layout/normaliseLayout";
import { ELEMENT_IDS } from "@/features/planning/layout/elements";

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

const none = { wide: [], phone: [] };
const known = [...ELEMENT_IDS];

describe("usePlanLayoutPreference", () => {
	it("starts with Standard and nothing folded", () => {
		const pref = usePlanLayoutPreference(memoryStore());
		expect(pref.choice.value).toBe("standard");
		expect(pref.custom.value).toBeNull();
		expect(pref.folded.value).toEqual([]);
		expect(pref.layout.value).toEqual(presetLayout("standard"));
		expect(pref.arrangement.value).toBe("wide");
		expect(pref.added.value).toEqual([]);
	});

	it("reads the tab's store by default", () => {
		sessionLayoutStore.save({
			v: 1,
			preset: "custom",
			custom: { wide: wideLayout(), known },
			folded: { wide: ["planet"], phone: [] },
		});
		const pref = usePlanLayoutPreference();
		expect(pref.choice.value).toBe("custom");
		expect(pref.layout.value).toEqual(wideLayout());
		expect(pref.folded.value).toEqual(["planet"]);
	});

	it("falls back to Standard when Custom Layout is chosen but missing", () => {
		const pref = usePlanLayoutPreference(
			memoryStore({ v: 1, preset: "custom", custom: null, folded: none })
		);
		expect(pref.choice.value).toBe("standard");
		// and can't pick it either
		pref.pick("custom");
		expect(pref.choice.value).toBe("standard");
	});

	it("picks Standard and keeps it, Custom Layout kept too", () => {
		const custom = { wide: stackedLayout(), known };
		const store = memoryStore({
			v: 1,
			preset: "custom",
			custom,
			folded: none,
		});
		const pref = usePlanLayoutPreference(store);
		pref.pick("standard");
		expect(pref.layout.value).toEqual(presetLayout("standard"));
		expect(pref.wide.value).toEqual(presetLayout("standard"));
		expect(store.save).toHaveBeenLastCalledWith({
			v: 1,
			preset: "standard",
			custom,
			folded: none,
		});
	});

	it("saves Custom Layout normalised and uses it", () => {
		const store = memoryStore();
		const pref = usePlanLayoutPreference(store);
		const mine = wideLayout();
		mine.cols = 99;
		pref.saveCustom({ wide: mine, phone: null });
		expect(pref.choice.value).toBe("custom");
		expect(pref.layout.value.cols).toBe(24);
		expect(store.load()?.custom?.wide.cols).toBe(24);
		expect(store.load()?.custom).not.toHaveProperty("phone");
		expect(store.load()?.custom?.known).toEqual(ELEMENT_IDS);
		// a preset is still there to go back to, Custom Layout stays
		pref.pick("standard");
		expect(pref.custom.value?.wide.cols).toBe(24);
		pref.pick("custom");
		expect(pref.layout.value.cols).toBe(24);
	});

	it("shows Phone on a phone, Wide elsewhere; Wide on a phone without one", () => {
		const store = memoryStore();
		const pref = usePlanLayoutPreference(store, "phone");
		const phone = normaliseLayout(stackedLayout(), "phone");
		pref.saveCustom({ wide: wideLayout(), phone: null });
		// no Phone arrangement: a phone shows Wide (packLayout stacks it)
		expect(pref.layout.value).toEqual(wideLayout());
		pref.saveCustom({ wide: wideLayout(), phone: stackedLayout() });
		expect(pref.layout.value).toEqual(phone);
		expect(store.load()?.custom?.phone).toEqual(phone);
		pref.arrangement.value = "wide";
		expect(pref.layout.value).toEqual(wideLayout());
		// Standard has no Phone arrangement
		pref.arrangement.value = "phone";
		pref.pick("standard");
		expect(pref.layout.value).toEqual(presetLayout("standard"));
	});

	it("folds per arrangement", () => {
		const store = memoryStore();
		const pref = usePlanLayoutPreference(store);
		pref.setFolded("planet", true);
		pref.setFolded("experts", true);
		pref.setFolded("planet", true);
		expect(pref.folded.value).toEqual(["experts", "planet"]);
		pref.setFolded("experts", false);
		expect(pref.folded.value).toEqual(["planet"]);
		pref.arrangement.value = "phone";
		expect(pref.folded.value).toEqual([]);
		pref.setFolded("workforce", true);
		expect(pref.folded.value).toEqual(["workforce"]);
		expect(store.load()).toMatchObject({
			preset: "standard",
			folded: { wide: ["planet"], phone: ["workforce"] },
		});
		pref.arrangement.value = "wide";
		expect(pref.folded.value).toEqual(["planet"]);
	});

	it("turns Tinted parts on and off, for every layout", () => {
		const store = memoryStore();
		const pref = usePlanLayoutPreference(store);
		expect(pref.tinted.value).toBe(false);
		pref.setTinted(true);
		// kept at once, and the layout chosen stays
		expect(store.load()).toMatchObject({
			preset: "standard",
			tinted: true,
		});
		pref.saveCustom({ wide: wideLayout(), phone: null });
		expect(store.load()).toMatchObject({ preset: "custom", tinted: true });
		expect(usePlanLayoutPreference(store).tinted.value).toBe(true);
		pref.setTinted(false);
		expect(store.load()).not.toHaveProperty("tinted");
	});

	describe("elements new to Custom Layout", () => {
		const withoutExperts = () => {
			const g = presetLayout("standard");
			return normaliseLayout({
				...g,
				items: g.items.filter((i) => !i.els.includes("experts")),
			});
		};

		it("marks a layout saved before `known` as knowing all, adding none", () => {
			const store = memoryStore({
				v: 1,
				preset: "custom",
				custom: { wide: withoutExperts() },
				folded: none,
			});
			const pref = usePlanLayoutPreference(store);
			expect(pref.added.value).toEqual([]);
			expect(pref.layout.value).toEqual(withoutExperts());
			expect(store.load()?.custom?.known).toEqual(ELEMENT_IDS);
		});

		it("adds one it hasn't seen once, at the bottom of both", () => {
			const store = memoryStore({
				v: 1,
				preset: "custom",
				custom: {
					wide: withoutExperts(),
					phone: normaliseLayout(withoutExperts(), "phone"),
					known: ELEMENT_IDS.filter((e) => e !== "experts"),
				},
				folded: none,
			});
			const pref = usePlanLayoutPreference(store);
			expect(pref.added.value).toEqual(["experts"]);
			expect(pref.wide.value.items.at(-1)?.els).toEqual(["experts"]);
			expect(pref.custom.value?.phone?.items.at(-1)?.els).toEqual([
				"experts",
			]);
			expect(store.save).toHaveBeenCalledTimes(1);
			// the next visit: nothing new any more
			const again = usePlanLayoutPreference(store);
			expect(again.added.value).toEqual([]);
			expect(store.save).toHaveBeenCalledTimes(1);
		});

		it("saves nothing when all is known", () => {
			const store = memoryStore({
				v: 1,
				preset: "custom",
				custom: { wide: wideLayout(), known },
				folded: none,
			});
			usePlanLayoutPreference(store);
			expect(store.save).not.toHaveBeenCalled();
		});
	});
});
