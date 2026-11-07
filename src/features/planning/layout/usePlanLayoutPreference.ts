import { computed, type ComputedRef, ref, type Ref } from "vue";

// Types & Interfaces
import type {
	Arrangement,
	ElementId,
	FoldedByArrangement,
	GridLayout,
	IArrangements,
	ICustomLayout,
} from "@/features/planning/layout/planLayout.types";
import type { LayoutChoice } from "@/features/planning/layout/planLayout.schemas";
import type { LayoutStore } from "@/features/planning/layout/layoutStore";

// Util
import { sessionLayoutStore } from "@/features/planning/layout/layoutStore";
import {
	addNewElements,
	normaliseLayout,
} from "@/features/planning/layout/normaliseLayout";
import { presetLayout } from "@/features/planning/layout/presets";
import { ELEMENT_IDS } from "@/features/planning/layout/elements";

/**
 * The player's plan layout: Standard or Custom Layout (a Wide and maybe a
 * Phone arrangement), which items are folded per arrangement, and Tinted
 * parts, read from and written to a LayoutStore (this tab for now). Elements
 * new to Custom Layout join it at the bottom once (`added`).
 * @author jplacht
 *
 * @param {LayoutStore} store Where it is kept
 * @param {Arrangement} start The arrangement on screen at first
 */
export function usePlanLayoutPreference(
	store: LayoutStore = sessionLayoutStore,
	start: Arrangement = "wide"
) {
	const stored = store.load();
	const custom: Ref<ICustomLayout | null> = ref(stored?.custom ?? null);
	const choice: Ref<LayoutChoice> = ref(
		stored?.preset === "custom" && !custom.value
			? "standard"
			: (stored?.preset ?? "standard")
	);
	const foldedBy: Ref<FoldedByArrangement> = ref(
		stored?.folded ?? { wide: [], phone: [] }
	);
	// Tinted parts: a lighter background on every part, both arrangements
	const tinted: Ref<boolean> = ref(stored?.tinted ?? false);
	// the arrangement on screen: the page tells (its grid's width)
	const arrangement: Ref<Arrangement> = ref(start);
	// elements new to Custom Layout, added at its bottom this session
	const added: Ref<ElementId[]> = ref([]);

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

	function persist(): void {
		store.save({
			v: 1,
			preset: choice.value,
			custom: custom.value,
			folded: foldedBy.value,
			...(tinted.value ? { tinted: true as const } : {}),
		});
	}

	// a custom layout meets the elements added since it was saved
	if (custom.value) {
		const next = addNewElements(custom.value);
		if (next.added.length || !custom.value.known) {
			custom.value = next.custom;
			added.value = next.added;
			persist();
		}
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
		pick,
		saveCustom,
		setFolded,
		setTinted,
	};
}
