// Types & Interfaces
import {
	IBuilding,
	IPlanetProductionFee,
	PLANET_WORKFORCE_LEVEL_TYPE,
} from "@/features/api/gameData.types";

function getWorkforceAmount(
	building: IBuilding,
	level: PLANET_WORKFORCE_LEVEL_TYPE
): number {
	switch (level) {
		case "PIONEER":
			return building.pioneers;
		case "SETTLER":
			return building.settlers;
		case "TECHNICIAN":
			return building.technicians;
		case "ENGINEER":
			return building.engineers;
		case "SCIENTIST":
			return building.scientists;
	}
}

/**
 * Calculates a buildings production fee rate per 24h of runtime as the
 * workforce-weighted average of the planets per-tier daily rates for
 * the buildings expertise, charged per building following ingame logic
 * @author raukk
 *
 * @export
 * @param {IBuilding} building Building Data
 * @param {IPlanetProductionFee[] | undefined} fees Planet Fee Data
 * @returns {number} Fee Rate per 24h, 0 if unknown
 */
export function calculateProductionFeeRate(
	building: IBuilding,
	fees: IPlanetProductionFee[] | undefined
): number {
	if (!fees || building.expertise === null) return 0;

	const workers: number =
		building.pioneers +
		building.settlers +
		building.technicians +
		building.engineers +
		building.scientists;
	if (workers === 0) return 0;

	const weighted: number = fees.reduce(
		(sum, fee) =>
			fee.category === building.expertise
				? sum +
					getWorkforceAmount(building, fee.workforce_level) *
						fee.fee_amount
				: sum,
		0
	);

	return weighted / workers;
}
