export type EXCHANGES_TYPE = "AI1" | "CI1" | "IC1" | "NC1" | "UNIVERSE";

export type SIGNIFICANCE_LEVEL =
	| "STABLE"
	| "SIGNIFICANT"
	| "HIGHLY-SIGNIFICANT";

export interface IMaterialExchangeVWAPAnalysis {
	significance: SIGNIFICANCE_LEVEL;
	percentChange: number;
}

export interface IMaterialExchangeOverview {
	vwap_daily: Required<Record<EXCHANGES_TYPE, number>>;
	vwap_7d: Required<Record<EXCHANGES_TYPE, number>>;
	vwap_30d: Required<Record<EXCHANGES_TYPE, number>>;
	sum_traded_7d: Required<Record<EXCHANGES_TYPE, number>>;
	sum_traded_30d: Required<Record<EXCHANGES_TYPE, number>>;
	ask: Required<Record<EXCHANGES_TYPE, number>>;
	bid: Required<Record<EXCHANGES_TYPE, number>>;
	spread: Required<Record<EXCHANGES_TYPE, number>>;
	supply: Required<Record<EXCHANGES_TYPE, number>>;
	demand: Required<Record<EXCHANGES_TYPE, number>>;
	delta_supply_demand: Required<Record<EXCHANGES_TYPE, number>>;
	calendar_date: Required<Record<EXCHANGES_TYPE, Date>>;
	exchange_status: Required<
		Record<EXCHANGES_TYPE, "ACTIVE" | "INACTIVE" | "STALE">
	>;
	vwap_analysis: Required<
		Record<EXCHANGES_TYPE, IMaterialExchangeVWAPAnalysis>
	>;
	systemic_health: {
		diffusionIndex: number;
		liquidityRatio: number;
		weightedTrend: number;
		priceCohesion: number;
	};
}
