// Composables
import type { IEmpireMaterialIO } from "@/features/empire/empire.types";
import type {
	EmpireMaterialIOState,
	PlanEmpireElement,
} from "@/features/api/schemas/empireData.schemas";
import { useMaterialData } from "@/database/services/useMaterialData";
import { empireStateOf } from "@/features/empire/util/empireMaterialIO.util";
import {
	combineMaterialIOMinimal,
	enhanceMaterialIOMinimal,
} from "@/features/planning/engine/materialIO";

// Types & Interfaces
import type { Material } from "@/features/api/schemas/gameData.schemas";
import type {
	IMaterialIOMaterial,
	IMaterialIOMinimal,
} from "@/features/planning/usePlanCalculation.types";

export function useMaterialIOUtil() {
	const { materialsMap } = useMaterialData();

	// material lookup for the engine, reactive through materialsMap
	const materials = {
		get: (ticker: string): Material | undefined =>
			materialsMap.value[ticker],
	};

	/**
	 * Enhances a MaterialIO Minimal with weight and volume
	 * information based on the arrays materials
	 *
	 * @author jplacht
	 *
	 * @param {IMaterialIOMinimal[]} data Minimal Array
	 * @returns {IMaterialIOMaterial[]} Array enhanced by Weight & Volume
	 */
	function enhanceMaterialIO(
		data: IMaterialIOMinimal[]
	): IMaterialIOMaterial[] {
		return enhanceMaterialIOMinimal(materials, data);
	}

	// the empire state the Empire page stores (pure, shared with the MCP)
	async function empireMaterialIOState(
		empire: PlanEmpireElement | undefined,
		data: IEmpireMaterialIO[]
	): Promise<EmpireMaterialIOState | undefined> {
		return empireStateOf(empire, data);
	}

	return {
		combineMaterialIOMinimal,
		enhanceMaterialIO,
		empireMaterialIOState,
	};
}
