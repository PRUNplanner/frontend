import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";

// Stores
import { useUserStore } from "@/stores/userStore";

// Util
import { usePlanLayoutPreference } from "@/features/planning/layout/usePlanLayoutPreference";
import { presetLayout } from "@/features/planning/layout/presets";
import {
	stackedLayout,
	wideLayout,
} from "@/tests/features/planning/layout/layout.fixtures";
import { normaliseLayout } from "@/features/planning/layout/normaliseLayout";
import { ELEMENT_IDS } from "@/features/planning/layout/elements";
import { deepClone } from "@/util/data";

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

// a store whose value changes elsewhere (another tab, the account's GET)
const sharedStore = (initial: StoredLayout | null, ready = true) => {
	const value = ref<StoredLayout | null>(initial);
	const isReady = ref(ready);
	const store = {
		load: () => value.value,
		save: vi.fn((v: StoredLayout) => (value.value = deepClone(v))),
		ready: () => isReady.value,
	} satisfies LayoutStore;
	return { store, value, isReady };
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

	it("reads the account's preferences by default", () => {
		setActivePinia(createPinia());
		useUserStore().setPreference("planLayout", {
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

	describe("the store changed elsewhere", () => {
		const customised = (): StoredLayout => ({
			v: 1,
			preset: "custom",
			custom: { wide: wideLayout(), known },
			folded: { wide: ["planet"], phone: [] },
			tinted: true,
		});

		it("uses the new layout at once and says so", async () => {
			const { store, value } = sharedStore(null);
			const pref = usePlanLayoutPreference(store);
			value.value = customised();
			await nextTick();
			expect(pref.choice.value).toBe("custom");
			expect(pref.layout.value).toEqual(wideLayout());
			expect(pref.folded.value).toEqual(["planet"]);
			expect(pref.tinted.value).toBe(true);
			expect(pref.changedElsewhere.value).toBe(true);
			// a copy: the store's value is never changed here
			pref.setFolded("empire", true);
			expect(value.value?.folded.wide).toEqual(["planet", "empire"]);
		});

		it("doesn't take its own saves for a change elsewhere", async () => {
			const { store } = sharedStore(null);
			const pref = usePlanLayoutPreference(store);
			pref.saveCustom({ wide: wideLayout(), phone: null });
			pref.setFolded("planet", true);
			pref.setTinted(true);
			await nextTick();
			expect(pref.changedElsewhere.value).toBe(false);
		});

		it("adds new elements only once the store has the latest", async () => {
			const g = presetLayout("standard");
			const without = normaliseLayout({
				...g,
				items: g.items.filter((i) => !i.els.includes("experts")),
			});
			const stale: StoredLayout = {
				v: 1,
				preset: "custom",
				custom: {
					wide: without,
					known: ELEMENT_IDS.filter((e) => e !== "experts"),
				},
				folded: none,
			};
			const { store, value, isReady } = sharedStore(stale, false);
			const pref = usePlanLayoutPreference(store);
			expect(pref.added.value).toEqual([]);
			expect(store.save).not.toHaveBeenCalled();
			// another device added it already: placed, nothing new here
			value.value = {
				...stale,
				custom: { wide: presetLayout("standard"), known },
			};
			isReady.value = true;
			await nextTick();
			expect(pref.added.value).toEqual([]);
			expect(store.save).not.toHaveBeenCalled();
			expect(pref.wide.value).toEqual(presetLayout("standard"));
		});
	});

	describe("carrying over the tab's layout", () => {
		const tab = (): StoredLayout => ({
			v: 1,
			preset: "standard",
			custom: { wide: wideLayout(), known },
			folded: { wide: ["planet"], phone: [] },
			tinted: true,
		});

		it("does nothing without a tab layout", () => {
			const store = memoryStore();
			const pref = usePlanLayoutPreference(store);
			expect(pref.carryOver(null)).toBeNull();
			expect(store.save).not.toHaveBeenCalled();
		});

		it("saves it when the account has none, with folds and Tinted parts", () => {
			const store = memoryStore();
			const pref = usePlanLayoutPreference(store);
			expect(pref.carryOver(tab())).toBe("saved");
			expect(pref.choice.value).toBe("custom");
			expect(store.load()).toEqual({ ...tab(), preset: "custom" });
		});

		it("does nothing when the account has the same one", () => {
			const store = memoryStore({
				...tab(),
				folded: none,
				tinted: undefined,
			});
			const pref = usePlanLayoutPreference(store);
			expect(pref.carryOver(tab())).toBeNull();
			expect(store.save).not.toHaveBeenCalled();
		});

		it("asks when the account has another, and applies the tab's on request", () => {
			const store = memoryStore({
				v: 1,
				preset: "standard",
				custom: { wide: presetLayout("standard"), known },
				folded: none,
			});
			const pref = usePlanLayoutPreference(store);
			expect(pref.carryOver(tab())).toBe("ask");
			expect(store.save).not.toHaveBeenCalled();
			pref.applyTabLayout(tab());
			expect(pref.layout.value).toEqual(wideLayout());
			expect(store.load()).toEqual({ ...tab(), preset: "custom" });
		});
	});
});
