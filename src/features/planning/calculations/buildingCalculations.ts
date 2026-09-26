// Engine
import { calculateMaterialIO } from "@/features/planning/engine/materialIO";

export { TOTALMSDAY } from "@/features/planning/engine/materialIO";

/**
 * Production material io, see the planning engine (engine/materialIO.ts)
 */
export function useBuildingCalculation() {
	return {
		calculateMaterialIO,
	};
}
