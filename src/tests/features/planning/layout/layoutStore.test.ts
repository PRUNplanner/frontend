import { beforeEach, describe, expect, it, vi } from "vitest";
import { isReactive } from "vue";
import { createPinia, setActivePinia } from "pinia";

// Stores
import { useUserStore } from "@/stores/userStore";

// Util
import {
	preferencesLayoutStore,
	standardLayoutStore,
	takeTabLayout,
} from "@/features/planning/layout/layoutStore";
import {
	STORAGE_KEY,
	standardStoredLayout,
} from "@/features/planning/layout/planLayout.constants";
import { presetLayout } from "@/features/planning/layout/presets";
import { wideLayout } from "@/tests/features/planning/layout/layout.fixtures";

// Types & Interfaces
import type { StoredLayout } from "@/features/planning/layout/planLayout.schemas";

const custom = (): StoredLayout => ({
	v: 1,
	preset: "custom",
	custom: {
		wide: wideLayout(),
		phone: { ...presetLayout("standard"), cols: 2 },
		known: ["planet"],
	},
	folded: { wide: ["planet"], phone: [] },
	tinted: true,
});

describe("preferencesLayoutStore", () => {
	beforeEach(() => setActivePinia(createPinia()));

	it("reads Standard from the defaults", () => {
		expect(preferencesLayoutStore.load()).toEqual(standardStoredLayout());
	});

	it("writes the planLayout preference, a copy", () => {
		const userStore = useUserStore();
		const v = custom();
		preferencesLayoutStore.save(v);
		expect(userStore.preferences.planLayout).toEqual(v);
		v.folded.wide.push("empire");
		expect(userStore.preferences.planLayout.folded.wide).toEqual([
			"planet",
		]);
		// reactive, so the page follows changes from other tabs
		expect(isReactive(preferencesLayoutStore.load())).toBe(true);
	});

	it("is ready once the account's preferences arrived", () => {
		const userStore = useUserStore();
		expect(preferencesLayoutStore.ready!()).toBe(false);
		userStore.preferencesLoaded = true;
		expect(preferencesLayoutStore.ready!()).toBe(true);
	});
});

describe("standardLayoutStore", () => {
	it("gives a visitor Standard and keeps nothing", () => {
		expect(standardLayoutStore.load()).toBeNull();
		standardLayoutStore.save(custom());
		expect(standardLayoutStore.load()).toBeNull();
		expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
	});
});

describe("takeTabLayout", () => {
	it("reads the tab's Custom Layout once and clears it", () => {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(custom()));
		const out = takeTabLayout()!;
		expect(out.custom!.wide).toEqual(wideLayout());
		expect(out.custom!.phone!.cols).toBe(2);
		expect(out.custom!.known).toEqual(["planet"]);
		expect(out.folded).toEqual({ wide: ["planet"], phone: [] });
		expect(out.tinted).toBe(true);
		expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
		expect(takeTabLayout()).toBeNull();
	});

	it("reads the earlier shape: one grid is Wide, one list Wide's folds", () => {
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				v: 1,
				preset: "standard",
				custom: { cols: 30, items: [{ els: ["empire", "nope"] }] },
				folded: ["planet", "nope"],
			})
		);
		const out = takeTabLayout()!;
		expect(out.custom!.wide.cols).toBe(24);
		expect(out.custom!.wide.items.map((i) => i.els)).toEqual([
			["empire"],
			["production"],
		]);
		expect(out.custom!.phone).toBeUndefined();
		expect(out.folded).toEqual({ wide: ["planet"], phone: [] });
		expect(out).not.toHaveProperty("tinted");
	});

	it("reads nothing, no Custom Layout, broken JSON or an unknown shape as none, clearing it", () => {
		expect(takeTabLayout()).toBeNull();
		for (const raw of [
			"{oops",
			JSON.stringify({ v: 0, rows: [], preset: "standard" }),
			JSON.stringify({ v: 1, preset: "mine", custom: null }),
			JSON.stringify(standardStoredLayout()),
		]) {
			sessionStorage.setItem(STORAGE_KEY, raw);
			expect(takeTabLayout()).toBeNull();
			expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
		}
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
		expect(takeTabLayout()).toBeNull();
		vi.unstubAllGlobals();
	});
});
