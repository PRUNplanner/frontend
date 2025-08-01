// Types & Interfaces
import { PLANET_RESOURCETYPE_TYPE } from "@/features/api/gameData.types";

const TOTALMSDAY: number = 24 * 60 * 60 * 1000;
const TIME_COL: number = 6 * 60 * 60 * 1000;
const TIME_EXT: number = 12 * 60 * 60 * 1000;
const TIME_RIG: number = 4 * 60 * 60 * 1000 + 48 * 60 * 1000;

const DAILY_TYPE_SHARE: Record<PLANET_RESOURCETYPE_TYPE, number> = {
	MINERAL: TIME_EXT / TOTALMSDAY,
	GASEOUS: TIME_COL / TOTALMSDAY,
	LIQUID: TIME_RIG / TOTALMSDAY,
};

/**
 * Calculates a planets extraction value based on the
 * resource type and their individual extraction durations.
 *
 * @author jplacht
 *
 * @export
 * @param {PLANET_RESOURCETYPE_TYPE} resourceType Planet Resource Type
 * @param {number} dailyExtraction Daily Extraction Value
 * @returns {{ timeMs: number; extractionAmount: number }} Extraction Time and Amount
 */
export function calculateExtraction(
	resourceType: PLANET_RESOURCETYPE_TYPE,
	dailyExtraction: number
): { timeMs: number; extractionAmount: number } {
	const dailyShare: number = DAILY_TYPE_SHARE[resourceType];

	// extraction amount is rounded up and truncated
	const extractionAmount: number = Math.trunc(
		Math.ceil(dailyExtraction * dailyShare)
	);
	const timeMs: number = extractionAmount * (TOTALMSDAY / dailyExtraction);

	return {
		timeMs: timeMs,
		extractionAmount: extractionAmount,
	};
}
