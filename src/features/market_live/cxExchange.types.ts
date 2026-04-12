export interface CXDataPoint {
	ticker: string;
	material_ticker: string;
	exchange_code: string;
	last_updated: number;

	price?: number;
	bid?: number;
	ask?: number;

	price_change?: number;
	price_change_pct?: number;
	bid_change?: number;
	ask_change?: number;

	demand: number;
	supply: number;
	traded: number;
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
