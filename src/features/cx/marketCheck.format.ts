// Util
import { formatPercent } from "@/util/numbers";

/**
 * A share of the daily volume for display: one decimal below 100 %
 * @author jplacht
 *
 * @param {number | null} pct Share in %
 * @returns {string} e.g. "6.0 %", "189 %", "—"
 */
export function formatShare(pct: number | null): string {
	if (pct === null) return "—";
	// unlike formatPercent, ∞ and NaN keep the unit
	return Number.isFinite(pct) ? formatPercent(pct, pct < 100 ? 1 : 0) : "— %";
}
