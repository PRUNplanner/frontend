import { computed, type ComputedRef, ref, type Ref, watch } from "vue";
import { isEqual } from "lodash-es";

// Types & Interfaces
import type {
	Arrangement,
	ElementId,
	FoldedByArrangement,
	GridLayout,
	IArrangements,
	ICustomLayout,
} from "@/features/planning/layout/planLayout.types";
import type {
	LayoutChoice,
	StoredLayout,
} from "@/features/planning/layout/planLayout.schemas";
import type { LayoutStore } from "@/features/planning/layout/layoutStore";

// Util
import { preferencesLayoutStore } from "@/features/planning/layout/layoutStore";
import {
	addNewElements,
	normaliseLayout,
} from "@/features/planning/layout/normaliseLayout";
import { presetLayout } from "@/features/planning/layout/presets";
import { ELEMENT_IDS } from "@/features/planning/layout/elements";
import { deepClone } from "@/util/data";

// the same once stored: undefined keys dropped, key order ignored
const same = (a: unknown, b: unknown): boolean =>
	isEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
// the layout without its folds
const unfolded = (l: StoredLayout) => ({ ...l, folded: undefined });

/**
 * The player's plan layout: Standard or Custom Layout (a Wide and maybe a
 * Phone arrangement), which items are folded per arrangement, and Tinted
 * parts, read from and written to a LayoutStore (the account, or the tab for
 * a visitor). A change that reaches the store from elsewhere (another tab, the
 * account's preferences arriving) is used at once; a layout change, not
 * a fold, also sets `changedElsewhere`.
 * Elements new to Custom Layout join it at the bottom once (`added`), when
 * the store has the latest, so another device's addition isn't repeated.
 * @author jplacht
 *
 * @param {LayoutStore} store Where it is kept
 * @param {Arrangement} start The arrangement on screen at first
 */
export function usePlanLayoutPreference(
	store: LayoutStore = preferencesLayoutStore,
	start: Arrangement = "wide"
) {
	const custom: Ref<ICustomLayout | null> = ref(null);
	const choice: Ref<LayoutChoice> = ref("standard");
	const foldedBy: Ref<FoldedByArrangement> = ref({ wide: [], phone: [] });
	// Tinted parts: a lighter background on every part, both arrangements
	const tinted: Ref<boolean> = ref(false);
	// the arrangement on screen: the page tells (its grid's width)
	const arrangement: Ref<Arrangement> = ref(start);
	// elements new to Custom Layout, added at its bottom this session
	const added: Ref<ElementId[]> = ref([]);
	// the stored layout changed elsewhere and is used here now
	const changedElsewhere: Ref<boolean> = ref(false);

	/** Custom Layout's wide arrangement, or Standard */
	const wide: ComputedRef<GridLayout> = computed(() =>
		choice.value === "custom" && custom.value
			? custom.value.wide
			: presetLayout("standard")
	);
	/** What the page shows: Phone on a phone when there is one, else Wide */
	const layout: ComputedRef<GridLayout> = computed(() =>
		arrangement.value === "phone" &&
		choice.value === "custom" &&
		custom.value?.phone
			? custom.value.phone
			: wide.value
	);
	const folded: ComputedRef<ElementId[]> = computed(
		() => foldedBy.value[arrangement.value]
	);

	function snapshot(): StoredLayout {
		return {
			v: 1,
			preset: choice.value,
			custom: custom.value,
			folded: foldedBy.value,
			...(tinted.value ? { tinted: true as const } : {}),
		};
	}
	function persist(): void {
		store.save(snapshot());
	}

	/** Uses a stored layout (a copy: the store's value is never changed here) */
	function adopt(stored: StoredLayout | null): void {
		const next = stored ? deepClone(stored) : null;
		custom.value = next?.custom ?? null;
		choice.value =
			next?.preset === "custom" && custom.value ? "custom" : "standard";
		foldedBy.value = next?.folded ?? { wide: [], phone: [] };
		tinted.value = next?.tinted ?? false;
	}
	adopt(store.load());

	/** A custom layout meets the elements added since it was saved */
	function meetNewElements(): void {
		if (!custom.value) return;
		const next = addNewElements(custom.value);
		if (next.added.length || !custom.value.known) {
			custom.value = next.custom;
			if (next.added.length) added.value = next.added;
			persist();
		}
	}

	// the store's latest: at once for the tab, when the account's
	// preferences arrive, and whenever another tab changes them. Its own
	// saves come back equal and change nothing. Folds from elsewhere are
	// used quietly: only a layout change (Standard or Custom, the grids,
	// Tinted parts) is a change elsewhere
	watch(
		() => [store.ready?.() ?? true, store.load()] as const,
		([ready, stored]) => {
			if (!ready) return;
			if (stored && !same(stored, snapshot())) {
				if (!same(unfolded(stored), unfolded(snapshot())))
					changedElsewhere.value = true;
				adopt(stored);
			}
			meetNewElements();
		},
		{ deep: true, immediate: true }
	);

	/**
	 * The Custom Layout this tab kept before layouts were saved to the
	 * account: taken when the account has none, a question when it has
	 * another one
	 *
	 * @param {StoredLayout | null} tab The tab's layout (takeTabLayout)
	 * @returns {"saved" | "ask" | null} Saved to the account, or the player chooses (applyTabLayout)
	 */
	function carryOver(tab: StoredLayout | null): "saved" | "ask" | null {
		if (!tab?.custom) return null;
		if (!custom.value) {
			applyTabLayout(tab);
			return "saved";
		}
		const grids = (c: ICustomLayout) => ({ wide: c.wide, phone: c.phone });
		return same(grids(tab.custom), grids(custom.value)) ? null : "ask";
	}

	/** The tab's Custom Layout replaces the saved one, with its folds and Tinted parts */
	function applyTabLayout(tab: StoredLayout): void {
		adopt({ ...tab, preset: "custom" });
		persist();
		meetNewElements();
	}

	/** Use Standard, or Custom Layout when there is one */
	function pick(next: LayoutChoice): void {
		if (next === "custom" && !custom.value) return;
		choice.value = next;
		persist();
	}

	/** Saves Custom Layout (Wide, and Phone or none) and uses it */
	function saveCustom(next: IArrangements): void {
		custom.value = {
			wide: normaliseLayout(next.wide),
			...(next.phone && { phone: normaliseLayout(next.phone, "phone") }),
			known: [...ELEMENT_IDS],
		};
		choice.value = "custom";
		persist();
	}

	/**
	 * Tinted parts on or off, for either layout and both arrangements; set
	 * while customising, kept at once (it changes no layout, so a Standard
	 * player stays on Standard)
	 */
	function setTinted(value: boolean): void {
		tinted.value = value;
		persist();
	}

	/** Folds or unfolds an item by its first element, in the arrangement on screen */
	function setFolded(el: ElementId, value: boolean): void {
		const which = arrangement.value;
		const rest = foldedBy.value[which].filter((e) => e !== el);
		foldedBy.value = {
			...foldedBy.value,
			[which]: value ? [...rest, el] : rest,
		};
		persist();
	}

	return {
		choice,
		custom,
		wide,
		layout,
		folded,
		tinted,
		arrangement,
		added,
		changedElsewhere,
		pick,
		carryOver,
		applyTabLayout,
		saveCustom,
		setFolded,
		setTinted,
	};
}
