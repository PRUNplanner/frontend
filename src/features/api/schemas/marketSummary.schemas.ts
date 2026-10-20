import { z } from "zod";

/** one value per UTC day, oldest first, null without trades */
const DailySeriesSchema = z.array(z.number().nullable());

export const MarketMaterialSchema = z.object({
	ticker: z.string(),
	name: z.string(),
	category: z.string(),
	sector: z.string(),
	turnover_30d: z.number(),
	turnover_7d: z.number(),
	units_7d: z.number(),
	vwap_7d: z.number().nullable(),
	vwap_30d: z.number().nullable(),
	/** VWAP 7D against VWAP 30D, in % */
	change_pct: z.number().nullable(),
	/** the last 15 days of the ALL VWAP 7D */
	spark: DailySeriesSchema,
	is_flat: z.boolean(),
	/** only the exchanges that traded in the last 7 days */
	turnover_7d_by_exchange: z.record(z.string(), z.number()),
});
export type MarketMaterial = z.infer<typeof MarketMaterialSchema>;

/**
 * GET /data/market/summary/: the public market report, all money in ȼ
 * with the four currencies at par
 */
export const MarketSummarySchema = z.object({
	/** epoch ms of the newest complete UTC day */
	as_of: z.number(),
	/** epoch ms of day 0 */
	start: z.number(),
	days: z.number(),
	turnover_daily: z.record(z.string(), DailySeriesSchema),
	index: z.object({
		/** epoch ms of the day the index is 100 */
		base: z.number(),
		combined: DailySeriesSchema,
		per_exchange: z.record(z.string(), DailySeriesSchema),
		per_sector: z.record(z.string(), DailySeriesSchema),
		members: z.record(z.string(), z.number()),
		coverage: z.record(z.string(), z.number()),
	}),
	sectors: z.array(
		z.object({ key: z.string(), categories: z.array(z.string()) })
	),
	materials: z.array(MarketMaterialSchema),
});
export type MarketSummary = z.infer<typeof MarketSummarySchema>;
