export type EXCHANGES_TYPE = "AI1" | "CI1" | "IC1" | "NC1" | "UNIVERSE";

export interface IMaterialExchangeOverview {
	vwap_daily: Required<Record<EXCHANGES_TYPE, number>>;
	vwap_7d: Required<Record<EXCHANGES_TYPE, number>>;
	vwap_30d: Required<Record<EXCHANGES_TYPE, number>>;
	sum_traded_7d: Required<Record<EXCHANGES_TYPE, number>>;
	sum_traded_30d: Required<Record<EXCHANGES_TYPE, number>>;
	calendar_date: Required<Record<EXCHANGES_TYPE, Date>>;
	exchange_status: Required<
		Record<EXCHANGES_TYPE, "ACTIVE" | "INACTIVE" | "STALE">
	>;
}
