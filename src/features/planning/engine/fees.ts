// Material IO
import { TOTALMSDAY } from "@/features/planning/engine/materialIO";

// Types & Interfaces
import type {
	Building,
	PlanetProductionFees,
} from "@/features/api/schemas/gameData.schemas";

type FeeBuilding = Pick<
	Building,
	| "expertise"
	| "pioneers"
	| "settlers"
	| "technicians"
	| "engineers"
	| "scientists"
>;

/**
 * Production fee of a building per day of production at 100 %: the planet's
 * fees for the building's expertise, averaged over its fully staffed
 * workforce, weighted by headcount
 *
 * @author jplacht
 *
 * @param {FeeBuilding} building Building
 * @param {PlanetProductionFees | undefined} fees Planet's production fees
 * @returns {number} Weighted fee, 0 without fees, expertise or workforce
 */
export function weightedProductionFee(
	building: FeeBuilding,
	fees: PlanetProductionFees | undefined
): number {
	const levels =
		building.expertise && fees ? fees.fees[building.expertise] : undefined;
	if (!levels) return 0;

	// index order PIONEER, SETTLER, TECHNICIAN, ENGINEER, SCIENTIST
	const workers = [
		building.pioneers,
		building.settlers,
		building.technicians,
		building.engineers,
		building.scientists,
	];
	let total = 0;
	let fee = 0;
	workers.forEach((count, i) => {
		total += count;
		fee += levels[i] * count;
	});
	return total > 0 ? fee / total : 0;
}

/**
 * Production fee of one order: the weighted fee for the recipe's base time,
 * independent of efficiency
 *
 * @author jplacht
 *
 * @param {number} weighted Weighted fee per day
 * @param {number} timeMs Recipe base time (planet-adjusted for extraction)
 * @returns {number} Fee per run
 */
export function productionFeePerRun(weighted: number, timeMs: number): number {
	return weighted === 0 ? 0 : (weighted * timeMs) / TOTALMSDAY;
}
