import type { BOUNDARY_DESCRIPTOR } from "./numbers.types";

/**
 * Checks a value against boundaries and returns a
 * descriptor, used in planetary features
 * @author jplacht
 *
 * @export
 * @param {number} value Value
 * @param {number} lower Lower Boundary
 * @param {number} upper Upper Boundary
 * @returns {BOUNDARY_DESCRIPTOR} "HIGH", "LOW", "NORMAL"
 */
export function boundaryDescriptor(
	value: number,
	lower: number,
	upper: number
): BOUNDARY_DESCRIPTOR {
	if (value < lower) return "LOW";
	else if (value > upper) return "HIGH";
	else return "NORMAL";
}
