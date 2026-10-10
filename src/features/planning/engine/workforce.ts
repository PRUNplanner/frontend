// Material IO
import { combineMaterialIOMinimal } from "@/features/planning/engine/materialIO";
import { getBuilding } from "@/features/planning/engine/buildings";

// Types & Interfaces
import type { Building } from "@/features/api/schemas/gameData.schemas";
import {
	WorkforceTypeSchema,
	type PlanData,
	type PlanDataWorkforce,
	type WorkforceType,
} from "@/features/api/schemas/planningData.schemas";
import type {
	IMaterialIOMinimal,
	IWorkforceElement,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";
import type {
	WorkforceConsumptionElement,
	WorkforceConsumptionMap,
} from "@/features/planning/calculations/workforceCalculations.types";

export const WORKFORCE_CONSUMPTION_MAP: WorkforceConsumptionMap = {
	pioneer: [
		{ ticker: "DW", need: 4 / 100, lux1: false, lux2: false },
		{ ticker: "RAT", need: 4 / 100, lux1: false, lux2: false },
		{ ticker: "OVE", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "PWO", need: 0.2 / 100, lux1: true, lux2: false },
		{ ticker: "COF", need: 0.5 / 100, lux1: false, lux2: true },
	],
	settler: [
		{ ticker: "DW", need: 5 / 100, lux1: false, lux2: false },
		{ ticker: "RAT", need: 6 / 100, lux1: false, lux2: false },
		{ ticker: "EXO", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "PT", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "REP", need: 0.2 / 100, lux1: true, lux2: false },
		{ ticker: "KOM", need: 1 / 100, lux1: false, lux2: true },
	],
	technician: [
		{ ticker: "DW", need: 7.5 / 100, lux1: false, lux2: false },
		{ ticker: "RAT", need: 7 / 100, lux1: false, lux2: false },
		{ ticker: "MED", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "HMS", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "SCN", need: 0.1 / 100, lux1: false, lux2: false },
		{ ticker: "SC", need: 0.1 / 100, lux1: true, lux2: false },
		{ ticker: "ALE", need: 1 / 100, lux1: false, lux2: true },
	],
	engineer: [
		{ ticker: "DW", need: 10 / 100, lux1: false, lux2: false },
		{ ticker: "MED", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "FIM", need: 7 / 100, lux1: false, lux2: false },
		{ ticker: "HSS", need: 0.2 / 100, lux1: false, lux2: false },
		{ ticker: "PDA", need: 0.1 / 100, lux1: false, lux2: false },
		{ ticker: "VG", need: 0.2 / 100, lux1: true, lux2: false },
		{ ticker: "GIN", need: 1 / 100, lux1: false, lux2: true },
	],
	scientist: [
		{ ticker: "DW", need: 10 / 100, lux1: false, lux2: false },
		{ ticker: "MED", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "MEA", need: 7 / 100, lux1: false, lux2: false },
		{ ticker: "LC", need: 0.2 / 100, lux1: false, lux2: false },
		{ ticker: "WS", need: 0.05 / 100, lux1: false, lux2: false },
		{ ticker: "NST", need: 0.1 / 100, lux1: true, lux2: false },
		{ ticker: "WIN", need: 1 / 100, lux1: false, lux2: true },
	],
};

export const workforceTypeNames = WorkforceTypeSchema.options;

/**
 * Calculates workforce satisfaction based on capacity and luxuries
 * following ingame logc
 * @author jplacht
 *
 * @export
 * @param {number} capacity Workforce available capacity
 * @param {number} required Required Workforce
 * @param {boolean} lux1 If Lux1 are provided
 * @param {boolean} lux2 If Lux2 are provided
 * @returns {number} Satisfaction
 */
export function calculateSatisfaction(
	capacity: number,
	required: number,
	lux1: boolean,
	lux2: boolean
): number {
	let satisfaction: number = 0;

	if (required > 0) {
		if (required < capacity) {
			satisfaction = 1;
		} else {
			satisfaction = capacity / required;
		}
	}

	let efficiency: number = 0;
	const baseEfficiency: number = 0.02 * (1 + 10 / 3) * (1 + 4) * (1 + 5 / 6);
	const lux1Efficiency: number = 1 + 1 / 11;
	const lux2Efficiency: number = 1 + 2 / 13;

	if (required > 0) {
		efficiency += baseEfficiency;
		if (lux1 == true && lux2 == true) {
			efficiency = efficiency * lux1Efficiency * lux2Efficiency;
		} else if (lux1 == true && lux2 == false) {
			efficiency = efficiency * lux1Efficiency;
		} else if (lux1 == false && lux2 == true) {
			efficiency = efficiency * lux2Efficiency;
		}
	}

	return satisfaction * efficiency;
}

/**
 * Calculates the material consumption of a single plan
 * workforce based on its amount and luxury setup
 *
 * @author jplacht
 *
 * @param {IWorkforceElement} workforce Workforce
 * @returns {IMaterialIOMinimal[]} Consumption Material IO
 */
export function calculateSingleWorkforceConsumption(
	workforce: IWorkforceElement
): IMaterialIOMinimal[] {
	const consuming: number =
		workforce.required > workforce.capacity
			? workforce.capacity
			: workforce.required;

	// if no one is consuming, no materials are required
	if (consuming === 0) return [];

	const mapData: WorkforceConsumptionElement[] =
		WORKFORCE_CONSUMPTION_MAP[workforce.name];

	const materialIO: IMaterialIOMinimal[] = [];

	mapData.forEach((material: WorkforceConsumptionElement) => {
		const element: IMaterialIOMinimal = {
			ticker: material.ticker,
			input: material.need * consuming,
			output: 0,
		};

		if (!material.lux1 && !material.lux2) {
			materialIO.push(element);
		} else if (
			// lux1 required
			material.lux1 &&
			!material.lux2 &&
			workforce.lux1
		) {
			materialIO.push(element);
		} else if (
			// lux2 required
			!material.lux1 &&
			material.lux2 &&
			workforce.lux2
		) {
			materialIO.push(element);
		}
	});

	return materialIO;
}

/**
 * Calculates the workforce consumption for all workforce
 * types and combines it into a single material io.
 *
 * @author jplacht
 *
 * @param {IWorkforceRecord} workforce Workforce Data
 * @returns {IMaterialIOMinimal[]} Total Workforce Consumption
 */
export function calculateWorkforceConsumption(
	workforce: IWorkforceRecord
): IMaterialIOMinimal[] {
	return combineMaterialIOMinimal([
		calculateSingleWorkforceConsumption(workforce.pioneer),
		calculateSingleWorkforceConsumption(workforce.settler),
		calculateSingleWorkforceConsumption(workforce.technician),
		calculateSingleWorkforceConsumption(workforce.engineer),
		calculateSingleWorkforceConsumption(workforce.scientist),
	]);
}

/**
 * Calculates a single building's workforce consumption as the plan staffs
 * it: per workforce type, the building's workers scaled by the plan-wide
 * housed share (capacity / required, at most 1) with that type's luxuries.
 * Without a plan workforce, fully staffed with both luxuries.
 * @author jplacht
 *
 * @param {Building} building Building Data
 * @param {IWorkforceRecord} [workforce] Plan workforce
 * @returns {IMaterialIOMinimal[]} Consumption Material IO
 */
export function getBuildingWorkforceMaterials(
	building: Building,
	workforce?: IWorkforceRecord
): IMaterialIOMinimal[] {
	const workers: Record<WorkforceType, number> = {
		pioneer: building.pioneers,
		settler: building.settlers,
		technician: building.technicians,
		engineer: building.engineers,
		scientist: building.scientists,
	};

	return combineMaterialIOMinimal(
		workforceTypeNames.map((name) => {
			const plan: IWorkforceElement | undefined = workforce?.[name];
			// a building at amount 0 isn't in required, housing is enough
			const share: number = !plan
				? 1
				: plan.capacity <= 0
					? 0
					: plan.required <= 0
						? 1
						: Math.min(1, plan.capacity / plan.required);
			const consuming: number = workers[name] * share;

			return calculateSingleWorkforceConsumption({
				name,
				required: consuming,
				capacity: consuming,
				left: 0,
				lux1: plan?.lux1 ?? true,
				lux2: plan?.lux2 ?? true,
				efficiency: 1,
			});
		})
	);
}

/**
 * Calculates plan workforce based on infrastructure provisioning and
 * production building needs. This also includes the efficiency calculation
 * based on capacity and required workforce under given luxury provision.
 *
 * @param {PlanData} data Plan Data
 * @param {ReadonlyMap<string, Building>} buildings Building data
 * @returns {Required<Record<WorkforceType, IWorkforceElement>>} Workforce
 */
export function calculateWorkforce(
	data: PlanData,
	buildings: ReadonlyMap<string, Building>
): Required<Record<WorkforceType, IWorkforceElement>> {
	const result: Record<WorkforceType, IWorkforceElement> = Object.fromEntries(
		workforceTypeNames.map((key) => {
			// get current workforce value from planet data
			const dataLuxuries: PlanDataWorkforce | undefined =
				data.workforce.find((e) => e.type == key);

			return [
				key,
				{
					name: key,
					required: 0,
					capacity: 0,
					left: 0,
					lux1: dataLuxuries ? dataLuxuries.lux1 : true,
					lux2: dataLuxuries ? dataLuxuries.lux2 : true,
					efficiency: 0,
				} as IWorkforceElement,
			];
		})
	) as Record<WorkforceType, IWorkforceElement>;

	// calculate capacity from infrastructure buildings
	for (const infrastructure of data.infrastructure) {
		if (infrastructure.amount > 0) {
			const infBuildingData: Building = getBuilding(
				buildings,
				infrastructure.building
			);

			// must provide workforce habitation
			if (infBuildingData.habitations !== null) {
				result.pioneer.capacity +=
					infBuildingData.habitations.pioneers *
					infrastructure.amount;
				result.settler.capacity +=
					infBuildingData.habitations.settlers *
					infrastructure.amount;
				result.technician.capacity +=
					infBuildingData.habitations.technicians *
					infrastructure.amount;
				result.engineer.capacity +=
					infBuildingData.habitations.engineers *
					infrastructure.amount;
				result.scientist.capacity +=
					infBuildingData.habitations.scientists *
					infrastructure.amount;
			}
		}
	}

	// calculate required workforce from production buildings
	for (const prodBuilding of data.buildings) {
		if (prodBuilding.amount > 0) {
			const prodBuildingData: Building = getBuilding(
				buildings,
				prodBuilding.name
			);

			result.pioneer.required +=
				prodBuildingData.pioneers * prodBuilding.amount;
			result.settler.required +=
				prodBuildingData.settlers * prodBuilding.amount;
			result.technician.required +=
				prodBuildingData.technicians * prodBuilding.amount;
			result.engineer.required +=
				prodBuildingData.engineers * prodBuilding.amount;
			result.scientist.required +=
				prodBuildingData.scientists * prodBuilding.amount;
		}
	}

	// calculate satifsfaction and left
	Object.values(result).forEach((workforce) => {
		workforce.efficiency = calculateSatisfaction(
			workforce.capacity,
			workforce.required,
			workforce.lux1,
			workforce.lux2
		);

		workforce.left = workforce.capacity - workforce.required;
	});

	return result;
}
