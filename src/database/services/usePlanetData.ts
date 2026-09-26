import { ref } from "vue";

import { useDB } from "@/database/composables/useDB";
import { planetsStore } from "@/database/stores";

// Engine
import { getPlanetSpecialMaterials } from "@/features/planning/engine/buildings";

// Types & Interfaces
import { IPlanet } from "@/features/api/gameData.types";

// Planetary type static boundaries, see the planning engine
export {
	boundaryGravityLow,
	boundaryGravityHigh,
	boundaryPressureLow,
	boundaryPressureHigh,
	boundaryTemperatureLow,
	boundaryTemperatureHigh,
} from "@/features/planning/engine/buildings";

export function usePlanetData() {
	const { allData, get, preload } = useDB(planetsStore);

	// reactive caches
	const planetNames = ref<Record<string, string>>({});

	async function getPlanet(planetNaturalId: string): Promise<IPlanet> {
		const planet = await get(planetNaturalId);

		if (!planet) {
			throw new Error(`Planet ${planetNaturalId} not available.`);
		}

		return planet;
	}

	async function getPlanetName(planetNaturalId: string): Promise<string> {
		try {
			const planet = await getPlanet(planetNaturalId);

			if (planet.planet_name != planet.planet_natural_id) {
				return `${planet.planet_name} (${planet.planet_natural_id})`;
			} else return planet.planet_name;
		} catch {
			return planetNaturalId;
		}
	}

	async function loadPlanetName(planetNaturalId: string): Promise<string> {
		if (!planetNames.value[planetNaturalId])
			planetNames.value[planetNaturalId] =
				await getPlanetName(planetNaturalId);

		return planetNames.value[planetNaturalId];
	}

	/**
	 * Planet name for templates: starts loading it and returns the
	 * placeholder until it is cached
	 * @author jplacht
	 *
	 * @param {string} planetNaturalId Planet Natural Id
	 * @param {string} [placeholder="..."] Shown while the name loads
	 * @returns {string} Planet name or placeholder
	 */
	function planetName(
		planetNaturalId: string,
		placeholder: string = "..."
	): string {
		// loadPlanetName skips cached names
		void loadPlanetName(planetNaturalId);
		return planetNames.value[planetNaturalId] ?? placeholder;
	}

	async function loadPlanetNames(planetNaturalIds: string[]) {
		const uniqueIds = [...new Set(planetNaturalIds)];

		await Promise.all(
			uniqueIds.map(async (id) => {
				if (!planetNames.value[id])
					planetNames.value[id] = await getPlanetName(id);
			})
		);
	}


	return {
		planets: allData,
		reload: preload,
		getPlanet,
		getPlanetName,
		loadPlanetName,
		planetName,
		loadPlanetNames,
		planetNames,
		getPlanetSpecialMaterials,
	};
}
