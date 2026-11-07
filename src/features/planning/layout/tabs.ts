// Types & Interfaces
import type {
	ElementId,
	GridItem,
	JoinSide,
} from "@/features/planning/layout/planLayout.types";

/*
 * Two parts in one tab: an element listed in `join` shows in the tab of
 * the element before it in `els` (its host), below or beside it. A tab
 * holds at most two: a host is never joined itself.
 */

type Tabbed = Pick<GridItem, "els" | "join">;

/** An item's tabs: its elements but those shown with the one before */
export const tabsOf = (it: Tabbed): ElementId[] =>
	it.els.filter((e) => !it.join?.[e]);

/** The element shown with a tab's own one, if any */
export function partnerOf(it: Tabbed, host: ElementId): ElementId | undefined {
	const next = it.els[it.els.indexOf(host) + 1];
	return next && it.join?.[next] ? next : undefined;
}

/** The tab an element shows in: its own, or its host's */
export const hostOf = (it: Tabbed, el: ElementId): ElementId =>
	it.join?.[el] ? it.els[it.els.indexOf(el) - 1] : el;

/** A tab's elements: its own, then the one shown with it */
export function tabEls(it: Tabbed, host: ElementId): ElementId[] {
	const partner = partnerOf(it, host);
	return partner ? [host, partner] : [host];
}

/**
 * Takes an element out of an item's list; one shown with it becomes a
 * tab of its own there
 */
export function removeEl(it: GridItem, el: ElementId): void {
	const partner = it.join?.[el] ? undefined : partnerOf(it, el);
	if (partner) delete it.join![partner];
	if (it.join) delete it.join[el];
	it.els = it.els.filter((e) => e !== el);
}

/**
 * Fits the joins and the tab shown to the elements: no join on the first
 * element, none on an element whose host is joined itself, none on
 * elements it no longer has; the tab shown is a host
 *
 * @param {GridItem} it Item, changed in place
 * @returns {GridItem} The same item
 */
export function tidyJoin(it: GridItem): GridItem {
	const join: Partial<Record<ElementId, JoinSide>> = {};
	it.els.forEach((e, i) => {
		const side = it.join?.[e];
		if (side && i > 0 && !join[it.els[i - 1]]) join[e] = side;
	});
	if (Object.keys(join).length) it.join = join;
	else delete it.join;
	const active = it.els.includes(it.active) ? it.active : it.els[0];
	it.active = hostOf(it, active);
	return it;
}
