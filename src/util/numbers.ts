import numbro from "numbro";

import { i18n } from "@/lib/i18n";
import type { BOUNDARY_DESCRIPTOR } from "@/util/numbers.types";

// one Intl formatter per "digits|forceSign"
const formatters = new Map<string, Intl.NumberFormat>();

/**
 * Formats Number as String of 0,0.00, exactly like numbro's
 * `{ thousandSeparated, mantissa, optionalMantissa, forceSign }` but about
 * 6x faster: numbro's rounding, then a cached Intl formatter
 * @param {number} value numeric input
 * @returns {string} formatted number as string
 */
export function formatNumber(
	value: number,
	decimals: number = 2,
	optionalDecimals: boolean = false,
	forceSign: boolean = false
): string {
	if (!Number.isFinite(value)) return "—";

	// exponent form (tiny or huge numbers): numbro itself
	const str = String(value);
	if (str.includes("e")) {
		const format: numbro.Format = {
			thousandSeparated: true,
			mantissa: decimals,
			optionalMantissa: optionalDecimals,
			forceSign: forceSign,
		};

		return numbro(value).format(format);
	}

	// numbro rounds the shifted decimal string, so halves go up, also when
	// negative, and it never shows -0
	let rounded = Math.round(Number(`${str}e${decimals}`)) / 10 ** decimals;
	if (Object.is(rounded, -0)) rounded = 0;

	// optional decimals: all of them unless they are all zero
	const digits = optionalDecimals && Number.isInteger(rounded) ? 0 : decimals;
	const key = `${digits}|${forceSign}`;
	let formatter = formatters.get(key);
	if (!formatter) {
		formatter = new Intl.NumberFormat("en-US", {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits,
			signDisplay: forceSign ? "exceptZero" : "auto",
		});
		formatters.set(key, formatter);
	}
	return formatter.format(rounded);
}

const significant = new Intl.NumberFormat("en-US", {
	maximumSignificantDigits: 3,
});

/**
 * Formats a number that can be tiny (a material's weight or volume): below
 * 1 with up to 3 significant digits ("0.005"), else like formatNumber
 * @param {number} value numeric input
 * @returns {string} e.g. "0.005", "0.0123", "1.80"
 */
export function formatSmallNumber(value: number): string {
	if (!Number.isFinite(value)) return "—";
	return Math.abs(value) < 1 ? significant.format(value) : formatNumber(value);
}

/**
 * Formats a percentage as "12.34 %", or "—" without a unit for ∞ or NaN
 * @param {number} value percentage, 0-100
 * @param {number} decimals decimals
 * @returns {string} formatted percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
	return Number.isFinite(value) ? `${formatNumber(value, decimals)} %` : "—";
}

/**
 * Formats a number with a "+" in front of positive values, negatives keep
 * formatNumber's "-": "+1,234", "-12", "0"
 * @param {number} value numeric input
 * @param {number} decimals decimals
 * @returns {string} formatted number as string
 */
export function signed(value: number, decimals: number = 2): string {
	return (value > 0 ? "+" : "") + formatNumber(value, decimals);
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
	if (!Number.isFinite(value)) return "—";
	return numbro(value).format({ thousandSeparated: true });
}

/**
 * Formats a payback period in days. Values that never pay back
 * (non-finite or negative) render as "never". 0 means no
 * construction cost, which pays back at once.
 *
 * @export
 * @param {number} days payback period in days
 * @param {boolean} withUnit append " d" (off when the header carries the unit)
 * @returns {string} e.g. "12.34 d" or "never"
 */
export function formatPayback(days: number, withUnit = true): string {
	if (!Number.isFinite(days) || days < 0)
		return i18n.global.t("common.values.never");
	return formatNumber(days) + (withUnit ? " d" : "");
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
