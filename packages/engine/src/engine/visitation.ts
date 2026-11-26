// Engine
import {
	getVolumeOfAllStorages,
	getWeightOfAllStorages,
} from "../calculations/infrastructureCalculations";

// Types & Interfaces
import type { IPlanResult, IVisitationData } from "../planCalculation.types";
import type { IPlanTracer } from "./engine.types";

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

/** the ships the Visitation frequency tool lists: capacity in t and m³ */
export const SHIP_SIZES: readonly { weight: number; volume: number }[] = [
	{ volume: 500, weight: 500 },
	{ volume: 1000, weight: 1000 },
	{ volume: 2000, weight: 2000 },
	{ volume: 3000, weight: 1000 },
	{ volume: 1000, weight: 3000 },
	{ volume: 5000, weight: 5000 },
];

/**
 * Days until a ship of this size is full with a base's exports, and with
 * its imports, and which of weight or volume fills it first
 * @author jplacht
 *
 * @param {{ weight: number; volume: number }} ship Capacity in t and m³
 * @param {Pick<IVisitationData, "dailyWeightImport" | "dailyWeightExport" | "dailyVolumeImport" | "dailyVolumeExport">} daily Daily cargo
 * @returns Days and the limiting side per direction
 */
export function shipDays(
	ship: { weight: number; volume: number },
	daily: Pick<
		IVisitationData,
		| "dailyWeightImport"
		| "dailyWeightExport"
		| "dailyVolumeImport"
		| "dailyVolumeExport"
	>
): {
	exportDays: number;
	importDays: number;
	exportLimit: "m³" | "t";
	importLimit: "m³" | "t";
} {
	const side = (dailyWeight: number, dailyVolume: number) => {
		const volumeDays = ship.volume / dailyVolume;
		const weightDays = ship.weight / dailyWeight;
		return volumeDays < weightDays
			? { days: volumeDays, limit: "m³" as const }
			: { days: weightDays, limit: "t" as const };
	};
	const out = side(daily.dailyWeightExport, daily.dailyVolumeExport);
	const into = side(daily.dailyWeightImport, daily.dailyVolumeImport);
	return {
		exportDays: out.days,
		importDays: into.days,
		exportLimit: out.limit,
		importLimit: into.limit,
	};
}
