import { z } from "zod";

import { PlanEmpireElementSchema } from "@/features/api/schemas/empireData.schemas";

const CXExchangeOptionTypeSchema = z.enum([
	"AI1_7D",
	"NC1_7D",
	"CI1_7D",
	"IC1_7D",
	"UNIVERSE_7D",
	"AI1_30D",
	"NC1_30D",
	"CI1_30D",
	"IC1_30D",
	"UNIVERSE_30D",
	"AI1_ASK",
	"AI1_BID",
	"NC1_ASK",
	"NC1_BID",
	"CI1_ASK",
	"CI1_BID",
	"IC1_ASK",
	"IC1_BID",
]);
export type CXExchangeOptionType = z.infer<typeof CXExchangeOptionTypeSchema>;

const CXPreferenceTypeSchema = z.enum(["BUY", "SELL", "BOTH"]);
export type CXPreferenceType = z.infer<typeof CXPreferenceTypeSchema>;

export const CXDataExchangeOptionSchema = z.object({
	type: CXPreferenceTypeSchema,
	exchange: CXExchangeOptionTypeSchema,
});
export type CXDataExchangeOption = z.infer<typeof CXDataExchangeOptionSchema>;

export const CXDataTickerOptionSchema = z.object({
	type: CXPreferenceTypeSchema,
	ticker: z.string().nonempty(),
	value: z.number(),
});
export type CXDataTickerOption = z.infer<typeof CXDataTickerOptionSchema>;

const CXDataSchema = z.object({
	cx_empire: z.array(CXDataExchangeOptionSchema),
	cx_planets: z.array(
		z.object({
			planet: z.string(),
			preferences: z.array(CXDataExchangeOptionSchema),
		})
	),
	ticker_empire: z.array(CXDataTickerOptionSchema),
	ticker_planets: z.array(
		z.object({
			planet: z.string(),
			preferences: z.array(CXDataTickerOptionSchema),
		})
	),
});
export type CXData = z.infer<typeof CXDataSchema>;

export const CXSchema = z.object({
	uuid: z.uuid(),
	empires: z.array(
		PlanEmpireElementSchema.pick({
			uuid: true,
			empire_name: true,
			plans: true,
		})
	),
	cx_data: CXDataSchema,
	cx_name: z.string().nonempty(),
});
export type CX = z.infer<typeof CXSchema>;

export const CXPutSchema = CXSchema.pick({ cx_data: true, cx_name: true });

export const CXListSchema = z.array(CXSchema);

const CXEmpireJunctionSchema = z.object({
	cx_uuid: z.uuid(),
	empires: z.array(z.object({ empire_uuid: z.uuid() })),
});
export type CXEmpireJunction = z.input<typeof CXEmpireJunctionSchema>;

export const CXEmpireJunctionListSchema = z.array(CXEmpireJunctionSchema);
