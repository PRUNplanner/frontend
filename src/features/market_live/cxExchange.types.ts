import type { SSECX } from "@/features/market_live/schemas/cxSSE.schemas";

export interface CXDataPoint extends Pick<
	SSECX,
	| "material_ticker"
	| "exchange_code"
	| "price"
	| "bid"
	| "ask"
	| "demand"
	| "supply"
	| "traded"
> {
	ticker: string;
	last_updated: number;

	price_change?: number;
	price_change_pct?: number;
	bid_change?: number;
	ask_change?: number;

	volume: number;

	buy_volume_total: number;
	sell_volume_total: number;
	buy_volume_change: number;
	sell_volume_change: number;

	buy_vwap?: number;
	sell_vwap?: number;
	lowest_sell_cost?: number;
	highest_buy_cost?: number;

	spread?: number;
	spread_pct?: number;

	[key: string]: string | number | undefined;
}
