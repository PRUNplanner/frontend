import type {
	IChartBarItem,
	IChartTheme,
	IChartZone,
	IStripDot,
	IStripItem,
} from "@/ui/charts/charts.types";

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

/**
 * Lays out a strip plot: every finite value up to `axis` becomes a dot,
 * sorted, never overlapping. Neighbours closer than `minGap` split between an
 * upper and a lower lane, single dots stay in the middle. Values beyond the
 * axis are returned as `over`.
 * @author jplacht
 *
 * @param {IStripItem[]} items values, any order; infinite ones are skipped
 * @param {number} axis axis end, the strip runs 0..axis
 * @param {number} minGap neighbours closer than this split into lanes,
 * by default 1/25 of the axis (1.2 d on 30 d), about one dot wide
 * @returns {{ dots: IStripDot[], over: IStripItem[] }} dots and the rest
 */
export function stripLayout(
	items: IStripItem[],
	axis: number,
	minGap = axis / 25
): { dots: IStripDot[]; over: IStripItem[] } {
	const finite = items
		.filter((i) => Number.isFinite(i.value))
		.sort((a, b) => a.value - b.value);
	const inside = finite.filter((i) => i.value <= axis);

	// close dots take the first of up / down whose last dot is minGap away;
	// when both are taken (many equal values, e.g. 0 d) the dot moves right
	// to minGap after the nearer lane's last one. A middle dot blocks both.
	const last = { up: -Infinity, down: -Infinity };
	const dots: IStripDot[] = inside.map((item, idx) => {
		const x = Math.max(item.value, 0);
		const close =
			x - Math.max(last.up, last.down) < minGap ||
			(idx < inside.length - 1 && inside[idx + 1].value - x < minGap);

		let lane: IStripDot["lane"] = "mid";
		let at = x;
		if (!close) {
			last.up = last.down = x;
		} else {
			if (x - last.up >= minGap) lane = "up";
			else if (x - last.down >= minGap) lane = "down";
			else lane = last.up <= last.down ? "up" : "down";
			at = Math.max(x, last[lane] + minGap);
			last[lane] = at;
		}

		return {
			...item,
			// ponytail: a dodged run can reach the axis end and pile up there
			pct: axis > 0 ? (Math.min(at, axis) / axis) * 100 : 0,
			lane,
		};
	});

	return { dots, over: finite.filter((i) => i.value > axis) };
}

/**
 * Zone of a days-left value: red up to `red`, yellow up to `yellow`.
 * @author jplacht
 *
 * @param {number} value days left
 * @param {number} red red threshold, inclusive
 * @param {number} yellow yellow threshold, inclusive
 * @returns {IChartZone} zone
 */
export function chartZone(
	value: number,
	red: number,
	yellow: number
): IChartZone {
	if (value <= red) return "red";
	if (value <= yellow) return "yellow";
	return "none";
}
