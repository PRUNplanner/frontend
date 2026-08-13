// Types & Interfaces
import { IBuilding } from "@/features/api/gameData.types";
import { IFIOProductionFeeTable } from "@/features/api/fioData.types";
import { WORKFORCE_TYPE } from "@/features/planning/usePlanCalculation.types";

const WORKFORCE_BUILDING_FIELD_MAP: Record<
	WORKFORCE_TYPE,
	"pioneers" | "settlers" | "technicians" | "engineers" | "scientists"
> = {
	pioneer: "pioneers",
	settler: "settlers",
	technician: "technicians",
	engineer: "engineers",
	scientist: "scientists",
};

/**
 * A building's production fee rate per 24h of runtime. The rate is
 * charged per building, not per employee: the workforce-weighted
 * average of the planet's per-tier daily rates for the building's
 * expertise, e.g. (10 x 15 + 25 x 12) / (10 + 25) = 12.9.
 * @see https://handbook.apex.prosperousuniverse.com/wiki/local-rules/index.html
 * @author raukk
 *
 * @export
 * @param {IBuilding} building Building Data
 * @param {IFIOProductionFeeTable | null} fees Planet Fee Data, null if unknown
 * @returns {number} Fee rate per 24h runtime, 0 if unknown
 */
export function calculateProductionFeeRate(
	building: IBuilding,
	fees: IFIOProductionFeeTable | null
): number {
	if (!fees || building.expertise === null) return 0;

	const feeTable = fees[building.expertise];
	if (!feeTable) return 0;

	const { weighted, workers } = Object.entries(
		WORKFORCE_BUILDING_FIELD_MAP
	).reduce(
		(acc, [workforce, field]) => ({
			weighted:
				acc.weighted +
				building[field] * (feeTable[workforce as WORKFORCE_TYPE] ?? 0),
			workers: acc.workers + building[field],
		}),
		{ weighted: 0, workers: 0 }
	);

	return workers > 0 ? weighted / workers : 0;
}
