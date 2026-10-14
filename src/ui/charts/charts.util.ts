import type {
	IChartBarItem,
	IChartTheme,
	IChartZone,
	IStripDot,
	IStripItem,
	IWaterfallColumn,
	IWaterfallLayout,
	IWaterfallSegmentBox,
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

/**
 * Short number for chart labels: 950, 13.4k, 1.2M.
 * @author jplacht
 *
 * @param {number} value number
 * @returns {string} e.g. "−13.4k"
 */
export function compactNumber(value: number): string {
	const abs = Math.abs(value);
	const sign = value < 0 ? "−" : "";
	const short = (n: number) => String(Math.round(n * 10) / 10);
	if (abs >= 1e6) return `${sign}${short(abs / 1e6)}M`;
	if (abs >= 1e3) return `${sign}${short(abs / 1e3)}k`;
	return `${sign}${Math.round(abs)}`;
}

/** a segment label inside its bar needs this height (px) */
const WATERFALL_INSIDE_PX = 22;
/** height of a label beside a bar (px) */
const WATERFALL_LABEL_PX = 14;

/**
 * Lays out a waterfall: totals stand on 0, steps float from the running
 * total, segments stack from a column's start. The y domain always holds 0
 * and leaves 10 % room above (value labels) and below a negative minimum.
 * A segment label sits inside its bar when the segment is at least 22 px
 * tall, else beside it, moved down off the column's connector and the
 * labels above it, or hidden when there is no room left (or `beside` is
 * false, on narrow charts).
 * @author jplacht
 *
 * @param {IWaterfallColumn[]} columns columns, left to right
 * @param {number} height plot height in px
 * @param {boolean} beside labels may sit beside a bar
 * @returns {IWaterfallLayout} ticks and boxes in px
 */
export function waterfallLayout(
	columns: IWaterfallColumn[],
	height: number,
	beside = true
): IWaterfallLayout {
	// running total: [from, to] per column
	let level = 0;
	const spans = columns.map((c) => {
		const from = c.kind === "total" ? 0 : level;
		level = c.kind === "total" ? c.value : level + c.value;
		return [from, level] as const;
	});

	let min = Math.min(0, ...spans.flat());
	let max = Math.max(0, ...spans.flat());
	const range = max - min || 1;
	max += range * 0.1;
	if (min < 0) min -= range * 0.1;
	const y = (v: number) => ((max - v) / (max - min)) * height;

	// 1, 2 or 5 × 10^n, about 4 ticks
	const rough = (max - min) / 4;
	const pow = 10 ** Math.floor(Math.log10(rough));
	const step = ([1, 2, 5, 10].find((m) => m * pow >= rough) ?? 10) * pow;
	const ticks: IWaterfallLayout["ticks"] = [];
	for (let v = Math.ceil(min / step) * step; v <= max; v += step)
		ticks.push({ value: v, y: y(v) });

	const boxes = columns.map((column, i) => {
		const [from, to] = spans[i];
		const dir = to >= from ? 1 : -1;
		const endY = y(to);
		const segments = column.segments.length
			? column.segments
			: [{ key: column.key, label: "", value: Math.abs(column.value) }];

		let cursor = from;
		const boxes: IWaterfallSegmentBox[] = segments.map((s) => {
			const next = cursor + dir * s.value;
			const top = y(Math.max(cursor, next));
			const segHeight = Math.abs(y(cursor) - y(next));
			cursor = next;
			// a bar without segments has no label, only its value above
			const labelAt: IWaterfallSegmentBox["labelAt"] =
				s.label && segHeight >= WATERFALL_INSIDE_PX
					? "inside"
					: "hidden";
			const labelTop = top + segHeight / 2 - WATERFALL_LABEL_PX / 2;
			return { ...s, top, height: segHeight, labelAt, labelTop };
		});

		// labels beside the bar, from the top: off the connector and each other
		const taken: [number, number][] = [[endY - 2, endY + 2]];
		const H = WATERFALL_LABEL_PX;
		const hits = (at: number) =>
			taken.filter(([a, b]) => at < b && at + H > a);
		for (const box of [...boxes].sort((p, q) => p.top - q.top)) {
			if (!beside || !box.label || box.labelAt === "inside") continue;
			// down past what it covers; at the plot bottom, up instead
			let at = box.labelTop;
			for (let hit = hits(at); hit.length; hit = hits(at))
				at = Math.max(...hit.map(([, b]) => b)) + 1;
			if (at + H > height) {
				at = Math.min(box.labelTop, height - H);
				for (let hit = hits(at); hit.length; hit = hits(at))
					at = Math.min(...hit.map(([a]) => a)) - H - 1;
			}
			if (at < 0) continue;
			box.labelAt = "beside";
			box.labelTop = at;
			taken.push([at, at + H]);
		}

		return {
			column,
			top: y(Math.max(from, to)),
			height: Math.abs(y(from) - y(to)),
			endY,
			segments: boxes,
		};
	});

	return { ticks, zeroY: y(0), columns: boxes };
}
