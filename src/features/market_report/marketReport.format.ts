import { formatNumber } from "@/util/numbers";
import { changeSign } from "@/features/market_report/marketReport.util";

// the market report's texts; the numbers stay in marketReport.util.ts,
// which the MCP server imports in Node

/**
 * ȼ with a short unit: "412 ȼ", "1.8 k ȼ", "37 M ȼ", "8.97 B ȼ"
 *
 * @param {number} value ȼ
 * @returns {string} Formatted amount
 */
export function formatMoney(value: number): string {
	const abs = Math.abs(value);
	if (abs >= 1e9)
		return `${formatNumber(value / 1e9, abs >= 1e10 ? 1 : 2)} B ȼ`;
	if (abs >= 1e6)
		return `${formatNumber(value / 1e6, abs >= 1e8 ? 0 : 1)} M ȼ`;
	if (abs >= 1e4) return `${formatNumber(value / 1e3, 1)} k ȼ`;
	return `${formatNumber(value, 0)} ȼ`;
}

/**
 * An order book price: whole prices without decimals, as the books quote
 * them, else 2 decimals under 100, 1 under 1,000, none above
 *
 * @param {number} value Price
 * @returns {string} Formatted price
 */
export function formatBookPrice(value: number): string {
	return formatNumber(
		value,
		Number.isInteger(value) ? 0 : value < 100 ? 2 : value < 1000 ? 1 : 0
	);
}

/**
 * A change with arrow and sign, so it never relies on colour: "▲ +7.9 %",
 * joined by no-break spaces so it never wraps inside
 *
 * @param {number | null} pct Change in %
 * @param {number} [decimals=1] Decimals
 * @returns {string} Formatted change, "–" without one
 */
export function formatChange(pct: number | null, decimals: number = 1): string {
	if (pct == null) return "–";
	const sign = changeSign(pct, decimals);
	const arrow = sign > 0 ? "▲" : sign < 0 ? "▼" : "■";
	const text = formatNumber(Math.abs(pct), decimals);
	return `${arrow}\u00a0${sign > 0 ? "+" : sign < 0 ? "−" : ""}${text}\u00a0%`;
}
