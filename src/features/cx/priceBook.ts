// Types & Interfaces
import { IExchange } from "@/features/api/gameData.types";
import { CX_EXCHANGE_OPTION_TYPE, ICXData } from "@/stores/planningStore.types";
import {
	IMaterialIO,
	IMaterialIOMaterial,
	IMaterialIOMinimal,
} from "@/features/planning/usePlanCalculation.types";

/**
 * # Material Price & CX Preference Logic
 *
 * This module operates based on the following key principles to determine prices:
 *
 * ## Preference Types
 * The user can specify a preference type which can be "BUY", "SELL" or "BOTH".
 * If "BOTH" is selected, it will be used for either "BUY" or "SELL". The backend ensure
 * data integrity by preventing the setup of individual "BUY" or "SELL" preferences if a
 * "BOTH" option is also set.
 *
 * ## Preference Hierarchy
 * The price identification follows a hierarchical structure to determine the material price.
 * A lower-level preference always supersedes a higher-order one. The hierarchy is as follows:
 *
 * - Planet Material Preference
 * - Empire Material Preference
 * - Planet Exchange Preference
 * - Empire Exchange Preference
 * - Universe VWAP 30d (fallack)
 *
 * ## Fallback
 * If no preferences are defined at the planet or empire levels matching the price request
 * the system uses the Universe VWAP 30d data
 *
 * ## Price Book
 * A price book applies this logic for one CX preference and planet and
 * returns prices synchronously from preloaded exchange data. Each
 * (ticker, type) is resolved once per book, so create a new book per
 * calculation to pick up CX or exchange changes. Plain TypeScript, no Vue.
 */

export type PriceType = "BUY" | "SELL";

export interface IPriceBook {
	getPrice(materialTicker: string, type: PriceType): number;
}

type SplitOption<T> = T extends `${infer Prefix}_${infer Suffix}`
	? [Prefix, Suffix]
	: never;
type PrefixPart = SplitOption<CX_EXCHANGE_OPTION_TYPE>[0];
type SuffixPart = SplitOption<CX_EXCHANGE_OPTION_TYPE>[1];

function splitExchangeOption(option: CX_EXCHANGE_OPTION_TYPE) {
	const [prefix, suffix] = option.split("_") as [PrefixPart, SuffixPart];
	return { prefix, suffix };
}

/**
 * Splits Exchange Preference codes into parts and identifies
 * the correct key of IExchange to use.
 * @author jplacht
 *
 * @param {string} preference Preference, e.g., "IC1_BUY"
 * @returns {{
 * 		exchangeCode: string;
 * 		key: string;
 * 	}} Exchange code and value key
 */
export function getExchangeCodeKey(preference: CX_EXCHANGE_OPTION_TYPE): {
	exchangeCode: string;
	key: string;
} {
	let key: string;

	// split by underscore
	const splitted: string[] = preference.split("_");

	if (splitted.length !== 2) {
		throw new Error(
			`Invalid ExchangeCode input, must be separted by underscore: ${preference}`
		);
	}

	// first part indicates the exchange, second part the time, e.g. AI1_7D

	const { prefix: exchange, suffix: identifier } =
		splitExchangeOption(preference);

	const exchangeCode = exchange;

	switch (identifier) {
		case "7D":
			key = "vwap_7d";
			break;
		case "30D":
			key = "vwap_30d";
			break;
		case "ASK":
			key = "ask";
			break;
		case "BID":
			key = "bid";
			break;
		default:
			key = "vwap_30d";
	}

	return { exchangeCode, key };
}

/**
 * Creates a price book
 * @author jplacht
 *
 * @param {(() => ICXData) | undefined} getCXData CX preference data, read
 * once on first use; undefined uses the Universe VWAP 30d for everything
 * @param {string | undefined} planetNaturalId Planet for planet preferences
 * @param {(tickerId: string) => IExchange} getExchange Exchange data by id,
 * e.g. "RAT.UNIVERSE"; throws if missing
 * @returns {IPriceBook} Price Book
 */
