// Types & Interfaces
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type {
	CXData,
	CXExchangeOptionType,
} from "@/features/api/schemas/cxData.schemas";
import type { EXCHANGES_TYPE } from "@/database/services/useExchangeData.types";
import type {
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

/** where a price came from, in the order of the preference hierarchy */
export type PriceSourceLevel =
	| "planet_ticker"
	| "empire_ticker"
	| "planet_exchange"
	| "empire_exchange"
	| "fallback"
	| "unresolved";

export interface IPriceSource {
	level: PriceSourceLevel;
	// null for fixed ticker values and unresolved prices
	exchange: EXCHANGES_TYPE | null;
	key: ExchangePriceKey | null;
	// the price is 0, e.g. an ASK preference without offers
	zero: boolean;
	// whose traded volume the price is checked against: the source's
	// exchange, else the planet or empire exchange preference, else UNIVERSE
	volume: EXCHANGES_TYPE;
}

export interface IPriceBook {
	getPrice(materialTicker: string, type: PriceType): number;
	getPriceSource(materialTicker: string, type: PriceType): IPriceSource;
}

type SplitOption<T> = T extends `${infer Prefix}_${infer Suffix}`
	? [Prefix, Suffix]
	: never;
type PrefixPart = SplitOption<CXExchangeOptionType>[0];
type SuffixPart = SplitOption<CXExchangeOptionType>[1];

type ExchangePriceKey = "vwap_7d" | "vwap_30d" | "ask" | "bid";

function splitExchangeOption(option: CXExchangeOptionType) {
	const [prefix, suffix] = option.split("_") as [PrefixPart, SuffixPart];
	return { prefix, suffix };
}

/**
 * Splits Exchange Preference codes into parts and identifies
 * the correct key of Exchange to use.
 * @author jplacht
 *
 * @param {string} preference Preference, e.g., "IC1_BUY"
 * @returns {{
 * 		exchangeCode: string;
 * 		key: ExchangePriceKey;
 * 	}} Exchange code and value key
 */
export function getExchangeCodeKey(preference: CXExchangeOptionType): {
	exchangeCode: string;
	key: ExchangePriceKey;
} {
	let key: ExchangePriceKey;

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
 * @param {(() => CXData) | undefined} getCXData CX preference data, read
 * once on first use; undefined uses the Universe VWAP 30d for everything
 * @param {string | undefined} planetNaturalId Planet for planet preferences
 * @param {(tickerId: string) => Exchange} getExchange Exchange data by id,
 * e.g. "RAT.UNIVERSE"; throws if missing
 * @returns {IPriceBook} Price Book
 */
export function createPriceBook(
	getCXData: (() => CXData) | undefined,
	planetNaturalId: string | undefined,
	getExchange: (tickerId: string) => Exchange
): IPriceBook {
	const resolved = new Map<string, { price: number; source: IPriceSource }>();
	let cxData: CXData | undefined;

	const matches = (t: { type: string }, type: PriceType) =>
		t.type === type || t.type === "BOTH";

	// a fixed ticker value: planet first, then empire
	function tickerPreference(
		cx: CXData,
		materialTicker: string,
		type: PriceType
	): { level: PriceSourceLevel; value: number } | undefined {
		const isTicker = (t: { ticker: string; type: string }) =>
			t.ticker === materialTicker && matches(t, type);
		const planet = planetNaturalId
			? cx.ticker_planets
					.find((tp) => tp.planet === planetNaturalId)
					?.preferences.find(isTicker)
			: undefined;
		if (planet) return { level: "planet_ticker", value: planet.value };
		const empire = cx.ticker_empire.find(isTicker);
		if (empire) return { level: "empire_ticker", value: empire.value };
		return undefined;
	}

	// an exchange preference: planet first, then empire
	function exchangePreference(
		cx: CXData,
		type: PriceType
	): { level: PriceSourceLevel; option: CXExchangeOptionType } | undefined {
		const planet = planetNaturalId
			? cx.cx_planets
					.find((cp) => cp.planet === planetNaturalId)
					?.preferences.find((p) => matches(p, type))
			: undefined;
		if (planet) return { level: "planet_exchange", option: planet.exchange };
		const empire = cx.cx_empire.find((p) => matches(p, type));
		if (empire) return { level: "empire_exchange", option: empire.exchange };
		return undefined;
	}

	function resolve(
		materialTicker: string,
		type: PriceType
	): { price: number; source: IPriceSource } {
		const result = (
			price: number,
			source: Omit<IPriceSource, "zero">
		) => ({ price, source: { ...source, zero: price === 0 } });

		try {
			if (getCXData) cxData ??= getCXData();

			const ticker = cxData
				? tickerPreference(cxData, materialTicker, type)
				: undefined;
			const preference = cxData
				? exchangePreference(cxData, type)
				: undefined;
			const preferred = preference
				? getExchangeCodeKey(preference.option)
				: undefined;
			const volume = (preferred?.exchangeCode ??
				"UNIVERSE") as EXCHANGES_TYPE;

			if (ticker)
				return result(ticker.value, {
					level: ticker.level,
					exchange: null,
					key: null,
					volume,
				});

			if (preference && preferred) {
				const tickerData = getExchange(
					`${materialTicker}.${preferred.exchangeCode}`
				);
				return result(tickerData[preferred.key] ?? 0, {
					level: preference.level,
					exchange: volume,
					key: preferred.key,
					volume,
				});
			}

			// no preference for this type: Universe VWAP 30d
			return result(getExchange(`${materialTicker}.UNIVERSE`).vwap_30d, {
				level: "fallback",
				exchange: "UNIVERSE",
				key: "vwap_30d",
				volume,
			});
		} catch (error) {
			if (error instanceof Error) {
				const exchangeError: Error = error;
				console.error(exchangeError);
			}
			return result(0, {
				level: "unresolved",
				exchange: null,
				key: null,
				volume: "UNIVERSE",
			});
		}
	}

	function lookup(materialTicker: string, type: PriceType) {
		const key = `${materialTicker}#${type}`;
		let entry = resolved.get(key);
		if (entry === undefined) {
			entry = resolve(materialTicker, type);
			resolved.set(key, entry);
		}
		return entry;
	}

	return {
		getPrice: (materialTicker, type) => lookup(materialTicker, type).price,
		getPriceSource: (materialTicker, type) =>
			lookup(materialTicker, type).source,
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

/**
 * A price book with one material's BUY and SELL price multiplied, every
 * other price read from the given book. For what-if calculations.
 * @author jplacht
 *
 * @param {IPriceBook} book Price Book
 * @param {string} ticker Material to scale
 * @param {number} factor Multiplier, e.g. 1.2 for +20 %
 * @returns {IPriceBook} Scaled Price Book
 */
export function scaledPriceBook(
	book: IPriceBook,
	ticker: string,
	factor: number
): IPriceBook {
	return {
		getPrice(materialTicker: string, type: PriceType): number {
			const price = book.getPrice(materialTicker, type);
			return materialTicker === ticker ? price * factor : price;
		},
		getPriceSource: book.getPriceSource,
	};
}
