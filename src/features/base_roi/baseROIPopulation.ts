// Util
import { poprAvailable, poprCovers } from "@/features/government/popr.util";

// Types & Interfaces
import type { PopulationReport } from "@/features/api/schemas/gameData.schemas";
import type {
	IBaseROIRow,
	IBaseROIStaffing,
} from "@/features/base_roi/baseROI.types";

/**
 * Whether a planet's free workers fill a base's jobs. Recipe rows have no
 * planet, so they aren't checked; a planet without a report has no
 * population we know of.
 *
 * @param {IBaseROIRow["workforce"]} workforce Jobs of the base per tier
 * @param {PopulationReport | undefined} report Planet's latest report
 * @returns {IBaseROIStaffing} The tiers it can't fill
 */
export function baseStaffing(
	workforce: IBaseROIRow["workforce"],
	report: PopulationReport | undefined
): IBaseROIStaffing {
	if (!report) return { hasReport: false, gaps: [] };
	return {
		hasReport: true,
		gaps: workforce
			.filter(
				(w) =>
					!poprCovers(
						report[`free_${w.tier}`],
						report[`open_jobs_${w.tier}`],
						w.required
					)
			)
			.map((w) => ({
				tier: w.tier,
				required: w.required,
				available: poprAvailable(
					report[`free_${w.tier}`],
					report[`open_jobs_${w.tier}`]
				),
			})),
	};
}

/** the planet's free workers fill every job of the base */
export const isStaffed = (s: IBaseROIStaffing): boolean =>
	s.hasReport && !s.gaps.length;
