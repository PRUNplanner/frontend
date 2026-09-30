// Util
import { boundaryDescriptor } from "@/util/numbers";
import {
	boundaryGravityHigh,
	boundaryGravityLow,
	boundaryPressureHigh,
	boundaryPressureLow,
	boundaryTemperatureHigh,
	boundaryTemperatureLow,
} from "@/database/services/usePlanetData";

// Types & Interfaces
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type {
	IPlanetEnvironmentBuckets,
	IPlanetEnvironmentExtra,
} from "@/features/planet_search/planetSearch.types";

/**
 * Environment buckets of a full planet, as the backend stores them
 * @author jplacht
 *
 * @param {Planet} planet Planet
 * @returns {IPlanetEnvironmentBuckets} Surface and LOW/NORMAL/HIGH buckets
 */
export function planetBuckets(planet: Planet): IPlanetEnvironmentBuckets {
	return {
		surface: planet.surface,
		gravity_type: boundaryDescriptor(
			planet.gravity,
			boundaryGravityLow,
			boundaryGravityHigh
		),
		pressure_type: boundaryDescriptor(
			planet.pressure,
			boundaryPressureLow,
			boundaryPressureHigh
		),
		temperature_type: boundaryDescriptor(
			planet.temperature,
			boundaryTemperatureLow,
			boundaryTemperatureHigh
		),
	};
}

/**
 * Extra building materials a planet's environment requires, surface
 * material (MCG/AEF) first. Mirrors getPlanetSpecialMaterials in the
 * plan engine, which stays the source of the amounts.
 * @author jplacht
 *
 * @param {IPlanetEnvironmentBuckets} p Surface and environment buckets
 * @returns {IPlanetEnvironmentExtra[]} Tickers with their reason
 */
export function environmentExtras(
	p: IPlanetEnvironmentBuckets
): IPlanetEnvironmentExtra[] {
	const extras: IPlanetEnvironmentExtra[] = [
		p.surface
			? { ticker: "MCG", reason: "rocky" }
			: { ticker: "AEF", reason: "gaseous" },
	];

	if (p.gravity_type === "LOW")
		extras.push({ ticker: "MGC", reason: "low_gravity" });
	else if (p.gravity_type === "HIGH")
		extras.push({ ticker: "BL", reason: "high_gravity" });

	if (p.pressure_type === "LOW")
		extras.push({ ticker: "SEA", reason: "low_pressure" });
	else if (p.pressure_type === "HIGH")
		extras.push({ ticker: "HSE", reason: "high_pressure" });

	if (p.temperature_type === "LOW")
		extras.push({ ticker: "INS", reason: "low_temperature" });
	else if (p.temperature_type === "HIGH")
		extras.push({ ticker: "TSH", reason: "high_temperature" });

	return extras;
}
