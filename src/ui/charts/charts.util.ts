import type {
	IChartBarItem,
	IChartTheme,
	IChartZone,
	ILineLabel,
	ILineSeries,
	ILineTooltipRow,
	ISparklineLayout,
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
		// mono keeps digits tabular, canvas text has no font-variant-numeric
		titleFont: { family: theme.mono, size: 12, weight: "bold" as const },
		bodyFont: { family: theme.mono, size: 12 },
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

/**
 * How a chart's x labels fit their slot, wrapped only at spaces: `sm` text,
 * `xs` text when a word is too wide for `sm`, or `tilt` (xs on one line,
 * turned) when a word is too wide even for `xs`.
 * ponytail: a word's width is estimated from its length (7 / 6.2 px per
 * character at sm / xs); measure the text if labels get wider glyphs.
 * @author jplacht
 *
 * @param {string[]} labels the labels
 * @param {number} slot px per label
 * @returns {"sm" | "xs" | "tilt"} the label style
 */
export function labelFit(
	labels: string[],
	slot: number
): "sm" | "xs" | "tilt" {
	const longest = Math.max(
		0,
		...labels.flatMap((l) => l.split(/\s+/)).map((w) => w.length)
	);
	if (longest * 7 <= slot - 8) return "sm";
	if (longest * 6.2 <= slot - 4) return "xs";
	return "tilt";
}

/** a segment label inside its bar needs this height (px) */
const WATERFALL_INSIDE_PX = 22;
/** height of a label beside a bar (px): two lines, its name over its value,
 *  so it fits the narrow gap to the next bar */
const WATERFALL_LABEL_PX = 28;

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

/**
 * Lays out a sparkline in a width × height box, with its own y-scale
 * (direction only), or a shared one. Gaps (null) break the line, a value
 * between two gaps is a lone point; a flat line sits in the middle.
 * @author jplacht
 *
 * @param {(number | null)[]} points values, oldest first
 * @param {number} width box width in px
 * @param {number} height box height in px
 * @param {number} pad room kept free at every edge, e.g. for the end dot
 * @param {[number, number]} [domain] a y-range shared with other sparklines
 * @returns {ISparklineLayout} polylines, lone points and the end point
 */
export function sparklineLayout(
	points: (number | null)[],
	width: number,
	height: number,
	pad = 3,
	domain?: [number, number]
): ISparklineLayout {
	const values = points.filter((p): p is number => p !== null);
	if (!values.length) return { lines: [], dots: [], end: null };

	const min = domain?.[0] ?? Math.min(...values);
	const span = (domain?.[1] ?? Math.max(...values)) - min;
	const step = points.length > 1 ? (width - 2 * pad) / (points.length - 1) : 0;
	const at = (v: number, i: number) => ({
		x: Math.round((pad + i * step) * 10) / 10,
		y:
			Math.round(
				(span ? pad + (1 - (v - min) / span) * (height - 2 * pad) : height / 2) *
					10
			) / 10,
	});

	const lines: string[] = [];
	const dots: ISparklineLayout["dots"] = [];
	let run: { x: number; y: number }[] = [];
	const close = () => {
		if (run.length === 1) dots.push(run[0]);
		if (run.length) lines.push(run.map((p) => `${p.x},${p.y}`).join(" "));
		run = [];
	};
	let end: ISparklineLayout["end"] = null;
	points.forEach((v, i) => {
		if (v === null) return close();
		end = at(v, i);
		run.push(end);
	});
	close();
	return { lines, dots, end };
}

/**
 * Places direct line labels at their line's y, pushed apart to at least
 * `gap` px and kept between `top` and `bottom` (label middles).
 * @author jplacht
 *
 * @param {ILineLabel[]} labels wanted positions, any order
 * @param {number} gap minimum distance between label middles
 * @param {number} top highest allowed middle
 * @param {number} bottom lowest allowed middle
 * @returns {ILineLabel[]} placed labels, top to bottom
 */
export function lineLabelLayout(
	labels: ILineLabel[],
	gap: number,
	top: number,
	bottom: number
): ILineLabel[] {
	const placed = [...labels]
		.sort((a, b) => a.y - b.y)
		.map((l) => ({ ...l, y: Math.min(Math.max(l.y, top), bottom) }));
	// down from the top, then back up from the bottom
	for (let i = 1; i < placed.length; i++)
		placed[i].y = Math.max(placed[i].y, placed[i - 1].y + gap);
	const last = placed.length - 1;
	if (last >= 0) placed[last].y = Math.min(placed[last].y, bottom);
	for (let i = last - 1; i >= 0; i--)
		placed[i].y = Math.min(placed[i].y, placed[i + 1].y - gap);
	return placed;
}

/**
 * Tooltip rows of a line chart at one day: the series with a value, highest
 * first, so the list reads in the order of the lines.
 * @author jplacht
 *
 * @param {ILineSeries[]} series chart series
 * @param {number} index day index
 * @returns {ILineTooltipRow[]} rows, highest value first
 */
export function tooltipRows(
	series: ILineSeries[],
	index: number
): ILineTooltipRow[] {
	return series
		.filter((s) => s.values[index] != null)
		.map((s) => ({
			key: s.key,
			label: s.label,
			color: s.color,
			value: s.values[index]!,
		}))
		.sort((a, b) => b.value - a.value);
}
