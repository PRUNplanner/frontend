import { computed, ComputedRef } from "vue";

// Util
import { boundaryDescriptor } from "@/util/numbers";

// Composables
import {
	boundaryGravityHigh,
	boundaryGravityLow,
	boundaryPressureHigh,
	boundaryPressureLow,
	boundaryTemperatureHigh,
	boundaryTemperatureLow,
} from "@/database/services/usePlanetData";
import { usePathfinder } from "@/features/pathfinding/usePathfinder";

// Types & Interfaces
import { IPlanet } from "@/features/api/gameData.types";
import {
	IPlanetSearchResult,
	IPlanetSearchResultResource,
} from "@/features/planet_search/usePlanetSearchResults.types";
import { BOUNDARY_DESCRIPTOR } from "@/util/numbers.types";

const {
	getPathBetweenLength,
	systemidAI1,
	systemidCI1,
	systemidIC1,
	systemidNC1,
} = usePathfinder();

export function usePlanetSearchResults(
	searchData: IPlanet[],
	searchMaterials: string[],
	searchMaterialRichness: Record<string, number>,
	searchSystem: string | undefined,
	searchSystemDistance: number | undefined
) {
	/**
	 * Computed Ref with table-ready planet search data
	 * @author jplacht
	 *
	 * @type {ComputedRef<IPlanetSearchResult[]>}
	 */
	const results: ComputedRef<IPlanetSearchResult[]> = computed(() => {
		if (searchData.length === 0) return [];

		const r: IPlanetSearchResult[] = searchData
			.map((e) => {
				// handle resources
				const searchResources: Record<
					string,
					IPlanetSearchResultResource
				> = {};
				const additionalResources: IPlanetSearchResultResource[] = [];
				e.resources.forEach((er) => {
					if (!searchMaterials.includes(er.material_ticker)) {
						additionalResources.push({
							ticker: er.material_ticker,
							dailyExtraction: er.daily_extraction,
							maxExtraction: er.max_daily_extraction,
						});
					} else {
						searchResources[er.material_ticker] = {
							ticker: er.material_ticker,
							dailyExtraction: er.daily_extraction,
							maxExtraction: er.max_daily_extraction,
						};
					}
				});
				// sort additional resources
				additionalResources.sort((a, b) =>
					a.ticker > b.ticker ? 1 : -1
				);

				// environmental material additions
				const environmentSurface: string[] = [];
				const environmentGravity: string[] = [];
				const environmentPressure: string[] = [];
				const environmentTemperature: string[] = [];

				// surface
				if (e.surface) environmentSurface.push("MCG");
				else environmentSurface.push("AEF");

				// gravity
				const gravityType: BOUNDARY_DESCRIPTOR = boundaryDescriptor(
					e.gravity,
					boundaryGravityLow,
					boundaryGravityHigh
				);
				if (gravityType === "LOW") environmentGravity.push("MGC");
				else if (gravityType === "HIGH") environmentGravity.push("BL");

				// pressure
				const pressureType: BOUNDARY_DESCRIPTOR = boundaryDescriptor(
					e.pressure,
					boundaryPressureLow,
					boundaryPressureHigh
				);
				if (pressureType === "LOW") environmentPressure.push("SEA");
				else if (pressureType === "HIGH")
					environmentPressure.push("HSE");

				// temperature

				const temperatureType: BOUNDARY_DESCRIPTOR = boundaryDescriptor(
					e.temperature,
					boundaryTemperatureLow,
					boundaryTemperatureHigh
				);
				if (temperatureType === "LOW")
					environmentTemperature.push("INS");
				else if (temperatureType === "HIGH")
					environmentTemperature.push("TSH");

				// infrastructures
				const infrastructures: string[] = [];

				if (e.has_localmarket) infrastructures.push("LM");
				if (e.has_chamberofcommerce) infrastructures.push("COGC");
				if (e.has_warehouse) infrastructures.push("WAR");
				if (e.has_administrationcenter) infrastructures.push("ADM");
				if (e.has_shipyard) infrastructures.push("SHY");

				infrastructures.sort((a, b) => (a > b ? 1 : -1));

				return {
					planetId: e.planet_natural_id,
					planetName: e.planet_name,
					fertility:
						e.fertility === -1 ? 0 : 1 + e.fertility * (10 / 33),
					cogcProgram:
						e.active_cogc_program_type !== null
							? e.active_cogc_program_type
							: "—",
					environmentSurface,
					environmentGravity,
					environmentPressure,
					environmentTemperature,
					distanceAI1: getPathBetweenLength(systemidAI1, e.system_id),
					distanceCI1: getPathBetweenLength(systemidCI1, e.system_id),
					distanceIC1: getPathBetweenLength(systemidIC1, e.system_id),
					distanceNC1: getPathBetweenLength(systemidNC1, e.system_id),
					checkDistance:
						searchSystem && searchSystemDistance
							? getPathBetweenLength(searchSystem, e.system_id)
							: null,
					searchResources,
					additionalResources,
					infrastructures,
				};
			})
			.filter((f) => {
				// richness checking
				for (const material of searchMaterials) {
					const minRichness = searchMaterialRichness[material];
					if (minRichness && minRichness > 0) {
						const resource = f.searchResources[material];
						if (resource && resource.maxExtraction > 0) {
							const richnessPct =
								(resource.dailyExtraction /
									resource.maxExtraction) *
								100;
							if (richnessPct < minRichness) {
								return false;
							}
						}
					}
				}

				// distance checking
				if (!searchSystem || !searchSystemDistance) return true;
				else {
					if (
						!f.checkDistance ||
						(f.checkDistance != -1 &&
							f.checkDistance <= searchSystemDistance)
					)
						return true;
					return false;
				}
			});

		return r;
	});

	return {
		results,
	};
}
