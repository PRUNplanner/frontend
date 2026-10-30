// Prices
import {
	getMaterialIOTotalPrice,
	type IPriceBook,
	type PriceType,
} from "@/features/cx/priceBook";

// Engine
import { calculateCOGM } from "@/features/planning/engine/cogm";

// Types & Interfaces
import type { IPlanCalculation } from "@/features/planning/engine/engine.types";
import type {
	IExchangePlanBase,
	IMaterialCOGM,
	IMaterialPriceRow,
	IMaterialSide,
	IPlanetPrice,
} from "@/features/exchanges/useExchangePlanData.types";

/**
 * Keeps what a plan's calculation gives that doesn't depend on prices:
 * its Material I/O amounts and the inputs of each active recipe's COGM
 * @author jplacht
 *
 * @param {Omit<IExchangePlanBase, "materials" | "recipes">} plan Plan info
 * @param {IPlanCalculation} calculation Plan calculation
 * @returns {IExchangePlanBase} Price-free plan data
 */
export function toPlanBase(
	plan: Omit<IExchangePlanBase, "materials" | "recipes">,
	calculation: IPlanCalculation
): IExchangePlanBase {
	const { result } = calculation;
	return {
		...plan,
		materials: result.materialio
			.filter((m) => m.delta !== 0)
			.map((m) => ({ ticker: m.ticker, delta: m.delta })),
		recipes: result.production.buildings.flatMap((b) =>
			b.activeRecipes.map((recipe) => ({
				recipe,
				efficiency: b.totalEfficiency,
				constructionMaterials: b.constructionMaterials,
				workforceMaterials: b.workforceMaterials,
			}))
		),
	};
}

function side(planets: IPlanetPrice[]): IMaterialSide {
	const prices = planets.map((p) => p.price);
	const sources = new Set(
		planets.map(
			(p) => `${p.source.level}#${p.source.exchange}#${p.source.key}`
		)
	);
	const min = Math.min(...prices);
	const max = Math.max(...prices);
	return { planets, min, max, varies: min !== max || sources.size > 1 };
}

/**
 * Prices every material the plans buy or sell, per planet
 * @author jplacht
 *
 * @param {IExchangePlanBase[]} bases Plans
 * @param {(planet: string) => IPriceBook} bookFor Price book per planet
 * @returns {IMaterialPriceRow[]} One row per material, by ticker
 */
export function priceMaterials(
	bases: IExchangePlanBase[],
	bookFor: (planet: string) => IPriceBook
): IMaterialPriceRow[] {
	// ticker → side → planet → price
	const byTicker = new Map<
		string,
		Record<PriceType, Map<string, IPlanetPrice>>
	>();

	for (const base of bases) {
		const book = bookFor(base.planet);
		for (const { ticker, delta } of base.materials) {
			const type: PriceType = delta < 0 ? "BUY" : "SELL";
			let entry = byTicker.get(ticker);
			if (!entry) {
				entry = { BUY: new Map(), SELL: new Map() };
				byTicker.set(ticker, entry);
			}
			if (!entry[type].has(base.planet))
				entry[type].set(base.planet, {
					planet: base.planet,
					price: book.getPrice(ticker, type),
					source: book.getPriceSource(ticker, type),
				});
		}
	}

	return [...byTicker.entries()]
		.sort(([a], [b]) => (a > b ? 1 : -1))
		.map(([ticker, sides]) => ({
			ticker,
			buy: sides.BUY.size > 0 ? side([...sides.BUY.values()]) : null,
			sell: sides.SELL.size > 0 ? side([...sides.SELL.values()]) : null,
			planets: [...new Set([...sides.BUY.keys(), ...sides.SELL.keys()])],
		}));
}

/**
 * Every material's COGM in the plans, from the given prices: the engine's
 * calculateCOGM per active recipe, without recalculating the plans
 * @author jplacht
 *
 * @param {IExchangePlanBase[]} bases Plans
 * @param {(planet: string) => IPriceBook} bookFor Price book per planet
 * @returns {Map<string, IMaterialCOGM>} COGM by material ticker
 */
export function calculateMaterialCOGMs(
	bases: IExchangePlanBase[],
	bookFor: (planet: string) => IPriceBook
): Map<string, IMaterialCOGM> {
	const cogms = new Map<string, IMaterialCOGM>();

	for (const base of bases) {
		const book = bookFor(base.planet);
		for (const r of base.recipes) {
			const cogm = calculateCOGM(
				r.recipe,
				r.efficiency,
				// positive costs, as the engine passes them
				getMaterialIOTotalPrice(book, r.constructionMaterials, "BUY") *
					-1,
				getMaterialIOTotalPrice(book, r.workforceMaterials, "BUY") * -1,
				book
			);
			for (const output of cogm.outputCOGM) {
				if (!Number.isFinite(output.costTotal)) continue;
				const entry = {
					planUuid: base.planUuid,
					planName: base.planName,
					planet: base.planet,
					value: output.costTotal,
				};
				const known = cogms.get(output.ticker);
				if (known) {
					known.entries.push(entry);
					known.value = Math.min(known.value, entry.value);
				} else
					cogms.set(output.ticker, {
						ticker: output.ticker,
						value: entry.value,
						entries: [entry],
					});
			}
		}
	}

	return cogms;
}
