import { computed, type ComputedRef, ref, type Ref } from "vue";

// Types & Interfaces
import type {
	ElementId,
	GridLayout,
} from "@/features/planning/layout/planLayout.types";
import type { LayoutChoice } from "@/features/planning/layout/planLayout.schemas";
import type { LayoutStore } from "@/features/planning/layout/layoutStore";

// Util
import { sessionLayoutStore } from "@/features/planning/layout/layoutStore";
import { normaliseLayout } from "@/features/planning/layout/normaliseLayout";
import { presetLayout } from "@/features/planning/layout/presets";

/**
 * The player's plan layout: a preset or Custom Layout, which items
 * are folded and Tinted parts, read from and written to a LayoutStore
 * (this tab for now)
 * @author jplacht
 *
 * @param {LayoutStore} store Where it is kept
 */
export function usePlanLayoutPreference(
	store: LayoutStore = sessionLayoutStore
) {
	const stored = store.load();
	const custom: Ref<GridLayout | null> = ref(stored?.custom ?? null);
	const choice: Ref<LayoutChoice> = ref(
		stored?.preset === "custom" && !custom.value
			? "standard"
			: (stored?.preset ?? "standard")
	);
	const folded: Ref<ElementId[]> = ref(stored?.folded ?? []);
	// Tinted parts: a lighter background on every part
	const tinted: Ref<boolean> = ref(stored?.tinted ?? false);

	const layout: ComputedRef<GridLayout> = computed(() =>
		choice.value === "custom" && custom.value
			? custom.value
			: presetLayout(
					choice.value === "custom" ? "standard" : choice.value
				)
	);

	function persist(): void {
		store.save({
			v: 1,
			preset: choice.value,
			custom: custom.value,
			folded: folded.value,
			...(tinted.value ? { tinted: true as const } : {}),
		});
	}

	/** Use a preset, or Custom Layout when there is one */
	function pick(next: LayoutChoice): void {
		if (next === "custom" && !custom.value) return;
		choice.value = next;
		persist();
	}

	/** Saves Custom Layout and uses it */
	function saveCustom(next: GridLayout): void {
		custom.value = normaliseLayout(next);
		choice.value = "custom";
		persist();
	}

	/** Folds or unfolds an item by its first element */
	function setFolded(el: ElementId, value: boolean): void {
		const rest = folded.value.filter((e) => e !== el);
		folded.value = value ? [...rest, el] : rest;
		persist();
	}

	/** Tinted parts on or off, for every layout */
	function setTinted(value: boolean): void {
		tinted.value = value;
		persist();
	}

	return {
		choice,
		custom,
		layout,
		folded,
		tinted,
		pick,
		saveCustom,
		setFolded,
		setTinted,
	};
}
