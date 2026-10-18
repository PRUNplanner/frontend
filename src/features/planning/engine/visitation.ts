// Engine
import {
	getVolumeOfAllStorages,
	getWeightOfAllStorages,
} from "@/features/planning/calculations/infrastructureCalculations";

// Types & Interfaces
import type {
	IPlanResult,
	IVisitationData,
} from "@/features/planning/usePlanCalculation.types";
import type { IPlanTracer } from "@/features/planning/engine/engine.types";

/**
 * Calculates a plans visitation data: daily import and export weight and
 * volume, and for how many days its storage holds them
 * @author jplacht
 *
 * @param {Pick<IPlanResult, "materialio" | "storage">} result Plan result
 * @param {IPlanTracer} [trace] Tracer
 * @returns {IVisitationData} Visitation Data
 */
export function calculateVisitation(
	result: Pick<IPlanResult, "materialio" | "storage">,
	trace?: IPlanTracer
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

	const storageFilled: number = Math.max(
		Math.min(
			totalWeight / dailyWeightTotal,
			totalVolume / dailyVolumeTotal
		),
		0
	);

	if (trace) {
		const storages = Object.fromEntries(
			Object.entries(result.storage).filter(([, amount]) => amount > 0)
		);
		const step = (
			label: string,
			value: number,
			unit: string,
			formula?: string,
			inputs?: Record<string, number>
		) =>
			trace.step({
				phase: "visitation",
				label,
				formula,
				inputs,
				value,
				unit,
			});
		step(
			"storage weight",
			totalWeight,
			"t",
			"1,500 core module + Σ storage capacity × amount",
			storages
		);
		step(
			"storage volume",
			totalVolume,
			"m³",
			"1,500 core module + Σ storage capacity × amount",
			storages
		);
		step(
			"weight in",
			dailyWeightImport,
			"t/day",
			"Σ weight of materials with delta < 0"
		);
		step(
			"weight out",
			dailyWeightExport,
			"t/day",
			"Σ weight of materials with delta > 0"
		);
		step(
			"volume in",
			dailyVolumeImport,
			"m³/day",
			"Σ volume of materials with delta < 0"
		);
		step(
			"volume out",
			dailyVolumeExport,
			"m³/day",
			"Σ volume of materials with delta > 0"
		);
		step(
			"storage lasts",
			storageFilled,
			"days",
			"min(weight ÷ daily_weight, volume ÷ daily_volume)",
			{
				weight: totalWeight,
				daily_weight: dailyWeightTotal,
				volume: totalVolume,
				daily_volume: dailyVolumeTotal,
			}
		);
	}

	return {
		storageFilled: storageFilled,
		dailyWeightImport: dailyWeightImport,
		dailyWeightExport: dailyWeightExport,
		dailyVolumeImport: dailyVolumeImport,
		dailyVolumeExport: dailyVolumeExport,
		dailyWeight: dailyWeightTotal,
		dailyVolume: dailyVolumeTotal,
	};
}
