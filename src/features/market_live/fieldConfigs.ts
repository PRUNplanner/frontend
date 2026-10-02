import type { FieldConfig } from "@/features/market_live/cxDetectors.types";
import type { CXDataPoint } from "@/features/market_live/cxExchange.types";

export const FieldConfigs: Partial<Record<keyof CXDataPoint, FieldConfig>> = {
	material_ticker: {
		type: "string",
		operators: ["matches"],
	},
	exchange_code: {
		type: "string",
		operators: ["matches"],
	},
	price: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	bid: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	ask: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	price_change: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	price_change_pct: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	bid_change: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	ask_change: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	demand: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	supply: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	traded: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	volume: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	buy_volume_total: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	sell_volume_total: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	buy_volume_change: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	sell_volume_change: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	buy_vwap: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	sell_vwap: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	lowest_sell_cost: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	highest_buy_cost: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	spread: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
	spread_pct: {
		type: "number",
		operators: ["gt", "lt", "eq", "neq"],
	},
} as const;

export type SchemaKey = keyof typeof FieldConfigs;
