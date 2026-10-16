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

export type ExchangePriceKey = "vwap_7d" | "vwap_30d" | "ask" | "bid";

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

const matches = (t: { type: string }, type: PriceType) =>
	t.type === type || t.type === "BOTH";

/**
 * The fixed ticker value for a material: planet first, then all planets
 * @author jplacht
 *
 * @param {CXData} cx CX preference data
 * @param {string | undefined} planetNaturalId Planet
 * @param {string} materialTicker Material
 * @param {PriceType} type Buying or Selling
 * @returns Level and value, undefined without a matching rule
 */
export function findTickerRule(
	cx: CXData,
	planetNaturalId: string | undefined,
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

/**
 * The exchange rule for a type: planet first, then all planets
 * @author jplacht
 *
 * @param {CXData} cx CX preference data
 * @param {string | undefined} planetNaturalId Planet
 * @param {PriceType} type Buying or Selling
 * @returns Level and exchange option, undefined without a matching rule
 */
export function findExchangeRule(
	cx: CXData,
	planetNaturalId: string | undefined,
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
				? findTickerRule(cxData, planetNaturalId, materialTicker, type)
				: undefined;
			const preference = cxData
				? findExchangeRule(cxData, planetNaturalId, type)
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

/** one level of the price cascade, for explaining a price */
export interface IPriceStep {
	level: Exclude<PriceSourceLevel, "unresolved">;
	// a rule of this level matches the material and type
	matched: boolean;
	// the level's price, null without a rule or exchange data
	value: number | null;
	exchange: EXCHANGES_TYPE | null;
	key: ExchangePriceKey | null;
}

export interface IPriceExplanation {
	steps: IPriceStep[];
	// index of the step that sets the price, -1 when unresolved
	winner: number;
}

/**
 * Explains a price: every level of the cascade with its value and the one
 * that wins. Uses the price book's own rule lookups, so its winner is the
 * price book's source.
 * @author jplacht
 *
 * @param {CXData | undefined} cx CX preference data, undefined for Universe
 * @param {string | undefined} planetNaturalId Planet
 * @param {string} materialTicker Material
 * @param {PriceType} type Buying or Selling
 * @param {(tickerId: string) => Exchange} getExchange Exchange data by id
 * @returns {IPriceExplanation} Steps and winner
 */
export function explainPrice(
	cx: CXData | undefined,
	planetNaturalId: string | undefined,
	materialTicker: string,
	type: PriceType,
	getExchange: (tickerId: string) => Exchange
): IPriceExplanation {
	const exchangeValue = (
		option: CXExchangeOptionType
	): Omit<IPriceStep, "level" | "matched"> => {
		const { exchangeCode, key } = getExchangeCodeKey(option);
		const exchange = exchangeCode as EXCHANGES_TYPE;
		try {
			const data = getExchange(`${materialTicker}.${exchangeCode}`);
			return { value: data[key] ?? 0, exchange, key };
		} catch {
			return { value: null, exchange, key };
		}
	};
	const none = { matched: false, value: null, exchange: null, key: null };

	const tickerStep = (
		level: "planet_ticker" | "empire_ticker",
		planet: string | undefined
	): IPriceStep => {
		const rule = cx
			? findTickerRule(
					// the level alone: the other level's rule doesn't count
					level === "planet_ticker"
						? { ...cx, ticker_empire: [] }
						: { ...cx, ticker_planets: [] },
					planet,
					materialTicker,
					type
				)
			: undefined;
		return rule
			? { level, matched: true, value: rule.value, exchange: null, key: null }
			: { level, ...none };
	};

	const exchangeStep = (
		level: "planet_exchange" | "empire_exchange",
		planet: string | undefined
	): IPriceStep => {
		const rule = cx
			? findExchangeRule(
					level === "planet_exchange"
						? { ...cx, cx_empire: [] }
						: { ...cx, cx_planets: [] },
					planet,
					type
				)
			: undefined;
		return rule
			? { level, matched: true, ...exchangeValue(rule.option) }
			: { level, ...none };
	};

	const steps: IPriceStep[] = [
		tickerStep("planet_ticker", planetNaturalId),
		tickerStep("empire_ticker", undefined),
		exchangeStep("planet_exchange", planetNaturalId),
		exchangeStep("empire_exchange", undefined),
		{ level: "fallback", matched: true, ...exchangeValue("UNIVERSE_30D") },
	];

	// the first matching level wins; an exchange level only if no ticker
	// level matched, the fallback only if no exchange level matched
	let winner = steps.findIndex((s) => s.matched);
	if (steps[winner].value === null) winner = -1;

	return { steps, winner };
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
