// Zod schemas of the raukk sourcing store's persisted shape. Used to
// validate JSON import payloads before they replace the store state.

import { z } from "zod";

export const RaukkPriceModeSchema = z.enum([
	"BID",
	"ASK",
	"MID",
	"AVG7D",
	"AVG30D",
]);

export const RaukkRepairDaySchema = z.union([
	z.literal(30),
	z.literal(60),
	z.literal(90),
	z.literal(120),
]);

export const RaukkTickerSourceSchema = z.discriminatedUnion("mode", [
	z.object({
		mode: z.literal("market"),
		priceMode: RaukkPriceModeSchema,
	}),
	z.object({
		mode: z.literal("plan"),
		// concrete plan uuid or one of the synthetic aggregates
		sourcePlanUuid: z.string().min(1),
	}),
]);

export const RaukkPlanConfigSchema = z.object({
	repairDay: RaukkRepairDaySchema,
	sources: z.record(z.string(), RaukkTickerSourceSchema),
});

export const RaukkCostBreakdownSchema = z.object({
	workforce: z.number(),
	repair: z.number(),
	inputs: z.number(),
	shipping: z.number(),
});

export const RaukkOutputCostSchema = z.object({
	ticker: z.string(),
	unitsPerDay: z.number(),
	costPerUnit: z.number(),
	breakdown: RaukkCostBreakdownSchema,
});

export const RaukkSnapshotSchema = z.object({
	computedAt: z.string(),
	stale: z.boolean(),
	planName: z.string(),
	planetNaturalId: z.string(),
	outputs: z.record(z.string(), RaukkOutputCostSchema),
	draws: z.record(z.string(), z.record(z.string(), z.number())),
	config: RaukkPlanConfigSchema.optional(),
});

/** Whole store payload as written by exportJSON */
export const RaukkSourcingExportSchema = z.object({
	version: z.number().int().positive().default(1),
	configs: z.record(z.string(), RaukkPlanConfigSchema),
	snapshots: z.record(z.string(), RaukkSnapshotSchema),
});

export type RaukkSourcingExportType = z.infer<typeof RaukkSourcingExportSchema>;

/** Payload version written by the current implementation */
export const RAUKK_SOURCING_EXPORT_VERSION: number = 1;
