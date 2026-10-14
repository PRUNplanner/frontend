// Engine
import {
	fertilityPercent,
	filteredMaterials,
	MAX_JUMPS,
	planetJumps,
	SEARCH_CX,
} from "@/features/planet_search/planetSearch.engine";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type {
	PlanetSearchFilter,
	PlanetSearchReference,
} from "@/features/planet_search/planetSearch.schemas";
import type { IPlanetSearchContext } from "@/features/planet_search/planetSearch.types";

/** Results plotted at most, the first by the current sort */
export const CHART_LIMIT = 300;

interface IPlanetSearchChartX {
	/** the filter's references, or the one nearest exchange */
	refs: PlanetSearchReference[];
	nearest: boolean;
}

interface IPlanetSearchChartPoint {
	planet: PlanetSearchIndexEntry;
	x: number;
	y: number;
}

interface IPlanetSearchChartData {
	axis: IPlanetSearchChartX;
	points: IPlanetSearchChartPoint[];
	/** plotted planets without a route to the X reference */
	noRoute: number;
	/** plotted planets without the Y material (or not fertile) */
	noValue: number;
	/** all results when more than CHART_LIMIT, else 0 */
	capped: number;
}

/**
 * The X reference: the Distance filter's picks, else the exchange with the
 * fewest jumps over all planets (no route counts as more than MAX_JUMPS).
 * @author jplacht
 */
function chartXAxis(
	planets: PlanetSearchIndexEntry[],
	filter: PlanetSearchFilter,
	ctx: IPlanetSearchContext
): IPlanetSearchChartX {
	if (filter.references.length)
		return { refs: filter.references, nearest: false };

	const total = (code: (typeof SEARCH_CX)[number]) =>
		planets.reduce((sum, p) => {
			const j = planetJumps(p, { kind: "cx", code }, ctx);
			return sum + (j === -1 ? MAX_JUMPS + 1 : j);
		}, 0);
	const code = SEARCH_CX.reduce((best, c) =>
		total(c) < total(best) ? c : best
	);
	return { refs: [{ kind: "cx", code }], nearest: true };
}

/** Jumps to every reference (the max), null if any has no route */
function chartJumps(
	planet: PlanetSearchIndexEntry,
	axis: IPlanetSearchChartX,
	ctx: IPlanetSearchContext
): number | null {
	const jumps = axis.refs.map((r) => planetJumps(planet, r, ctx));
	return jumps.includes(-1) ? null : Math.max(...jumps);
}

/**
 * The Y material: the picked one while it is still searched, else the
 * first searched; null without a material filter (Y is fertility).
 * @author jplacht
 */
export function chartYMaterial(
	filter: PlanetSearchFilter,
	picked: string | null
): string | null {
	const materials = filteredMaterials(filter);
	if (picked && materials.includes(picked)) return picked;
	return materials[0] ?? null;
}

/** Daily output of a material, or fertility in % when it is null */
function chartYValue(
	planet: PlanetSearchIndexEntry,
	material: string | null
): number | null {
	if (!material) return fertilityPercent(planet);
	return (
		planet.resources.find((r) => r.material_ticker === material)
			?.daily_extraction ?? null
	);
}

/**
 * Chart points for the first CHART_LIMIT results, counting the ones that
 * can't be placed.
 * @author jplacht
 *
 * @param planets results, sorted
 */
export function chartData(
	planets: PlanetSearchIndexEntry[],
	filter: PlanetSearchFilter,
	ctx: IPlanetSearchContext,
	material: string | null
): IPlanetSearchChartData {
	const shown = planets.slice(0, CHART_LIMIT);
	const axis = chartXAxis(shown, filter, ctx);
	const points: IPlanetSearchChartPoint[] = [];
	let noRoute = 0;
	let noValue = 0;

	for (const planet of shown) {
		const x = chartJumps(planet, axis, ctx);
		const y = chartYValue(planet, material);
		if (x === null) noRoute++;
		else if (y === null) noValue++;
		else points.push({ planet, x, y });
	}

	return {
		axis,
		points,
		noRoute,
		noValue,
		capped: planets.length > CHART_LIMIT ? planets.length : 0,
	};
}
