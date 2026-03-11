import numbro from "numbro";
import { BOUNDARY_DESCRIPTOR } from "@/util/numbers.types";

/**
 * Formats Number as String of 0,0.00
 * @param {number} value numeric input
 * @returns {string} formatted number as string
 */
export function formatNumber(
	value: number,
	decimals: number = 2,
	optionalDecimals: boolean = false,
	forceSign: boolean = false
): string {
	if (value === Infinity || isNaN(value)) {
		return "∞";
	}

	const format: numbro.Format = {
		thousandSeparated: true,
		mantissa: decimals,
		optionalMantissa: optionalDecimals,
		forceSign: forceSign,
	};

	return numbro(value).format(format);
}

/**
 * Formats a number representing an amount as String
 * with thousand separation.
 * @author jplacht
 *
 * @export
 * @param {number} value numeric input
 * @returns {string} formatted number as string
 */
export function formatAmount(value: number): string {
	if (value == Infinity || isNaN(value)) {
		return "∞";
	}
	return numbro(value).format({ thousandSeparated: true });
}

/**
 * Returns a number whose value is limited to given range
 * @author jplacht
 *
 * @export
 * @param {number} value Number
 * @param {number} min Min range limiter
 * @param {number} max Max range lmiter
 * @returns {number}
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

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
