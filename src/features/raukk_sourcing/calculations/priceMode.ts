// Types & Interfaces
import { RAUKK_PRICE_MODE } from "@/features/raukk_sourcing/raukkSourcing.types";
import { IRaukkExchangePrices } from "@/features/raukk_sourcing/calculations/raukkCalculations.types";

/**
 * Resolves a single unit price from exchange data for a price mode.
 *
 * `BID`, `ASK`, `AVG7D` and `AVG30D` map onto existing exchange fields,
 * `MID` is computed as `(bid + ask) / 2`. Missing exchange data or
 * non-finite values resolve to 0, mirroring `usePrice.getPrice` which
 * also falls back to 0 rather than throwing.
 *
 * @author raukk
 *
 * @param {IRaukkExchangePrices | undefined} exchange Exchange data
 * @param {RAUKK_PRICE_MODE} mode Requested price mode
 * @returns {number} Unit price
 */
export function resolveMarketPrice(
	exchange: IRaukkExchangePrices | undefined,
	mode: RAUKK_PRICE_MODE
): number {
	if (!exchange) return 0;

	switch (mode) {
		case "BID":
			return sanitize(exchange.bid);
		case "ASK":
			return sanitize(exchange.ask);
		case "MID":
			return (sanitize(exchange.bid) + sanitize(exchange.ask)) / 2;
		case "AVG7D":
			return sanitize(exchange.vwap_7d);
		case "AVG30D":
			return sanitize(exchange.vwap_30d);
		default:
			return 0;
	}
}

/**
 * Guards against null, undefined and NaN values coming from exchange
 * data of thinly traded materials.
 *
 * @author raukk
 *
 * @param {number | undefined | null} value Raw exchange value
 * @returns {number} Finite number, 0 as fallback
 */
function sanitize(value: number | undefined | null): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
