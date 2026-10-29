// Composables
import { usePlanContext } from "@/features/planning/usePlanContext";
import { useExchangeData } from "@/database/services/useExchangeData";

// Unit
import {
	calculateBase,
	recipeCandidates,
	toRowInput,
} from "@/features/base_roi/baseROIRows";
import { calculateMetrics } from "@/features/base_roi/baseROIMetrics";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";
import { STANDARD_PLANET } from "@/features/base_roi/baseROI.constants";

// Test Data
import { setupPlanningTestData } from "@/tests/features/planning/usePlanCalculation.fixtures";
import planetTemplate from "@/tests/test_data/api_data_planet_etherwind.json";

// Types & Interfaces
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";
import type {
	IBaseROICandidate,
	IBaseROIRow,
} from "@/features/base_roi/baseROI.types";
import type { IPlanContext } from "@/features/planning/engine/engine.types";

/**
 * Real Base ROI rows from the test game data: recipe rows of a few
 * buildings on the standard planet and one resource row on etherwind
 */
export async function baseROIRows(
	settings: BaseROISettings = defaultBaseROISettings()
): Promise<IBaseROIRow[]> {
	await setupPlanningTestData();
	const { loadGameData, createPrices } = usePlanContext();
	const gameData = await loadGameData();
	const getExchange = useExchangeData().getExchangeTickerLoaded;
	const ctxOn = (planet: Planet): IPlanContext => ({
		...gameData,
		planet,
		prices: createPrices(planet.planet_natural_id, undefined),
	});

	const etherwind = planetTemplate as Planet;
	const candidates: [IBaseROICandidate, IPlanContext][] = [
		...recipeCandidates(gameData)
			.filter((c) => ["TNP", "PP1", "SME"].includes(c.building))
			.map((c): [IBaseROICandidate, IPlanContext] => [
				c,
				ctxOn(STANDARD_PLANET),
			]),
		[
			{
				key: `${etherwind.planet_natural_id}#RIG#H2O`,
				kind: "resource",
				building: "RIG",
				expertise: "RESOURCE_EXTRACTION",
				recipeId: "RIG#H2O",
				planetNaturalId: etherwind.planet_natural_id,
				planetName: etherwind.planet_name,
				jumps: 4,
			},
			ctxOn(etherwind),
		],
	];

	return candidates.map(([c, ctx]) => {
		const input = toRowInput(
			c,
			calculateBase(c, ctx, settings, undefined),
			ctx,
			getExchange
		);
		return { ...input, metrics: calculateMetrics(input, settings, 0) };
	});
}
