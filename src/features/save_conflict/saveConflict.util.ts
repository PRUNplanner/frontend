import { isEqual } from "lodash-es";

// Types & Interfaces
import type {
	IChangeLine,
	IChanges,
} from "@/features/save_conflict/saveConflict.types";

/**
 * Why a save failed: saved in another tab meanwhile (409 conflict) or
 * deleted there (404). Anything else is null.
 *
 * @param {unknown} err Error thrown by the save
 * @returns {"conflict" | "deleted" | null} Reason
 */
export function getSaveError(err: unknown): "conflict" | "deleted" | null {
	const { status, responseData } = (err ?? {}) as {
		status?: number;
		responseData?: { code?: string };
	};
	if (status === 409 && responseData?.code === "conflict") return "conflict";
	if (status === 404) return "deleted";
	return null;
}

/**
 * Matches two lists by key, never by position
 *
 * @param {T[]} from Old list
 * @param {T[]} to New list
 * @param {(item: T) => string} keyOf Key of an item
 * @returns Added, removed and changed (old, new) items
 */
export function diffByKey<T>(
	from: T[],
	to: T[],
	keyOf: (item: T) => string
): { added: T[]; removed: T[]; changed: [T, T][] } {
	const old = new Map(from.map((item) => [keyOf(item), item]));
	const now = new Map(to.map((item) => [keyOf(item), item]));

	return {
		added: to.filter((item) => !old.has(keyOf(item))),
		removed: from.filter((item) => !now.has(keyOf(item))),
		changed: to
			.filter((item) => {
				const before = old.get(keyOf(item));
				return before !== undefined && !isEqual(before, item);
			})
			.map((item) => [old.get(keyOf(item))!, item]),
	};
}

/**
 * Changes of the other tab and of this one, both from the loaded version
 *
 * @param {T} loaded Version this tab started from
 * @param {T} saved Version the other tab saved
 * @param {T} mine This tab's edits
 * @param {(from: T, to: T) => IChangeLine[]} diff Diff of the type
 * @returns {IChanges} Both lists and the areas in both
 */
export function threeWay<T>(
	loaded: T,
	saved: T,
	mine: T,
	diff: (from: T, to: T) => IChangeLine[]
): IChanges {
	const theirs = diff(loaded, saved);
	const own = diff(loaded, mine);
	const theirAreas = new Set(theirs.map((l) => l.area));

	return {
		theirs,
		mine: own,
		both: [
			...new Set(
				own.map((l) => l.area).filter((area) => theirAreas.has(area))
			),
		],
	};
}

/**
 * Shortens a long list
 *
 * @param {IChangeLine[]} lines Lines
 * @param {number} [max=8] Lines to show
 * @returns Lines to show and how many are left out
 */
export function collapse(
	lines: IChangeLine[],
	max: number = 8
): { shown: IChangeLine[]; more: number } {
	// "and 1 more" takes a line too, show it instead
	if (lines.length <= max + 1) return { shown: lines, more: 0 };
	return { shown: lines.slice(0, max), more: lines.length - max };
}
