// Util
import { chartZone } from "@/ui/charts/charts.util";

// Types & Interfaces
import type { IFIOBurnTableElementMaterial } from "@/features/fio/useFIOBurn.types";

/**
 * End of the burn axis: 3 × the yellow threshold, so red and yellow sit in
 * the first third.
 * @author jplacht
 *
 * @param {number} yellow yellow threshold in days
 * @returns {number} axis end in days
 */
export function burnAxisMax(yellow: number): number {
	return yellow * 3;
}

/**
 * Counts for a plan's summary lines. Consumed materials run out at some
 * point (finite days), produced ones never do.
 * @author jplacht
 *
 * @param {IFIOBurnTableElementMaterial[]} materials plan burn materials
 * @param {number} red red threshold in days
 * @param {number} yellow yellow threshold in days
 */
export function burnSummary(
	materials: IFIOBurnTableElementMaterial[],
	red: number,
	yellow: number
) {
	const consumed = materials
		.filter((m) => Number.isFinite(m.exhaustion))
		.sort((a, b) => a.exhaustion - b.exhaustion);
	const zones = consumed.map((m) => chartZone(m.exhaustion, red, yellow));
	const underYellow = zones.filter((z) => z !== "none").length;

	return {
		red: zones.filter((z) => z === "red").length,
		yellow: zones.filter((z) => z === "yellow").length,
		consumed: consumed.length,
		produced: materials.length - consumed.length,
		first: consumed[0] as IFIOBurnTableElementMaterial | undefined,
		// besides the first one
		moreUnderYellow: Math.max(underYellow - 1, 0),
	};
}
