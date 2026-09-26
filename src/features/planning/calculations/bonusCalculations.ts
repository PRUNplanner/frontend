// Engine
import {
	calculateBuildingEfficiency,
	calculateBuildingFactionBonus,
	calculateBuildingWorkforceEfficiency,
	calculateExpertBonus,
} from "@/features/planning/engine/efficiency";

export { expertNames } from "@/features/planning/engine/efficiency";

/**
 * Efficiency and bonus calculations, see the planning engine
 * (engine/efficiency.ts)
 */
export function useBonusCalculation() {
	return {
		calculateExpertBonus,
		calculateBuildingWorkforceEfficiency,
		calculateBuildingFactionBonus,
		calculateBuildingEfficiency,
	};
}
