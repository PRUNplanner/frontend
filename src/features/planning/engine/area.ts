// Engine
import { getBuilding } from "@/features/planning/engine/buildings";
import {
	infrastructureBuildingNames,
	storageBuildingNames,
} from "@/features/planning/calculations/infrastructureCalculations";

// Types & Interfaces
import type { Building } from "@/features/api/schemas/gameData.schemas";
import {
	IAreaResult,
	IInfrastructureRecord,
	IStorageRecord,
} from "@/features/planning/usePlanCalculation.types";
import type {
	PlanData,
	PlanDataInfrastructure,
} from "@/features/api/schemas/planningData.schemas";

/**
 * Calculates the plans area result by determining the total amount of
 * usable area based on permits and the used area by infrastructure
 * and production buildings.
 *
 * @remark Core Modul Area of 25 is always included
 *
 * @param {PlanData} data Plan Data
 * @param {number} permits Permits used
 * @param {ReadonlyMap<string, Building>} buildings Building data
 * @returns {IAreaResult} Area
 */
export function calculateArea(
	data: PlanData,
	permits: number,
	buildings: ReadonlyMap<string, Building>
): IAreaResult {
	// Core Module holds 25 area
	let areaUsed: number = 25;
	const areaTotal: number = 250 + permits * 250;

	// calculate area used based on production and infrastructure buildings
	for (const infrastructure of data.infrastructure) {
		if (infrastructure.amount > 0) {
			areaUsed +=
				getBuilding(buildings, infrastructure.building).area_cost *
				infrastructure.amount;
		}
	}

	for (const building of data.buildings) {
		if (building.amount > 0) {
			areaUsed +=
				getBuilding(buildings, building.name).area_cost *
				building.amount;
		}
	}

	return {
		permits: permits,
		areaUsed: areaUsed,
		areaTotal: areaTotal,
		areaLeft: areaTotal - areaUsed,
	};
}

function amountsOf(data: PlanData, names: string[]): Record<string, number> {
	return Object.fromEntries(
		names.map((key) => {
			const currentInf: PlanDataInfrastructure | undefined =
				data.infrastructure.find((e) => e.building === key);

			return [key, currentInf ? currentInf.amount : 0];
		})
	);
}

/**
 * A record with all infrastructure buildings and their amount in the plan
 */
export function calculateInfrastructure(data: PlanData): IInfrastructureRecord {
	return amountsOf(
		data,
		infrastructureBuildingNames
	) as IInfrastructureRecord;
}

/**
 * A record with all storage buildings and their amount in the plan
 */
export function calculateStorage(data: PlanData): IStorageRecord {
	return amountsOf(data, storageBuildingNames) as IStorageRecord;
}
