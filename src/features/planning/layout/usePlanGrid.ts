import {
	computed,
	type ComputedRef,
	nextTick,
	reactive,
	ref,
	type Ref,
} from "vue";

// Types & Interfaces
import type {
	ElementId,
	GridItem,
	GridLayout,
} from "@/features/planning/layout/planLayout.types";

// Composables
import { trackEvent } from "@/lib/analytics/useAnalytics";
import type { usePlanLayoutPreference } from "@/features/planning/layout/usePlanLayoutPreference";

// Util
import { ELEMENTS } from "@/features/planning/layout/elements";
import {
	hostOf,
	removeEl,
	tabsOf,
	tidyJoin,
} from "@/features/planning/layout/tabs";

/**
 * A layout without the elements this visitor can't use (POPR needs a login)
 *
 * @param {GridLayout} layout Layout
 * @param {boolean} loggedIn Logged in
 * @returns {GridLayout} Layout to show
 */
export function visibleLayout(
	layout: GridLayout,
	loggedIn: boolean
): GridLayout {
	if (loggedIn) return layout;
	const items = layout.items.flatMap((it) => {
		if (!it.els.some((e) => ELEMENTS[e].loggedIn)) return [it];
		// one shown with a hidden one gets a tab of its own
		const copy: GridItem = {
			...it,
			...(it.join && { join: { ...it.join } }),
		};
		for (const e of it.els) if (ELEMENTS[e].loggedIn) removeEl(copy, e);
		return copy.els.length ? [tidyJoin(copy)] : [];
	});
	return { ...layout, items };
}

/**
 * The plan grid outside customising: which tab each item shows, folding,
 * and focusing an element wherever it is (a tab, folded, kept in view or
 * hidden, then in a dialog)
 * @author jplacht
 *
 * @param {ReturnType<typeof usePlanLayoutPreference>} pref The player's layout
 * @param {() => boolean} loggedIn Logged in
 */
export function usePlanGrid(
	pref: ReturnType<typeof usePlanLayoutPreference>,
	loggedIn: () => boolean
) {
	const layout: ComputedRef<GridLayout> = computed(() =>
		visibleLayout(pref.layout.value, loggedIn())
	);
	// tabs switched on the page; not part of the layout
	const tabs = reactive<Record<string, ElementId>>({});
	// a hidden element, opened in a dialog
	const refDialog: Ref<ElementId | null> = ref(null);

	function showTab(item: string, el: ElementId): void {
		tabs[item] = el;
		trackEvent("plan:tool_toggle", { panel: el });
	}

	function fold(el: ElementId, value: boolean): void {
		pref.setFolded(el, value);
		trackEvent("plan:panel_fold", { panel: el, folded: value });
	}

	function focusElement(el: ElementId): void {
		const item = layout.value.items.find((i) => i.els.includes(el));
		if (!item) {
			refDialog.value = el;
			return;
		}
		if (tabsOf(item).length > 1) tabs[item.id] = hostOf(item, el);
		if (pref.folded.value.includes(item.els[0])) fold(item.els[0], false);
		void nextTick(() => {
			const box = document.querySelector<HTMLElement>(
				`[data-item="${item.id}"]`
			);
			box?.scrollIntoView({ block: "nearest", behavior: "smooth" });
			box?.focus({ preventScroll: true });
		});
	}

	return { layout, tabs, refDialog, showTab, fold, focusElement };
}
