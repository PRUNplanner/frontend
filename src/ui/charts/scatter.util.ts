// Types & Interfaces
import type {
	IScatterDot,
	IScatterLabelSide,
	IScatterRect,
	IScatterSegment,
} from "@/ui/charts/scatter.types";

/**
 * Keys of the points no other point beats on both axes: lower x and higher
 * y are better. Equal points are both kept.
 * @author jplacht
 *
 * @param {{ key: string; x: number; y: number }[]} points any order
 * @returns {string[]} frontier keys, by x ascending
 */
export function paretoFrontier(
	points: { key: string; x: number; y: number }[]
): string[] {
	const sorted = [...points].sort((a, b) => a.x - b.x || b.y - a.y);
	const frontier: { key: string; x: number; y: number }[] = [];
	let best = -Infinity;
	for (const p of sorted) {
		const last = frontier.at(-1);
		if (p.y > best) {
			frontier.push(p);
			best = p.y;
		} else if (last && p.x === last.x && p.y === last.y) frontier.push(p);
	}
	return frontier.map((p) => p.key);
}

/**
 * About five round tick values covering min..max (steps of 1, 2, 2.5 or 5
 * times a power of ten).
 * @author jplacht
 *
 * @param {number} min lowest value
 * @param {number} max highest value
 * @returns {number[]} ticks, the first ≤ min and the last ≥ max
 */
export function niceTicks(min: number, max: number): number[] {
	if (max <= min) [min, max] = [min - 1, max + 1];
	const raw = (max - min) / 5;
	const power = 10 ** Math.floor(Math.log10(raw));
	const step =
		[1, 2, 2.5, 5, 10].find((m) => m * power >= raw)! * power;
	const ticks: number[] = [];
	for (
		let v = Math.floor(min / step) * step;
		v < max + step / 2;
		v += step
	)
		ticks.push(Number(v.toFixed(10)));
	if (ticks.at(-1)! < max) ticks.push(ticks.at(-1)! + step);
	return ticks;
}

const LABEL_GAP = 4;
const LABEL_HEIGHT = 14;
const LABEL_SIDES: IScatterLabelSide[] = ["right", "left", "below", "above"];

function overlaps(a: IScatterRect, b: IScatterRect): boolean {
	return (
		a.x < b.x + b.w &&
		b.x < a.x + a.w &&
		a.y < b.y + b.h &&
		b.y < a.y + a.h
	);
}

function hitsDot(rect: IScatterRect, d: IScatterDot): boolean {
	const nx = Math.max(rect.x, Math.min(d.cx, rect.x + rect.w));
	const ny = Math.max(rect.y, Math.min(d.cy, rect.y + rect.h));
	return (nx - d.cx) ** 2 + (ny - d.cy) ** 2 < d.r ** 2;
}

/**
 * Left edge of a label centred below its dot, shifted to stay inside the box.
 * @author jplacht
 */
export function belowLabelX(
	cx: number,
	width: number,
	box: IScatterRect
): number {
	return Math.min(Math.max(cx - width / 2, box.x), box.x + box.w - width);
}

function labelRect(
	d: IScatterDot,
	side: IScatterLabelSide,
	width: number,
	box: IScatterRect
): IScatterRect {
	if (side === "right")
		return {
			x: d.cx + d.r + LABEL_GAP,
			y: d.cy - LABEL_HEIGHT / 2,
			w: width,
			h: LABEL_HEIGHT,
		};
	if (side === "left")
		return {
			x: d.cx - d.r - LABEL_GAP - width,
			y: d.cy - LABEL_HEIGHT / 2,
			w: width,
			h: LABEL_HEIGHT,
		};
	if (side === "above")
		return {
			x: belowLabelX(d.cx, width, box),
			y: d.cy - d.r - 2 - LABEL_HEIGHT,
			w: width,
			h: LABEL_HEIGHT,
		};
	return {
		x: belowLabelX(d.cx, width, box),
		y: d.cy + d.r + 2,
		w: width,
		h: LABEL_HEIGHT,
	};
}

/**
 * Picks a side for each label: right, then left, below, above; a label that
 * would cover a dot, an earlier label or a line, or leave the box, is
 * hidden (null) and left to the tooltip. Earlier labels win. A label with
 * crossLines may sit on a line when no side is clear of them.
 * @author jplacht
 *
 * @param {IScatterDot[]} dots every dot on the plot, in px
 * @param {{ key: string; width: number; crossLines?: boolean }[]} labels labels to place, by priority
 * @param {IScatterSegment[]} segments axis-aligned lines labels must not cross
 * @param {IScatterRect} box area labels must stay inside
 * @returns {Record<string, IScatterLabelSide | null>} side per label key
 */
export function placeLabels(
	dots: IScatterDot[],
	labels: { key: string; width: number; crossLines?: boolean }[],
	segments: IScatterSegment[],
	box: IScatterRect
): Record<string, IScatterLabelSide | null> {
	const byKey = new Map(dots.map((d) => [d.key, d]));
	const lines: IScatterRect[] = segments.map(([x1, y1, x2, y2]) => ({
		x: Math.min(x1, x2),
		y: Math.min(y1, y2),
		w: Math.abs(x2 - x1) || 1,
		h: Math.abs(y2 - y1) || 1,
	}));
	const placed: IScatterRect[] = [];
	const sides: Record<string, IScatterLabelSide | null> = {};

	const fits = (key: string, rect: IScatterRect, avoidLines: boolean) =>
		rect.x >= box.x &&
		rect.y >= box.y &&
		rect.x + rect.w <= box.x + box.w &&
		rect.y + rect.h <= box.y + box.h &&
		!dots.some((d) => d.key !== key && hitsDot(rect, d)) &&
		!placed.some((p) => overlaps(rect, p)) &&
		!(avoidLines && lines.some((l) => overlaps(rect, l)));

	for (const { key, width, crossLines } of labels) {
		const dot = byKey.get(key);
		if (!dot) continue;
		const pick = (crossLines ? [true, false] : [true])
			.flatMap((avoidLines) =>
				LABEL_SIDES.map((side) => ({
					side,
					avoidLines,
					rect: labelRect(dot, side, width, box),
				}))
			)
			.find((o) => fits(key, o.rect, o.avoidLines));
		sides[key] = pick?.side ?? null;
		if (pick) placed.push(pick.rect);
	}
	return sides;
}
