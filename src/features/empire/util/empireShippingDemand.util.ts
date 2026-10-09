// Engine
import { calculateVisitation } from "@/features/planning/engine/visitation";

// Types & Interfaces
import type { IPlanResult } from "@/features/planning/usePlanCalculation.types";
import type { IEmpireShippingDemand } from "@/features/empire/empire.types";

/**
 * Sums the daily shipping demand of an empire's plans, each plan counted
 * separately with its own max(import, export) like the Plan Storage section
 *
 * @param {Pick<IPlanResult, "materialio" | "storage">[]} results Plan results
 * @returns {IEmpireShippingDemand} Summed daily weight and volume
 */
export function calculateEmpireShippingDemand(
	results: Pick<IPlanResult, "materialio" | "storage">[]
): IEmpireShippingDemand {
	const sum: IEmpireShippingDemand = {
		dailyWeightImport: 0,
		dailyWeightExport: 0,
		dailyVolumeImport: 0,
		dailyVolumeExport: 0,
		dailyWeight: 0,
		dailyVolume: 0,
	};

	for (const result of results) {
		const visitation = calculateVisitation(result);
		for (const key of Object.keys(sum) as (keyof IEmpireShippingDemand)[])
			sum[key] += visitation[key];
	}

	return sum;
}
