// Types & Interfaces
import type { CXData } from "@/features/api/schemas/cxData.schemas";

/** the all-planets scope; planet scopes are planet natural ids */
export const ALL_PLANETS = "all";

// a list compared regardless of order
const same = <T>(a: T[], b: T[]) => {
	const key = (l: T[]) =>
		l
			.map((e) => JSON.stringify(e))
			.sort()
			.join("|");
	return key(a) === key(b);
};

const planetRules = (cx: CXData, planet: string) => ({
	exchanges: cx.cx_planets.find((p) => p.planet === planet)?.preferences ?? [],
	tickers:
		cx.ticker_planets.find((p) => p.planet === planet)?.preferences ?? [],
});

/**
 * Planets that have rules of their own, exchange or fixed prices
 *
 * @param {CXData} cx CX data
 * @returns {string[]} Planet natural ids
 */
export function planetsWithRules(cx: CXData): string[] {
	return [
		...new Set(
			[...cx.cx_planets, ...cx.ticker_planets]
				.filter((p) => p.preferences.length > 0)
				.map((p) => p.planet)
		),
	];
}

/**
 * Scopes whose rules differ: ALL_PLANETS and planet ids
 *
 * @param {CXData} loaded CX data as stored
 * @param {CXData} edit CX data as edited
 * @returns {string[]} Changed scopes
 */
export function changedScopes(loaded: CXData, edit: CXData): string[] {
	const changed: string[] = [];
	if (
		!same(loaded.cx_empire, edit.cx_empire) ||
		!same(loaded.ticker_empire, edit.ticker_empire)
	)
		changed.push(ALL_PLANETS);

	const planets = new Set([
		...planetsWithRules(loaded),
		...planetsWithRules(edit),
	]);
	for (const planet of planets) {
		const a = planetRules(loaded, planet);
		const b = planetRules(edit, planet);
		if (!same(a.exchanges, b.exchanges) || !same(a.tickers, b.tickers))
			changed.push(planet);
	}
	return changed;
}

/**
 * Sets one planet's exchange or fixed price rules; an empty list removes
 * the planet's entry
 *
 * @param {CXData} cx CX data
 * @param {string} planet Planet natural id
 * @param {"cx_planets" | "ticker_planets"} field Rules to set
 * @param {T[]} preferences New rules
 * @returns {CXData} CX data
 */
export function setPlanetRules<F extends "cx_planets" | "ticker_planets">(
	cx: CXData,
	planet: string,
	field: F,
	preferences: CXData[F][number]["preferences"]
): CXData {
	const others = (cx[field] as CXData[F]).filter((p) => p.planet !== planet);
	return {
		...cx,
		[field]:
			preferences.length > 0
				? [...others, { planet, preferences }]
				: others,
	};
}

/**
 * The CX data to save: every stored planet entry the player didn't
 * remove, also planets no plan uses any more, without empty entries
 *
 * @param {CXData} edit CX data as edited
 * @returns {CXData} Payload
 */
export function buildPayload(edit: CXData): CXData {
	return {
		cx_empire: edit.cx_empire,
		ticker_empire: edit.ticker_empire,
		cx_planets: edit.cx_planets.filter((p) => p.preferences.length > 0),
		ticker_planets: edit.ticker_planets.filter(
			(p) => p.preferences.length > 0
		),
	};
}
