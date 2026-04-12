import { FieldConfig } from "@/features/market_live/cxDetectors.types";
import { CXDataPoint } from "@/features/market_live/cxExchange.types";

export const FieldConfigs: Partial<Record<keyof CXDataPoint, FieldConfig>> = {
	material_ticker: {
		label: "Ticker",
		type: "string",
		operators: ["matches"],
	},
	exchange_code: {
		label: "Exchange Code",
		type: "string",
		operators: ["matches"],
	},
	price: {
		label: "Price",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	bid: {
		label: "Bid",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	ask: {
		label: "Ask",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	price_change: {
		label: "Price Change",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	price_change_pct: {
		label: "Price Change (Percent)",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	bid_change: {
		label: "Bid Change",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	ask_change: {
		label: "Ask Change",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	demand: {
		label: "Demand",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	supply: {
		label: "Supply",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	traded: {
		label: "Traded",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	volume: {
		label: "Volume",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	buy_volume_total: {
		label: "Buy Volume",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	sell_volume_total: {
		label: "Sell Volume",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	buy_volume_change: {
		label: "Buy Volume Change (Abs.)",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	sell_volume_change: {
		label: "Sell Volume Change (Abs.)",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	buy_vwap: {
		label: "Buy VWAP",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	sell_vwap: {
		label: "Sell VWAP",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	lowest_sell_cost: {
		label: "Lowest Buy Price",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	highest_buy_cost: {
		label: "Lowest Sell Price",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	spread: {
		label: "Spread",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	spread_pct: {
		label: "Spread (Percent)",
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
} as const;

export type SchemaKey = keyof typeof FieldConfigs;
