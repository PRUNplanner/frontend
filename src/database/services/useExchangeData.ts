import { exchangesStore } from "@/database/stores";
import { useDB } from "@/database/composables/useDB";

// Types & Interfaces
import { IExchange } from "@/features/api/gameData.types";
import {
	EXCHANGES_TYPE,
	IMaterialExchangeOverview,
	IMaterialExchangeVWAPAnalysis,
	SIGNIFICANCE_LEVEL,
} from "@/database/services/useExchangeData.types";

export async function useExchangeData() {
	const exchangeTypesArray: EXCHANGES_TYPE[] = [
		"AI1",
		"CI1",
		"IC1",
		"NC1",
		"UNIVERSE",
	];

	const exchangeGameTypesArray: EXCHANGES_TYPE[] = [
		"AI1",
		"CI1",
		"IC1",
		"NC1",
	];

	const { get, preload } = useDB(exchangesStore);

	async function getExchangeTicker(tickerId: string): Promise<IExchange> {
		const exchange = await get(tickerId);

		if (exchange) return exchange;

		throw new Error(
			`Exchange data for ticker '${tickerId}' not found. Ensure game data is loaded and ticker is valid.`
		);
	}

	function calculateVWAPAnalysis(
		vwap_7d: number,
		vwap_30d: number
	): IMaterialExchangeVWAPAnalysis {
		const diffPercent = (vwap_7d - vwap_30d) / vwap_30d;
		const absDiff = Math.abs(diffPercent);

		/**
		 * significance levels
		 * <= 0.1 : stable
		 * > 0.05 : highly-significant
		 * > 0.02 : significant
		 */
		let significance: SIGNIFICANCE_LEVEL = "STABLE";

		if (absDiff > 0.05) significance = "HIGHLY-SIGNIFICANT";
		else if (absDiff > 0.02) significance = "SIGNIFICANT";

		return {
			significance,
			percentChange: diffPercent,
		};
	}

	async function getMaterialExchangeOverview(
		materialTicker: string
	): Promise<IMaterialExchangeOverview> {
		const overview: IMaterialExchangeOverview = {
			vwap_daily: {} as Required<Record<EXCHANGES_TYPE, number>>,
			vwap_7d: {} as Record<EXCHANGES_TYPE, number>,
			vwap_30d: {} as Record<EXCHANGES_TYPE, number>,
			sum_traded_7d: {} as Record<EXCHANGES_TYPE, number>,
			sum_traded_30d: {} as Record<EXCHANGES_TYPE, number>,
			ask: {} as Record<EXCHANGES_TYPE, number>,
			bid: {} as Record<EXCHANGES_TYPE, number>,
			spread: {} as Record<EXCHANGES_TYPE, number>,
			supply: {} as Record<EXCHANGES_TYPE, number>,
			demand: {} as Record<EXCHANGES_TYPE, number>,
			delta_supply_demand: {} as Record<EXCHANGES_TYPE, number>,
			calendar_date: {} as Record<EXCHANGES_TYPE, Date>,
			exchange_status: {} as Record<
				EXCHANGES_TYPE,
				"ACTIVE" | "INACTIVE" | "STALE"
			>,
			vwap_analysis: {} as Record<
				EXCHANGES_TYPE,
				IMaterialExchangeVWAPAnalysis
			>,
			systemic_health: {
				diffusionIndex: 0,
				liquidityRatio: 0,
				weightedTrend: 0,
				priceCohesion: 0,
			},
		};

		const specificTypes = exchangeTypesArray.filter(
			(t) => t !== "UNIVERSE"
		);
		const hasUniverse = exchangeTypesArray.includes("UNIVERSE");

		try {
			// Fetch specific real exchanges
			await Promise.all(
				specificTypes.map(async (type) => {
					const ticker = await getExchangeTicker(
						`${materialTicker}.${type}`
					);
					overview.vwap_daily[type] = ticker.vwap_daily;
					overview.vwap_7d[type] = ticker.vwap_7d;
					overview.vwap_30d[type] = ticker.vwap_30d;
					overview.sum_traded_7d[type] = ticker.sum_traded_7d;
					overview.sum_traded_30d[type] = ticker.sum_traded_30d;
					overview.calendar_date[type] = ticker.calendar_date;
					overview.exchange_status[type] = ticker.exchange_status;
					overview.ask[type] = ticker.ask;
					overview.bid[type] = ticker.bid;
					overview.spread[type] = ticker.ask - ticker.bid;
					overview.supply[type] = ticker.supply;
					overview.demand[type] = ticker.demand;
					overview.delta_supply_demand[type] =
						ticker.supply - ticker.demand;
					overview.vwap_analysis[type] = calculateVWAPAnalysis(
						ticker.vwap_7d,
						ticker.vwap_30d
					);
				})
			);

			// Handle UNIVERSE data
			if (hasUniverse) {
				const universeTicker = await getExchangeTicker(
					`${materialTicker}.UNIVERSE`
				);
				overview.vwap_daily["UNIVERSE"] = universeTicker.vwap_daily;
				overview.vwap_7d["UNIVERSE"] = universeTicker.vwap_7d;
				overview.vwap_30d["UNIVERSE"] = universeTicker.vwap_30d;
				overview.sum_traded_7d["UNIVERSE"] =
					universeTicker.sum_traded_7d;
				overview.sum_traded_30d["UNIVERSE"] =
					universeTicker.sum_traded_30d;
				overview.calendar_date["UNIVERSE"] =
					universeTicker.calendar_date;
				overview.exchange_status["UNIVERSE"] =
					universeTicker.exchange_status;
				overview.vwap_analysis["UNIVERSE"] = calculateVWAPAnalysis(
					universeTicker.vwap_7d,
					universeTicker.vwap_30d
				);

				let totalLocalSupply = 0;
				let totalLocalDemand = 0;
				specificTypes.forEach((type) => {
					totalLocalSupply += overview.supply[type] || 0;
					totalLocalDemand += overview.demand[type] || 0;
				});

				overview.supply["UNIVERSE"] = totalLocalSupply;
				overview.demand["UNIVERSE"] = totalLocalDemand;
				overview.delta_supply_demand["UNIVERSE"] =
					totalLocalSupply - totalLocalDemand;

				// Insight Calculations
				const totalVol7d = universeTicker.sum_traded_7d;

				/**
				 * Market Breadth (Diffusion Index):
				 * Measures the percentage of individual exchanges currently in an uptrend (7D VWAP > 30D VWAP).
				 * High breadth confirms a trend's strength; low breadth suggests a move might be a "fakeout" driven by a single outlier exchange.
				 */
				const bullishCount = specificTypes.filter(
					(t) => overview.vwap_7d[t] > overview.vwap_30d[t]
				).length;
				overview.systemic_health.diffusionIndex =
					(bullishCount / specificTypes.length) * 100;

				/**
				 * Global Liquidity Ratio (Absorption Capacity):
				 * Represents the balance between total buy-side demand and sell-side supply across all exchanges.
				 * - > 1.0 (Oversold/High Demand): Buyers are "absorbing" more than is available; suggests upward price pressure.
				 * - < 1.0 (Oversupplied): Available supply exceeds demand; suggests a "heavy" market with downward pressure.
				 */
				overview.systemic_health.liquidityRatio =
					totalLocalDemand / totalLocalSupply;

				/**
				 * Volume-Weighted Global Trend (VWGT):
				 * Calculates the "Real" market move by weighting each exchange's price change by its 7D traded volume.
				 */
				overview.systemic_health.weightedTrend = specificTypes.reduce(
					(acc, t) => {
						const trend = overview.vwap_analysis[t].percentChange;
						const weight = overview.sum_traded_7d[t] / totalVol7d;
						return acc + trend * weight;
					},
					0
				);

				/**
				 * Price Cohesion (Coefficient of Variation):
				 * Measures market fragmentation by calculating the statistical dispersion of prices across all exchanges.
				 * - Low % (< 1.5%): High Cohesion. Exchanges are in "lock-step"; the market is efficient and highly liquid.
				 * - High % (> 5.0%): High Fragmentation. Significant price gaps exist between exchanges
				 */
				const vwapList = specificTypes.map((t) => overview.vwap_7d[t]);
				const mean =
					vwapList.reduce((a, b) => a + b, 0) / vwapList.length;
				const stdDev = Math.sqrt(
					vwapList
						.map((v) => Math.pow(v - mean, 2))
						.reduce((a, b) => a + b, 0) / vwapList.length
				);
				overview.systemic_health.priceCohesion = (stdDev / mean) * 100;
			}
		} catch (error) {
			console.error("Error in getMaterialExchangeOverview:", error);
		}

		return overview;
	}

	return {
		preload,
		getExchangeTicker,
		getMaterialExchangeOverview,
		exchangeTypesArray,
		exchangeGameTypesArray,
	};
}
