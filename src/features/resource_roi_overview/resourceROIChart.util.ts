// Util
import { paretoFrontier } from "@/ui/charts/scatter.util";

// Types & Interfaces
import type {
	IResourceROIChartData,
	IResourceROIChartPoint,
	IResourceROIDistanceTarget,
	IResourceROIExchange,
	IResourceROIInsight,
	IResourceROIResult,
} from "@/features/resource_roi_overview/useResourceROIOverview.types";

/** the chart shows paybacks up to this many times the fastest one */
const ROI_ZOOM = 2;

export const ROI_EXCHANGES: IResourceROIExchange[] = ["AI1", "CI1", "IC1", "NC1"];

/** one row per planet and building: the table's row and the chart's point key */
export const roiRowKey = (row: IResourceROIResult): string =>
	`${row.planetNaturalId}#${row.buildingTicker}`;

/** jumps to an exchange, -1 without a route */
export const jumpsTo = (
	row: IResourceROIResult,
	code: IResourceROIExchange
): number => row[`distance${code}`];

/**
 * The closest exchange with a route; on a tie the first in AI1, CI1, IC1,
 * NC1 order.
 * @author jplacht
 *
 * @param {IResourceROIResult} row result row
 * @returns {{ code: IResourceROIExchange; jumps: number } | null} null without any route
 */
export function nearestExchange(
	row: IResourceROIResult
): { code: IResourceROIExchange; jumps: number } | null {
	let best: { code: IResourceROIExchange; jumps: number } | null = null;
	for (const code of ROI_EXCHANGES) {
		const jumps = jumpsTo(row, code);
		if (jumps >= 0 && (!best || jumps < best.jumps)) best = { code, jumps };
	}
	return best;
}

/**
 * Chart points: plan ROI against jumps to the target. Rows that never pay
 * back, have no route there, or pay back slower than ROI_ZOOM times the
 * fastest are counted, not drawn: the chart zooms to the competitive ones.
 * @author jplacht
 *
 * @param {IResourceROIResult[]} rows result rows
 * @param {IResourceROIDistanceTarget} target nearest exchange or a fixed one
 * @returns {IResourceROIChartData} points and left-out counts
 */
export function roiChartData(
	rows: IResourceROIResult[],
	target: IResourceROIDistanceTarget
): IResourceROIChartData {
	const data: IResourceROIChartData = {
		points: [],
		noPayback: 0,
		noRoute: 0,
		slow: 0,
		maxDays: 0,
	};
	for (const row of rows) {
		if (!(row.planROI > 0)) {
			data.noPayback++;
			continue;
		}
		const to =
			target === "nearest"
				? nearestExchange(row)
				: jumpsTo(row, target) >= 0
					? { code: target, jumps: jumpsTo(row, target) }
					: null;
		if (!to) {
			data.noRoute++;
			continue;
		}
		data.points.push({ row, x: row.planROI, y: to.jumps, exchange: to.code });
	}
	if (!data.points.length) return data;
	data.maxDays = Math.min(...data.points.map((p) => p.x)) * ROI_ZOOM;
	const shown = data.points.filter((p) => p.x <= data.maxDays);
	data.slow = data.points.length - shown.length;
	data.points = shown;
	return data;
}

/**
 * Row keys no other point beats on both payback and jumps; lower
 * is better on both axes.
 * @author jplacht
 *
 * @param {IResourceROIChartPoint[]} points chart points
 * @returns {string[]} frontier keys, fastest payback first
 */
export function roiFrontier(points: IResourceROIChartPoint[]): string[] {
	return paretoFrontier(
		points.map((p) => ({ key: roiRowKey(p.row), x: p.x, y: -p.y }))
	);
}

/**
 * The facts behind the sentence under the chart.
 * @author jplacht
 *
 * @param {IResourceROIChartPoint[]} points chart points
 * @param {string[]} frontier frontier keys, from roiFrontier
 * @returns {IResourceROIInsight | null} null without points
 */
export function roiInsight(
	points: IResourceROIChartPoint[],
	frontier: string[]
): IResourceROIInsight | null {
	const front = frontier
		.map((key) => points.find((p) => roiRowKey(p.row) === key))
		.filter((p) => p !== undefined);
	if (!front.length) return null;
	const jumps = front.map((p) => p.y);
	const codes = new Set(front.map((p) => p.exchange));
	const top = points.reduce((a, b) =>
		b.row.dailyProfit > a.row.dailyProfit ? b : a
	);
	return {
		frontier: front,
		minJumps: Math.min(...jumps),
		maxJumps: Math.max(...jumps),
		exchange: codes.size === 1 ? [...codes][0] : null,
		topProfit: front.includes(top) ? null : top,
	};
}

/** "Nascent (QJ-149c)" → "Nascent", for chart labels */
export const shortPlanetName = (name: string): string =>
	name.replace(/\s*\([^)]*\)$/, "");
