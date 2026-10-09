// Types & Interfaces
import type { EmpirePayload } from "@/features/api/schemas/empireData.schemas";
import type { IChangeLine } from "@/features/save_conflict/saveConflict.types";

/** The configuration fields of an empire */
export type IEmpireDiffable = Pick<
	EmpirePayload,
	| "empire_name"
	| "empire_faction"
	| "empire_permits_used"
	| "empire_permits_total"
>;

const FIELDS: [keyof IEmpireDiffable, string][] = [
	["empire_name", "name"],
	["empire_faction", "faction"],
	["empire_permits_used", "permits_used"],
	["empire_permits_total", "permits_total"],
];

/**
 * What changed in an empire's configuration
 *
 * @author jplacht
 *
 * @param {IEmpireDiffable} from Old version
 * @param {IEmpireDiffable} to New version
 * @returns {IChangeLine[]} Change lines
 */
export function diffEmpire(
	from: IEmpireDiffable,
	to: IEmpireDiffable
): IChangeLine[] {
	return FIELDS.filter(([field]) => from[field] !== to[field]).map(
		([field, key]) => ({
			area: key,
			key,
			params: { from: from[field], to: to[field] },
		})
	);
}
