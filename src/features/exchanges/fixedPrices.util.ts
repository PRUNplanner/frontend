// Types & Interfaces
import type {
	CXData,
	CXDataTickerOption,
} from "@/features/api/schemas/cxData.schemas";

/*
 * Fixed prices as one row per material with a buy and a sell side, and
 * back to the stored shape: a BOTH row stays BOTH until its sides differ,
 * a BUY + SELL pair stays a pair, a new row with equal sides is saved as
 * BOTH, and an empty side stores nothing.
 */

export interface IFixedPriceRow {
	ticker: string;
	buy: number | null;
	sell: number | null;
	// how the row is stored: one BOTH, a BUY / SELL pair, or not yet
	stored: "both" | "pair" | "new";
}

/**
 * Stored fixed prices as rows, in stored order
 *
 * @param {CXDataTickerOption[]} options Stored fixed prices
 * @returns {IFixedPriceRow[]} Rows
 */
export function toRows(options: CXDataTickerOption[]): IFixedPriceRow[] {
	const rows = new Map<string, IFixedPriceRow>();
	for (const o of options) {
		const row = rows.get(o.ticker) ?? {
			ticker: o.ticker,
			buy: null,
			sell: null,
			stored: o.type === "BOTH" ? "both" : "pair",
		};
		if (o.type !== "SELL") row.buy = o.value;
		if (o.type !== "BUY") row.sell = o.value;
		rows.set(o.ticker, row);
	}
	return [...rows.values()];
}

/**
 * Rows as stored fixed prices
 *
 * @param {IFixedPriceRow[]} rows Rows
 * @returns {CXDataTickerOption[]} Stored fixed prices
 */
export function fromRows(rows: IFixedPriceRow[]): CXDataTickerOption[] {
	const options: CXDataTickerOption[] = [];
	for (const { ticker, buy, sell, stored } of rows) {
		if (stored !== "pair" && buy !== null && buy === sell) {
			options.push({ type: "BOTH", ticker, value: buy });
			continue;
		}
		if (buy !== null) options.push({ type: "BUY", ticker, value: buy });
		if (sell !== null) options.push({ type: "SELL", ticker, value: sell });
	}
	return options;
}

/**
 * Sets a material's fixed buy price, adding the row if needed; its sell
 * side stays as it is
 *
 * @param {CXDataTickerOption[]} options Stored fixed prices
 * @param {string} ticker Material
 * @param {number} value Buy price
 * @returns {CXDataTickerOption[]} Stored fixed prices
 */
export function setBuyPrice(
	options: CXDataTickerOption[],
	ticker: string,
	value: number
): CXDataTickerOption[] {
	const rows = toRows(options);
	const row = rows.find((r) => r.ticker === ticker);
	if (row) row.buy = value;
	else rows.push({ ticker, buy: value, sell: null, stored: "new" });
	return fromRows(rows);
}

/**
 * CX data without any fixed price for a material, for its market price
 *
 * @param {CXData} cx CX data
 * @param {string} ticker Material
 * @returns {CXData} CX data without the material's fixed prices
 */
export function withoutFixedPrice(cx: CXData, ticker: string): CXData {
	return {
		...cx,
		ticker_empire: cx.ticker_empire.filter((t) => t.ticker !== ticker),
		ticker_planets: cx.ticker_planets.map((p) => ({
			planet: p.planet,
			preferences: p.preferences.filter((t) => t.ticker !== ticker),
		})),
	};
}
