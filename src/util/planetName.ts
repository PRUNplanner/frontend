import systemNames from "@/assets/static/system_names.json";

const NAMES: Record<string, string> = systemNames;
const PLANET_ID = /^([A-Z]{2}-\d{3})([a-z]+)$/;

/**
 * The name the game shows for a planet: its own name, or for an unnamed
 * planet in a named system "<system name> <letter>" (ZV-759e: Antares II e)
 * @author jplacht
 *
 * @param {string} naturalId Planet natural id
 * @param {string | null | undefined} planetName FIO planet name, equal to
 * the id when unnamed; undefined/null when the record isn't loaded
 * @returns {string} Display name, the natural id as fallback
 */
export function planetDisplayName(
	naturalId: string,
	planetName: string | null | undefined
): string {
	// without the record a derived name could hide the real one (Vulcan)
	if (planetName === undefined || planetName === null) return naturalId;
	if (planetName !== "" && planetName !== naturalId) return planetName;

	const match = PLANET_ID.exec(naturalId);
	const system = match ? NAMES[match[1]] : undefined;
	return system ? `${system} ${match![2]}` : naturalId;
}

/**
 * "<display name> (<id>)", or just the id when there is no name
 * @author jplacht
 */
export function planetLabel(
	naturalId: string,
	planetName: string | null | undefined
): string {
	const name = planetDisplayName(naturalId, planetName);
	return name === naturalId ? naturalId : `${name} (${naturalId})`;
}
