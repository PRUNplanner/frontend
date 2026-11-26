import { z } from "zod";

// Engine
import { createPriceBook } from "@prunplanner/engine";

// Types & Interfaces
import type {
	IPriceBook,
	IPriceSource,
	PriceType,
	EXCHANGES_TYPE,
} from "@prunplanner/engine";
import type { CX, CXData } from "@prunplanner/engine/schemas";
import type { IMcpGameData } from "@/mcp/gameData";

const EXCHANGES = ["AI1", "CI1", "IC1", "NC1"] as const;

/**
 * How a calculation prices materials: "plan" is the empire's CX preference
 * (as the app), the others price everything the same way, built as a
 * temporary CX preference so the app's price book resolves them
 */
export const PriceBasisSchema = z
	.enum([
		"plan",
		"UNIVERSE_7D",
		"UNIVERSE_30D",
		...EXCHANGES.flatMap((e) => [`${e}_7D`, `${e}_30D`, `${e}_ASKBID`]),
		"BEST_ASKBID",
	] as [string, ...string[]])
	.describe('Price basis (default "plan"); see the server instructions');
export type PriceBasis = z.infer<typeof PriceBasisSchema>;

const preference = (rules: CXData["cx_empire"]): CXData => ({
	cx_empire: rules,
	cx_planets: [],
	ticker_empire: [],
	ticker_planets: [],
});

/**
 * Buys at the lowest ask and sells at the highest bid across the four
 * exchanges; a material without any quote falls back to the plan's book
 */
function bestAskBidBook(
	fallback: IPriceBook,
	gameData: IMcpGameData
): IPriceBook {
	const best = (ticker: string, type: PriceType) => {
		let pick: { price: number; exchange: EXCHANGES_TYPE } | undefined;
		for (const e of EXCHANGES) {
			const ex = gameData.exchanges.get(`${ticker}.${e}`);
			const price = type === "BUY" ? ex?.ask : ex?.bid;
			if (!price) continue;
			const better =
				!pick ||
				(type === "BUY" ? price < pick.price : price > pick.price);
			if (better) pick = { price, exchange: e };
		}
		return pick;
	};
	return {
		getPrice: (ticker, type) =>
			best(ticker, type)?.price ?? fallback.getPrice(ticker, type),
		getPriceSource(ticker, type): IPriceSource {
			const pick = best(ticker, type);
			if (!pick) return fallback.getPriceSource(ticker, type);
			return {
				level: "empire_exchange",
				exchange: pick.exchange,
				key: type === "BUY" ? "ask" : "bid",
				zero: false,
				volume: pick.exchange,
			};
		},
	};
}

/**
 * A basis book whose missing prices (no trades, no offers, no row on that
 * exchange) fall back to the Universe VWAP 30D, as the basis note says
 */
function withUniverseFallback(
	book: IPriceBook,
	gameData: IMcpGameData
): IPriceBook {
	const universe = (ticker: string) =>
		gameData.exchanges.get(`${ticker}.UNIVERSE`)?.vwap_30d ?? 0;
	return {
		getPrice(ticker, type) {
			const price = book.getPrice(ticker, type);
			return price > 0 ? price : universe(ticker);
		},
		getPriceSource(ticker, type): IPriceSource {
			const source = book.getPriceSource(ticker, type);
			if (book.getPrice(ticker, type) > 0) return source;
			return {
				level: "fallback",
				exchange: "UNIVERSE",
				key: "vwap_30d",
				zero: universe(ticker) === 0,
				volume: source.volume,
			};
		},
	};
}

/**
 * The price book for a basis on a planet
 * @author jplacht
 *
 * @param {PriceBasis} basis Price basis
 * @param {CX | undefined} cx The empire's CX preference (basis "plan")
 * @param {string} planetNaturalId Planet, for planet preferences
 * @param {IMcpGameData} gameData Game data
 * @returns {IPriceBook} Price book
 */
export function basisBook(
	basis: PriceBasis,
	cx: CX | undefined,
	planetNaturalId: string,
	gameData: IMcpGameData
): IPriceBook {
	const book = (getCX: (() => CXData) | undefined) =>
		createPriceBook(getCX, planetNaturalId, gameData.getExchange);
	if (basis === "plan") return book(cx ? () => cx.cx_data : undefined);
	if (basis === "BEST_ASKBID")
		return bestAskBidBook(
			book(cx ? () => cx.cx_data : undefined),
			gameData
		);
	if (basis.endsWith("_ASKBID")) {
		const e = basis.slice(0, 3);
		return withUniverseFallback(
			book(() =>
				preference([
					{ type: "BUY", exchange: `${e}_ASK` },
					{ type: "SELL", exchange: `${e}_BID` },
				] as CXData["cx_empire"])
			),
			gameData
		);
	}
	return withUniverseFallback(
		book(() =>
			preference([
				{ type: "BOTH", exchange: basis },
			] as CXData["cx_empire"])
		),
		gameData
	);
}

/**
 * The price basis of a result, in words
 * @author jplacht
 */
export function basisText(basis: PriceBasis, cx: CX | undefined) {
	const fallback = "Universe VWAP 30D";
	if (basis === "plan")
		return {
			basis,
			cx_preference: cx?.cx_name ?? null,
			fallback,
			note: cx
				? `Prices follow the CX preference "${cx.cx_name}" per material; materials without a matching preference use the Universe VWAP 30D.`
				: "No CX preference: every price is the Universe VWAP 30D.",
		};
	const what = basis.endsWith("_ASKBID")
		? basis === "BEST_ASKBID"
			? "bought at the lowest ask and sold at the highest bid across AI1, CI1, IC1, NC1"
			: `bought at ${basis.slice(0, 3)} ask and sold at ${basis.slice(0, 3)} bid`
		: `${basis.replace("_", " VWAP ")} for every material`;
	return {
		basis,
		cx_preference: null,
		fallback,
		note: `Priced with ${what} instead of the plan's CX preference; a material without that price falls back to the Universe VWAP 30D${basis === "BEST_ASKBID" ? " (or the plan's price)" : ""}.`,
	};
}
