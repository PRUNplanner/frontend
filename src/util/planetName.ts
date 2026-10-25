import systemNames from "@/assets/static/system_names.json";

const NAMES: Record<string, string> = systemNames;
const PLANET_ID = /^([A-Z]{2}-\d{3})([a-z]+)$/;

/**
 * Name of a planet's system (ZV-759b: Antares II), undefined when the
 * system has none
 * @author jplacht
 *
 * @param {string} naturalId Planet natural id
 * @returns {string | undefined} System name
 */
export function systemName(naturalId: string): string | undefined {
	const match = PLANET_ID.exec(naturalId);
	return match ? NAMES[match[1]] : undefined;
}

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

	const system = systemName(naturalId);
	return system ? `${system} ${PLANET_ID.exec(naturalId)![2]}` : naturalId;
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

/**
 * A label's name and its "(<id>)", so a template can keep the id on one
 * line (a planet id must not break at its hyphen); a bare id or name is
 * all second part
 * @author jplacht
 *
 * @param {string} label planetLabel output
 * @returns {[string, string]} name ("" without one) and the id part
 */
export function planetLabelParts(label: string): [string, string] {
	const i = label.lastIndexOf(" (");
	return i > 0 && label.endsWith(")")
		? [label.slice(0, i), label.slice(i + 1)]
		: ["", label];
}
