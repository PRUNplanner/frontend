// Prices
import {
	findExchangeRule,
	type IPriceBook,
	type PriceType,
} from "@/features/cx/priceBook";

// Util
import {
	ALL_PLANETS,
	planetsWithRules,
} from "@/features/exchanges/cxEdit.util";

// Types & Interfaces
import type {
	CXData,
	CXExchangeOptionType,
} from "@/features/api/schemas/cxData.schemas";
import type {
	IExchangePlanBase,
	IMaterialCOGM,
} from "@/features/exchanges/useExchangePlanData.types";

/** a fixed buy price this far off its COGM is flagged */
export const COGM_DRIFT_THRESHOLD = 0.02;

export type ExchangeNoteCode =
	| "exchange_gap"
	| "no_price"
	| "fixed_zero"
	| "cogm_drift"
	| "planet_redundant"
	| "unused_preference"
	| "unplanned_planets";

export interface IExchangeNote {
	code: ExchangeNoteCode;
	kind: "warning" | "info";
	// ALL_PLANETS or a planet natural id: where the rule to change is
	scope: string;
	tickers: string[];
	planets: string[];
	type?: PriceType;
	// exchange_gap: the rule without a price
	option?: CXExchangeOptionType;
	// fixed_zero, cogm_drift: the fixed price; cogm_drift: the COGM
	value?: number;
	cogm?: number;
}

interface INotesInput {
	// the rules as edited
	cxData: CXData;
	// the linked plans
	bases: IExchangePlanBase[];
	bookFor: (planet: string) => IPriceBook;
	cogms: Map<string, IMaterialCOGM>;
	linkedEmpires: number;
	// planets of every plan the player has
	plannedPlanets: Set<string>;
}

const sorted = (values: Iterable<string>) => [...new Set(values)].sort();

const sameRules = (a: unknown[], b: unknown[]) =>
	JSON.stringify(a.map((e) => JSON.stringify(e)).sort()) ===
	JSON.stringify(b.map((e) => JSON.stringify(e)).sort());

/**
 * Notes on a preference's rules, over the edited rules and the linked
 * plans' materials: warnings for materials that price at 0 ȼ for lack of
 * a price, infos for fixed 0, COGM drift, redundant planet rules, an
 * unused preference and rules of planets without a plan. Warnings first.
 * @author jplacht
 *
 * @param {INotesInput} input Rules, plans, prices and COGMs
 * @returns {IExchangeNote[]} Notes
 */
export function exchangeNotes(input: INotesInput): IExchangeNote[] {
	const { cxData, bases, bookFor, cogms } = input;
	const notes: IExchangeNote[] = [];

	// 1 and 2: materials the plans use that price at 0 for lack of a price
	const gaps = new Map<
		string,
		{ note: IExchangeNote; tickers: Set<string>; planets: Set<string> }
	>();
	const addGap = (key: string, note: IExchangeNote, t: string, p: string) => {
		let gap = gaps.get(key);
		if (!gap) {
			gap = { note, tickers: new Set(), planets: new Set() };
			gaps.set(key, gap);
		}
		gap.tickers.add(t);
		gap.planets.add(p);
	};

	for (const base of bases) {
		const book = bookFor(base.planet);
		for (const { ticker, delta } of base.materials) {
			const type: PriceType = delta < 0 ? "BUY" : "SELL";
			const source = book.getPriceSource(ticker, type);
			if (!source.zero && source.level !== "unresolved") continue;

			if (
				source.level === "planet_exchange" ||
				source.level === "empire_exchange"
			) {
				const rule = findExchangeRule(cxData, base.planet, type)!;
				const scope =
					source.level === "planet_exchange" ? base.planet : ALL_PLANETS;
				addGap(
					`gap#${scope}#${rule.option}#${type}`,
					{
						code: "exchange_gap",
						kind: "warning",
						scope,
						type,
						option: rule.option,
						tickers: [],
						planets: [],
					},
					ticker,
					base.planet
				);
			} else if (
				source.level === "fallback" ||
				source.level === "unresolved"
			)
				addGap(
					"no_price",
					{
						code: "no_price",
						kind: "warning",
						scope: ALL_PLANETS,
						tickers: [],
						planets: [],
					},
					ticker,
					base.planet
				);
		}
	}
	for (const { note, tickers, planets } of gaps.values())
		notes.push({ ...note, tickers: sorted(tickers), planets: sorted(planets) });

	// 3: fixed at 0
	const zero = (prefs: CXData["ticker_empire"]) =>
		sorted(prefs.filter((p) => p.value === 0).map((p) => p.ticker));
	const zeroAll = zero(cxData.ticker_empire);
	if (zeroAll.length)
		notes.push({
			code: "fixed_zero",
			kind: "info",
			scope: ALL_PLANETS,
			tickers: zeroAll,
			planets: [],
			value: 0,
		});
	for (const { planet, preferences } of cxData.ticker_planets) {
		const tickers = zero(preferences);
		if (tickers.length)
			notes.push({
				code: "fixed_zero",
				kind: "info",
				scope: planet,
				tickers,
				planets: [planet],
				value: 0,
			});
	}

	// 4: an all-planets fixed buy price off its COGM
	for (const p of cxData.ticker_empire) {
		if (p.type === "SELL") continue;
		const cogm = cogms.get(p.ticker);
		if (!cogm || cogm.value <= 0) continue;
		if (Math.abs(p.value - cogm.value) / cogm.value <= COGM_DRIFT_THRESHOLD)
			continue;
		notes.push({
			code: "cogm_drift",
			kind: "info",
			scope: ALL_PLANETS,
			tickers: [p.ticker],
			planets: sorted(
				cogm.entries
					.filter((e) => e.value === cogm.value)
					.map((e) => e.planet)
			),
			value: p.value,
			cogm: cogm.value,
		});
	}

	// 5: a planet rule identical to the all-planets rule
	for (const { planet, preferences } of cxData.cx_planets)
		if (
			preferences.length > 0 &&
			sameRules(preferences, cxData.cx_empire)
		)
			notes.push({
				code: "planet_redundant",
				kind: "info",
				scope: planet,
				tickers: [],
				planets: [planet],
			});

	// 6: no empire uses the preference; rules of planets without a plan
	if (input.linkedEmpires === 0)
		notes.push({
			code: "unused_preference",
			kind: "info",
			scope: ALL_PLANETS,
			tickers: [],
			planets: [],
		});
	const unplanned = planetsWithRules(cxData).filter(
		(p) => !input.plannedPlanets.has(p)
	);
	if (unplanned.length)
		notes.push({
			code: "unplanned_planets",
			kind: "info",
			scope: ALL_PLANETS,
			tickers: [],
			planets: sorted(unplanned),
		});

	return [
		...notes.filter((n) => n.kind === "warning"),
		...notes.filter((n) => n.kind === "info"),
	];
}