export function createPriceBook(
	getCXData: (() => ICXData) | undefined,
	planetNaturalId: string | undefined,
	getExchange: (tickerId: string) => IExchange
): IPriceBook {
	const prices = new Map<string, number>();
	let cxData: ICXData | undefined;

	function exchangePrice(
		materialTicker: string,
		preference: CX_EXCHANGE_OPTION_TYPE
	): number {
		const { exchangeCode, key } = getExchangeCodeKey(preference);
		const tickerData = getExchange(`${materialTicker}.${exchangeCode}`);

		return (tickerData[key as keyof IExchange] ?? 0) as number;
	}

	function resolvePrice(materialTicker: string, type: PriceType): number {
		try {
			// no cx information, default to UNIVERSE
			if (!getCXData)
				return getExchange(`${materialTicker}.UNIVERSE`).vwap_30d;

			cxData ??= getCXData();

			// Planet Ticker Path
			if (planetNaturalId) {
				// find potential planet ticker setting
				const planetTickerPreference = cxData.ticker_planets
					.find((tp) => tp.planet === planetNaturalId)
					?.preferences.find(
						(t) =>
							t.ticker === materialTicker &&
							(t.type === type || t.type === "BOTH")
					);

				if (planetTickerPreference) {
					return planetTickerPreference.value;
				}
			}

			// Empire Ticker Path
			const empireTickerPreference = cxData.ticker_empire.find(
				(te) =>
					te.ticker === materialTicker &&
					(te.type === type || te.type === "BOTH")
			);

			if (empireTickerPreference) {
				return empireTickerPreference.value;
			}

			// Planet Exchange Path
			if (planetNaturalId) {
				// find potential planet exchange setting
				const planetExchangePreference = cxData.cx_planets
					.find((cp) => cp.planet === planetNaturalId)
					?.preferences.find(
						(cpp) => cpp.type === type || cpp.type === "BOTH"
					);

				if (planetExchangePreference) {
					return exchangePrice(
						materialTicker,
						planetExchangePreference.exchange
					);
				}
			}

			// Empire Exchange Path
			const empireExchangePreference = cxData.cx_empire.find(
				(ee) => ee.type === type || ee.type === "BOTH"
			);

			if (empireExchangePreference) {
				return exchangePrice(
					materialTicker,
					empireExchangePreference.exchange
				);
			}

			// None of the path specifics yielded a result, return PP30D_Average fallback
			return getExchange(`${materialTicker}.UNIVERSE`).vwap_30d;
		} catch (error) {
			if (error instanceof Error) {
				const exchangeError: Error = error;
				console.error(exchangeError);
			}
			return 0;
		}
	}

	return {
		getPrice(materialTicker: string, type: PriceType): number {
			const key = `${materialTicker}#${type}`;
			let price = prices.get(key);
			if (price === undefined) {
				price = resolvePrice(materialTicker, type);
				prices.set(key, price);
			}
			return price;
		},
	};
}

/**
 * Applies price/cost to a MaterialIOMinimal based on the price book
 * @author jplacht
 *
 * @param {IPriceBook} book Price Book
 * @param {IMaterialIOMinimal[]} data Material IO []
 * @param {PriceType} type Buying or Selling
 * @returns {number} Total Price of MaterialIO[]
 */
export function getMaterialIOTotalPrice(
	book: IPriceBook,
	data: IMaterialIOMinimal[],
	type: PriceType
): number {
	let sum = 0;
	for (const e of data) {
		const price = book.getPrice(e.ticker, type);
		sum += price * (e.output - e.input);
	}
	return sum;
}

/**
 * Enhances a minimal Material I/O with pricing information for its delta
 * @author jplacht
 *
 * @param {IPriceBook} book Price Book
 * @param {IMaterialIOMaterial[]} data Minimal Material I/O
 * @returns {IMaterialIO[]} Material I/O
 */
export function enhanceMaterialIOMaterial(
	book: IPriceBook,
	data: IMaterialIOMaterial[]
): IMaterialIO[] {
	const enhancedArray: IMaterialIO[] = [];

	for (const material of data) {
		const price =
			material.delta >= 0
				? book.getPrice(material.ticker, "SELL")
				: book.getPrice(material.ticker, "BUY");

		enhancedArray.push({
			...material,
			price: price * material.delta,
		});
	}

	return enhancedArray;
}
