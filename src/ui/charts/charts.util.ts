import type { IChartBarItem, IChartTheme } from "@/ui/charts/charts.types";

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

// monospace keeps digits tabular, canvas text has no font-variant-numeric
const CHART_FONT = { family: "monospace", size: 12 };

/**
 * chart.js tooltip style shared by every chart: dark surface, 12 px.
 * @author jplacht
 *
 * @param {IChartTheme} theme from useChartTheme()
 */
export function chartTooltip(theme: IChartTheme) {
	return {
		backgroundColor: theme.surface,
		borderColor: theme.axis,
		borderWidth: 1,
		padding: 10,
		titleColor: theme.ink,
		bodyColor: theme.ink,
		titleFont: { ...CHART_FONT, weight: "bold" as const },
		bodyFont: CHART_FONT,
	};
}

/**
 * chart.js axis style shared by every chart: grid, axis line and ticks.
 * @author jplacht
 *
 * @param {IChartTheme} theme from useChartTheme()
 */
export function chartScale(theme: IChartTheme) {
	return {
		grid: { color: theme.grid },
		border: { color: theme.axis },
		ticks: { color: theme.muted, font: { size: 12 } },
	};
}
