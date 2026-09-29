import type { IChartBarItem } from "@/ui/charts/charts.types";

/**
 * Sorts items by absolute value, keeps the largest `top` and sums the
 * rest into one uncoloured "Other" item.
 * @author jplacht
 *
 * @param {IChartBarItem[]} items chart items, any order
 * @param {number} top items kept before "Other"
 * @param {(n: number) => string} otherLabel label for n summed items
 * @returns {IChartBarItem[]} at most top + 1 items
 */
export function topWithOther(
	items: IChartBarItem[],
	top: number,
	otherLabel: (n: number) => string
): IChartBarItem[] {
	const sorted = [...items].sort(
		(a, b) => Math.abs(b.value) - Math.abs(a.value)
	);
	if (sorted.length <= top) return sorted;

	const rest = sorted.slice(top);
	return [
		...sorted.slice(0, top),
		{
			name: otherLabel(rest.length),
			value: rest.reduce((sum, i) => sum + i.value, 0),
		},
	];
}
