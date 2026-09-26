// Engine
import {
	calculateSatisfaction,
	calculateSingleWorkforceConsumption,
	calculateWorkforceConsumption,
} from "@/features/planning/engine/workforce";

export {
	WORKFORCE_CONSUMPTION_MAP,
	workforceTypeNames,
} from "@/features/planning/engine/workforce";

/**
 * Workforce calculations, see the planning engine (engine/workforce.ts)
 */
export function useWorkforceCalculation() {
	return {
		calculateSatisfaction,
		calculateSingleWorkforceConsumption,
		calculateWorkforceConsumption,
	};
}
