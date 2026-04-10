import { z } from "zod";

const EXCHANGE_TYPE_ZOD = z.enum(["AI1", "CI1", "CI2", "IC1", "NC1", "NC2"]);

export const SSECXOrderSchema = z.object({
	company_name: z.string().max(200),
	company_code: z.string().min(1).max(10),
	item_count: z.number().int().min(1).nullish(),
	item_cost: z.number().min(0),
});

export const SSECXSchema = z.object({
	material_ticker: z.string().min(1).max(3),
	exchange_code: EXCHANGE_TYPE_ZOD,
	timestamp: z.iso.datetime(),
	demand: z.number().int().min(0),
	supply: z.number().int().min(0),
	traded: z.number().int().min(0),

	// Nested lists
	buy_orders: z.array(SSECXOrderSchema).default([]),
	sell_orders: z.array(SSECXOrderSchema).default([]),

	price: z.number().min(0).optional(),
	ask: z.number().min(0).optional(),
	ask_count: z.number().int().min(0).optional(),
	bid: z.number().min(0).optional(),
	bid_count: z.number().int().min(0).optional(),
	price_average: z.number().min(0).optional(),
	volume: z.number().min(0).optional(),
	mm_buy: z.number().min(0).optional(),
	mm_sell: z.number().min(0).optional(),
});

export type SSECXSchemaType = z.infer<typeof SSECXSchema>;
