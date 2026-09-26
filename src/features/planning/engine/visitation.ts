// Engine
import {
	getVolumeOfAllStorages,
	getWeightOfAllStorages,
} from "@/features/planning/calculations/infrastructureCalculations";

// Types & Interfaces
import {
	IPlanResult,
	IVisitationData,
} from "@/features/planning/usePlanCalculation.types";

/**
 * Calculates a plans visitation data: daily import and export weight and
 * volume, and for how many days its storage holds them
 * @author jplacht
 *
 * @param {Pick<IPlanResult, "materialio" | "storage">} result Plan result
 * @returns {IVisitationData} Visitation Data
 */
export function calculateVisitation(
	result: Pick<IPlanResult, "materialio" | "storage">
): IVisitationData {
	const totalWeight: number = getWeightOfAllStorages(result.storage);
	const totalVolume: number = getVolumeOfAllStorages(result.storage);

	const dailyWeightImport: number = result.materialio.reduce(
		(sum, e) => sum + (e.delta < 0 ? e.totalWeight * -1 : 0),
		0
	);
	const dailyWeightExport: number = result.materialio.reduce(
		(sum, e) => sum + (e.delta > 0 ? e.totalWeight : 0),
		0
	);
	const dailyVolumeImport: number = result.materialio.reduce(
		(sum, e) => sum + (e.delta < 0 ? e.totalVolume * -1 : 0),
		0
	);
	const dailyVolumeExport: number = result.materialio.reduce(
		(sum, e) => sum + (e.delta > 0 ? e.totalVolume : 0),
		0
	);
	const dailyWeightTotal: number = Math.max(
		dailyWeightImport,
		dailyWeightExport
	);
	const dailyVolumeTotal: number = Math.max(
		dailyVolumeImport,
		dailyVolumeExport
	);

	return {
		storageFilled: Math.max(
			Math.min(
				totalWeight / dailyWeightTotal,
				totalVolume / dailyVolumeTotal
			),
			0
		),
		dailyWeightImport: dailyWeightImport,
		dailyWeightExport: dailyWeightExport,
		dailyVolumeImport: dailyVolumeImport,
		dailyVolumeExport: dailyVolumeExport,
		dailyWeight: dailyWeightTotal,
		dailyVolume: dailyVolumeTotal,
	};
}
