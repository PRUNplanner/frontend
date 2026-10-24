// Types & Interfaces
import type { Planet } from "@/features/api/schemas/gameData.schemas";

export type IPlanetPlotFields = Pick<
	Planet,
	| "plots_total"
	| "plots_used"
	| "ghost_sites"
	| "supports_ghost_sites"
	| "plots_updated"
>;

export interface IPlanetPlots {
	free: number;
	total: number;
	/** every plot taken */
	full: boolean;
	/** full without ghost sites: no new base fits */
	blocked: boolean;
	/** ghost sites on the planet so far */
	ghost: number;
	ghostAllowed: boolean;
	updated: string | null;
}

/**
 * Free and total plots of a planet; null while the backend doesn't know them
 * @author jplacht
 *
 * @param {IPlanetPlotFields} [planet] Planet or search index entry
 * @returns {IPlanetPlots | null} Plots, null when unknown
 */
export function planetPlots(planet?: IPlanetPlotFields): IPlanetPlots | null {
	// == null: planets cached before the plots fields existed lack them
	if (planet?.plots_total == null || planet.plots_used == null) return null;
	const free = planet.plots_total - planet.plots_used;
	const full = free <= 0;
	const ghostAllowed = planet.supports_ghost_sites === true;
	return {
		free: Math.max(free, 0),
		total: planet.plots_total,
		full,
		blocked: full && !ghostAllowed,
		ghost: planet.ghost_sites ?? 0,
		ghostAllowed,
		updated: planet.plots_updated ?? null,
	};
}
