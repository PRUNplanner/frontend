// Types & Interfaces
import type { IPlanCalculation } from "@/features/planning/engine/engine.types";
import type {
	ExchangePriceKey,
	IPriceBook,
	IPriceSource,
} from "@/features/cx/priceBook";
import type { PlanSummary } from "@/features/api/schemas/planningData.schemas";

const BASIS_SUFFIX: Record<ExchangePriceKey, string> = {
	vwap_7d: "7D",
	vwap_30d: "30D",
	ask: "ASK",
	bid: "BID",
};

// the backend's bounds; a plan beyond them gets no payback
const MAX_PAYBACK_DAYS = 1_000_000;

function finite(value: number): number {
	return Number.isFinite(value) ? value : 0;
}

/**
 * A price source as the exchange option code the backend stores:
 * "CI1_30D", "UNIVERSE_7D", "CUSTOM" for fixed prices, null if unresolved
 *
 * @param {IPriceSource} source Price source
 * @returns {string | null} Code
 */
function priceBasis(source: IPriceSource): string | null {
	if (source.level === "planet_ticker" || source.level === "empire_ticker")
		return "CUSTOM";
	if (!source.exchange || !source.key) return null;
	const code = `${source.exchange}_${BASIS_SUFFIX[source.key]}`;
	// the Universe has no ask or bid
	return code === "UNIVERSE_ASK" || code === "UNIVERSE_BID" ? null : code;
}

/**
 * The plan's numbers for its link preview: profit, revenue and cost per
 * day as the plan overview shows them, payback, plan cost, area and the
 * four outputs sold for the most, with the price basis of the top one
 * @author jplacht
 *
 * @param {IPlanCalculation} calculation Engine result and overview
 * @param {IPriceBook} prices The price book the plan was calculated with
 * @returns {PlanSummary} Summary
 */
export function buildPlanSummary(
	calculation: IPlanCalculation,
	prices: IPriceBook
): PlanSummary {
	const { result, overview } = calculation;
	const profit: number = finite(overview.profit);
	const payback: number = overview.roi;

	const sold = result.materialio
		.filter((m) => m.delta > 0)
		.sort((a, b) => b.price - a.price);
	// nothing sold: the inputs' basis is the plan's basis
	const basisTicker: string | undefined = (sold[0] ?? result.materialio[0])
		?.ticker;

	return {
		v: 1,
		profit,
		revenue: finite(overview.dailyProfit),
		cost: finite(
			overview.dailyCost +
				overview.dailyDegradationCost +
				overview.dailyProductionFeeCost
		),
		payback_days:
			profit > 0 &&
			Number.isFinite(payback) &&
			payback >= 0 &&
			payback <= MAX_PAYBACK_DAYS
				? payback
				: null,
		plan_cost: Math.max(finite(overview.totalConstructionCost), 0),
		area_used: Math.max(Math.round(result.area.areaUsed), 0),
		area_total: Math.max(Math.round(result.area.areaTotal), 0),
		outputs: sold.slice(0, 4).map((m) => ({
			ticker: m.ticker,
			per_day: finite(m.delta),
		})),
		price_basis: basisTicker
			? priceBasis(
					prices.getPriceSource(basisTicker, sold[0] ? "SELL" : "BUY")
				)
			: null,
		cogc: result.cogc === "---" ? null : result.cogc,
	};
}
