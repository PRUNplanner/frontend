// Types & Interfaces
import type {
	ElementId,
	GridItem,
	JoinSide,
} from "@/features/planning/layout/planLayout.types";

// Util
import { H_MAX, H_MIN } from "@/features/planning/layout/planLayout.constants";

/*
 * Parts in one tab: an element listed in `join` shows in the tab of the
 * element before it in `els`, below or beside it. A tab is its host (an
 * element not joined) and the run of joined elements after it, all on
 * one side.
 */

type Tabbed = Pick<GridItem, "els" | "join">;

/** An item's tabs: its elements but those shown with the one before */
export const tabsOf = (it: Tabbed): ElementId[] =>
	it.els.filter((e) => !it.join?.[e]);

/** The elements shown with a tab's own one, in order */
export function partsOf(it: Tabbed, host: ElementId): ElementId[] {
	const out: ElementId[] = [];
	for (let i = it.els.indexOf(host) + 1; it.join?.[it.els[i]]; i++)
		out.push(it.els[i]);
	return out;
}

/** Below or beside: how a tab of several parts lays them out */
export const sideOf = (it: Tabbed, host: ElementId): JoinSide | undefined =>
	it.join?.[partsOf(it, host)[0]];

/** The tab an element shows in: its own, or its host's */
export function hostOf(it: Tabbed, el: ElementId): ElementId {
	let i = it.els.indexOf(el);
	while (i > 0 && it.join?.[it.els[i]]) i--;
	return it.els[i] ?? el;
}

/** A tab's elements: its own, then the ones shown with it */
export const tabEls = (it: Tabbed, host: ElementId): ElementId[] => [
	host,
	...partsOf(it, host),
];

/**
 * A tab's name: its element, "A & B" for two, "A +2" for more
 *
 * @param {ElementId[]} els The tab's elements
 * @param {Function} label An element's name
 * @param {Function} t Translate
 * @returns {string} Name
 */
export function tabName(
	els: ElementId[],
	label: (el: ElementId) => string,
	t: (key: string, params: Record<string, string | number>) => string
): string {
	if (els.length === 1) return label(els[0]);
	if (els.length === 2)
		return t("plan.layout.pair", { a: label(els[0]), b: label(els[1]) });
	return t("plan.layout.more", { name: label(els[0]), n: els.length - 1 });
}

/** A tab's full name: "A, B & C" */
export function tabFullName(
	els: ElementId[],
	label: (el: ElementId) => string,
	t: (key: string, params: Record<string, string | number>) => string
): string {
	if (els.length < 3) return tabName(els, label, t);
	const names = els.map(label);
	return t("plan.layout.list", {
		rest: names.slice(0, -1).join(", "),
		last: names.at(-1)!,
	});
}

/**
 * Takes an element out of an item's list. A tab's own element leaves its
 * next part as the tab's own; a part leaves the others joined (the part
 * after it loses its size: it now follows another).
 */
export function removeEl(it: GridItem, el: ElementId): void {
	const i = it.els.indexOf(el);
	if (i < 0) return;
	const next = it.els[i + 1];
	if (next && it.join?.[next]) {
		if (!it.join[el]) delete it.join[next];
		if (it.joinSize) delete it.joinSize[next];
	}
	if (it.join) delete it.join[el];
	if (it.joinSize) delete it.joinSize[el];
	if (it.active === el && next && !it.join?.[next]) it.active = next;
	it.els = it.els.filter((e) => e !== el);
}

/**
 * Fits the joins, their sizes and the tab shown to the elements: no join
 * on the first element, one side per tab (its first part's), none on
 * elements it no longer has; sizes only of joins it keeps, within limits,
 * a tab's beside sizes leaving its last part a column; the tab shown is
 * a host
 *
 * @param {GridItem} it Item, changed in place
 * @returns {GridItem} The same item
 */
export function tidyJoin(it: GridItem): GridItem {
	const join: Partial<Record<ElementId, JoinSide>> = {};
	it.els.forEach((e, i) => {
		const side = it.join?.[e];
		if (!side || i === 0) return;
		join[e] = join[it.els[i - 1]] ?? side;
	});
	if (Object.keys(join).length) it.join = join;
	else delete it.join;
	// sizes of the joins it keeps: columns within its width, px within limits
	const size: Partial<Record<ElementId, number>> = {};
	let used = 0;
	for (const e of it.els) {
		const n = it.joinSize?.[e];
		if (join[e] !== "beside") used = 0;
		if (n === undefined || !join[e]) continue;
		if (join[e] === "below") size[e] = Math.min(Math.max(n, H_MIN), H_MAX);
		else {
			const v = Math.min(Math.max(n, 1), it.w - 1 - used);
			if (v >= 1) {
				size[e] = v;
				used += v;
			}
		}
	}
	if (Object.keys(size).length) it.joinSize = size;
	else delete it.joinSize;
	const active = it.els.includes(it.active) ? it.active : it.els[0];
	it.active = hostOf(it, active);
	return it;
}
