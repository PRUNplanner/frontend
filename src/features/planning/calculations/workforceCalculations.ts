// Composables
import { useMaterialIOUtil } from "@/features/planning/util/materialIO.util";

// Types & Interfaces
import {
	IMaterialIOMinimal,
	IWorkforceElement,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";
import {
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
		{ ticker: "WS", need: 0.1 / 100, lux1: false, lux2: false },
		{ ticker: "NST", need: 0.1 / 100, lux1: true, lux2: false },
		{ ticker: "WIN", need: 1 / 100, lux1: false, lux2: true },
	],
};

export const workforceTypeNames: string[] = [
	"pioneer",
	"settler",
	"technician",
	"engineer",
	"scientist",
];

export async function useWorkforceCalculation() {
	const { combineMaterialIOMinimal } = await useMaterialIOUtil();

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
	function calculateSatisfaction(
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
		const baseEfficiency: number =
			0.02 * (1 + 10 / 3) * (1 + 4) * (1 + 5 / 6);
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
	function calculateSingleWorkforceConsumption(
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
	function calculateWorkforceConsumption(
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
	return {
		calculateSatisfaction,
		calculateSingleWorkforceConsumption,
		calculateWorkforceConsumption,
	};
}
