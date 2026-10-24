// Engine
import { resourceBuildingTicker } from "@/features/planning/engine/buildings";

// Util
import { planetDisplayName } from "@/util/planetName";

// Types & Interfaces
import type {
	PlanetResource,
	PlanetSearchIndexEntry,
} from "@/features/api/schemas/gameData.schemas";
import type {
	IChainExtractionOptions,
	IChainExtractionSite,
} from "@/features/production_chain/engine/chainSolver.types";

/** the planet that stands for "a typical planet": the 90th percentile */
const TYPICAL_PERCENTILE = 0.9;

const extractorOf: Record<PlanetResource["resource_type"], string> =
	Object.fromEntries(
		Object.entries(resourceBuildingTicker).map(([b, type]) => [type, b])
	) as Record<PlanetResource["resource_type"], string>;

/**
 * Extraction options per resource from the planet search index: every
 * planet with it, best first, and the typical planet (90th percentile of
 * the daily extraction) whose extractor follows its resource type
 * @author jplacht
 *
 * @param {PlanetSearchIndexEntry[]} index Planet search index
 * @returns {Map<string, IChainExtractionOptions>} Options by ticker
 */
export function extractionOptions(
	index: PlanetSearchIndexEntry[]
): Map<string, IChainExtractionOptions> {
	const sites = new Map<string, IChainExtractionSite[]>();
	for (const planet of index)
		for (const r of planet.resources) {
			if (r.daily_extraction <= 0) continue;
			const list = sites.get(r.material_ticker) ?? [];
			list.push({
				planetId: planet.planet_natural_id,
				planetName: planetDisplayName(
					planet.planet_natural_id,
					planet.planet_name
				),
				dailyExtraction: r.daily_extraction,
				buildingTicker: extractorOf[r.resource_type],
			});
			sites.set(r.material_ticker, list);
		}

	const options = new Map<string, IChainExtractionOptions>();
	for (const [ticker, list] of sites) {
		list.sort((a, b) => b.dailyExtraction - a.dailyExtraction);
		// descending, so the 90th percentile sits in the top 10 %
		const k = Math.max(
			0,
			list.length - Math.ceil(TYPICAL_PERCENTILE * list.length)
		);
		options.set(ticker, { typical: list[k], sites: list });
	}
	return options;
}
