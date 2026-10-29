import { z } from "zod";

export const BaseROIShipSchema = z.enum([
	"TCB",
	"VSC",
	"SCB",
	"MCB",
	"LCB",
	"WCB",
	"VCB",
	"HCB",
]);
export type BaseROIShip = z.infer<typeof BaseROIShipSchema>;

export const BaseROIColumnSchema = z.enum([
	"expertise",
	"daily_profit",
	"break_even",
	"weekly_return",
	"building_cost",
	"running_cost",
	"cargo",
	"market_capacity",
	"workforce",
	"history",
]);
export type BaseROIColumn = z.infer<typeof BaseROIColumnSchema>;

export const BaseROIPresetSchema = z.enum(["rookie", "standard", "veteran"]);
export type BaseROIPreset = z.infer<typeof BaseROIPresetSchema>;

const dayOption = z.union([
	z.number().int().min(1).max(10),
	z.literal(14),
	z.literal(21),
	z.literal(28),
]);

/**
 * Base ROI settings in localStorage. Every field falls back to its default
 * on its own, so one corrupt value doesn't reset the rest.
 */
export const BaseROISettingsSchema = z.object({
	cogc: z.enum(["matching", "none"]).catch("matching"),
	// "ramp": from 0 experts, else a fixed count
	experts: z
		.union([z.literal("ramp"), z.number().int().min(0).max(5)])
		.catch("ramp"),
	// 0: off
	bufferDays: z.union([z.literal(0), dayOption]).catch(9),
	minMarketCapacity: z.number().min(0).max(1).catch(0.7),
	logistics: z.enum(["ship", "manual", "none"]).catch("ship"),
	ship: BaseROIShipSchema.catch("LCB"),
	visitDays: dayOption.catch(3),
	manualWeight: z.number().min(0).catch(600),
	manualVolume: z.number().min(0).catch(200),
	// 0: off
	targetPermit: z
		.union([z.literal(0), z.number().int().min(2).max(50)])
		.catch(0),
	// hours, 0: off
	roundTripHours: z.number().int().min(0).max(25).catch(0),
	maxJumps: z.number().int().min(0).catch(7),
	showResources: z.boolean().catch(true),
	showRecipes: z.boolean().catch(true),
	showNegative: z.boolean().catch(false),
	// "": all
	expertise: z.string().catch(""),
	building: z.string().catch(""),
	hiddenColumns: z.array(BaseROIColumnSchema).catch([]),
	panelOpen: z.boolean().catch(true),
	chartOpen: z.boolean().catch(false),
});
export type BaseROISettings = z.infer<typeof BaseROISettingsSchema>;
