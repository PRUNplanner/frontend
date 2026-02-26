import { z } from "zod";

// Types & Interfaces
import {
	ICX,
	ICXData,
	ICXDataExchangeOption,
	ICXDataTickerOption,
	ICXPut,
	IPlan,
	IPlanCXEmpireElement,
	IPlanData,
	IPlanDataBuilding,
	IPlanDataBuildingRecipe,
	IPlanDataExpert,
	IPlanDataInfrastructure,
	IPlanDataWorkforce,
	IPlanEmpireElement,
	IPlanShare,
} from "@/stores/planningStore.types";
import { IPlanSaveCreateResponse } from "@/features/planning_data/usePlan.types";
import { IPlanClonePayload } from "@/features/manage/manage.types";

// Util
import { PositiveOrZeroNumber } from "@/util/zodValidators";

/**
 * PLAN
 */

const PLAN_COGCPROGRAM_TYPE_ENUM = z.enum([
	"---",
	"AGRICULTURE",
	"CHEMISTRY",
	"CONSTRUCTION",
	"ELECTRONICS",
	"FOOD_INDUSTRIES",
	"FUEL_REFINING",
	"MANUFACTURING",
	"METALLURGY",
	"RESOURCE_EXTRACTION",
	"PIONEERS",
	"SETTLERS",
	"TECHNICIANS",
	"ENGINEERS",
	"SCIENTISTS",
]);

const PlanDataExpertSchema: z.ZodType<IPlanDataExpert> = z.object({
	type: z.enum([
		"Agriculture",
		"Chemistry",
		"Construction",
		"Electronics",
		"Food_Industries",
		"Fuel_Refining",
		"Manufacturing",
		"Metallurgy",
		"Resource_Extraction",
	]),
	amount: PositiveOrZeroNumber,
});

const PlanDataWorkforceSchema: z.ZodType<IPlanDataWorkforce> = z.object({
	type: z.enum(["pioneer", "settler", "technician", "engineer", "scientist"]),
	lux1: z.boolean(),
	lux2: z.boolean(),
});

const PlanDataInfrastructureSchema: z.ZodType<IPlanDataInfrastructure> =
	z.object({
		building: z.enum([
			"HB1",
			"HB2",
			"HB3",
			"HB4",
			"HB5",
			"HBB",
			"HBC",
			"HBM",
			"HBL",
			"STO",
		]),
		amount: PositiveOrZeroNumber,
	});

const PlanDataBuildingRecipeSchema: z.ZodType<IPlanDataBuildingRecipe> =
	z.object({
		recipeid: z.string(),
		amount: PositiveOrZeroNumber,
	});

const PlanDataBuildingSchema: z.ZodType<IPlanDataBuilding> = z.object({
	name: z.string().min(2).max(3),
	amount: PositiveOrZeroNumber,
	active_recipes: z.array(PlanDataBuildingRecipeSchema),
});

const PlanDataSchema: z.ZodType<IPlanData> = z.object({
	experts: z.array(PlanDataExpertSchema),
	buildings: z.array(PlanDataBuildingSchema),
	workforce: z.array(PlanDataWorkforceSchema),
	infrastructure: z.array(PlanDataInfrastructureSchema),
});

export const PLAN_FACTION_TYPE_ZOD_ENUM = z.enum([
	"NONE",
	"ANTARES",
	"BENTEN",
	"HORTUS",
	"MORIA",
	"OUTSIDEREGION",
]);

export const PlanEmpireSchema = z.object({
	empire_faction: z.preprocess(
		(val) => (typeof val === "string" ? val.toUpperCase() : val),
		PLAN_FACTION_TYPE_ZOD_ENUM
	) as z.ZodType<z.infer<typeof PLAN_FACTION_TYPE_ZOD_ENUM>>,
	empire_permits_used: z.number().min(0),
	empire_permits_total: z.number().min(0),
	uuid: z.uuid(),
	empire_name: z.string(),
});

export const PlanSchema: z.ZodType<IPlan> = z.object({
	uuid: z.uuid(),
	plan_name: z.string(),
	planet_natural_id: z.string(),
	plan_permits_used: z.number().min(0),
	plan_corphq: z.boolean(),
	plan_cogc: PLAN_COGCPROGRAM_TYPE_ENUM,
	plan_data: PlanDataSchema,
	empires: z.array(PlanEmpireSchema).optional(),
});

export const PlanShareSchema: z.ZodType<IPlanShare> = z.object({
	uuid: z.uuid(),
	created_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
		message: "Invalid date string",
	}),
	view_count: PositiveOrZeroNumber,
	plan_details: PlanSchema,
});

const PlanEmpireElementSchema: z.ZodType<IPlanEmpireElement> =
	PlanEmpireSchema.extend({
		plans: z.array(
			z.object({
				uuid: z.uuid(),
				plan_name: z.string(),
				planet_natural_id: z.string(),
			})
		),
	});

const PlanCXEmpireElementSchema: z.ZodType<IPlanCXEmpireElement> = z.object({
	uuid: z.uuid(),
	empire_name: z.string(),
	plans: z.array(
		z.object({
			uuid: z.uuid(),
			plan_name: z.string(),
			planet_natural_id: z.string(),
		})
	),
});

export const PlanEmpireElementPayload = z.array(PlanEmpireElementSchema);
const PlanCXEmpireElementPayload = z.array(PlanCXEmpireElementSchema);
export const PlanEmpirePlanListPayload = z.array(PlanSchema);
export const PlanListPayload = z.array(PlanSchema);

export type PlanEmpireSchemaType = z.infer<typeof PlanEmpireSchema>;
export type PlanEmpirePlanListType = z.infer<typeof PlanEmpirePlanListPayload>;
export type PlanSchemaType = z.infer<typeof PlanSchema>;
export type PlanShareSchemaType = z.infer<typeof PlanShareSchema>;
export type PlanEmpireElementPayloadType = z.infer<
	typeof PlanEmpireElementPayload
>;

/**
 * CX
 */

const CX_EXCHANGE_OPTION_TYPE_ENUM = z.enum([
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
]);

const CX_PREFERENCE_TYPE_ENUM = z.enum(["BUY", "SELL", "BOTH"]);

const CXDataExchangeOptionSchema: z.ZodType<ICXDataExchangeOption> = z.object({
	type: CX_PREFERENCE_TYPE_ENUM,
	exchange: CX_EXCHANGE_OPTION_TYPE_ENUM,
});

const CXDataTickerOptionSchema: z.ZodType<ICXDataTickerOption> = z.object({
	type: CX_PREFERENCE_TYPE_ENUM,
	ticker: z.string().nonempty(),
	value: z.number(),
});

export const CXDataSchema: z.ZodType<ICXData> = z.object({
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

export const CXSchema: z.ZodType<ICX> = z.object({
	uuid: z.uuid(),
	empires: PlanCXEmpireElementPayload,
	cx_data: CXDataSchema,
	cx_name: z.string().nonempty(),
});

export const CXPutSchema: z.ZodType<ICXPut> = z.object({
	cx_data: CXDataSchema,
	cx_name: z.string().nonempty(),
});

export const CXListPayloadSchema = z.array(CXSchema);

export const PlanCreateDataSchema = z.object({
	empire_uuid: z.uuid().optional(),

	plan_name: z.string(),
	planet_natural_id: z.string(),
	plan_permits_used: z.number(),
	plan_corphq: z.boolean(),
	plan_cogc: PLAN_COGCPROGRAM_TYPE_ENUM,
	plan_data: PlanDataSchema,
});

export const PlanSaveDataSchema = PlanCreateDataSchema.extend({
	uuid: z.uuid(),
});

export const PlanSaveCreateResponseSchema: z.ZodType<IPlanSaveCreateResponse> =
	z.object({
		uuid: z.uuid(),
	});

export type PlanCreateDataType = z.infer<typeof PlanCreateDataSchema>;
export type PlanSaveDataType = z.infer<typeof PlanSaveDataSchema>;
export type PlanSaveCreateResponseType = z.infer<
	typeof PlanSaveCreateResponseSchema
>;

export type CXSchemaType = z.infer<typeof CXSchema>;
export type CXPutType = z.infer<typeof CXPutSchema>;
export type CXListPayloadSchemaType = z.infer<typeof CXListPayloadSchema>;

export const PlanClonePayloadSchema: z.ZodType<IPlanClonePayload> = z.object({
	plan_name: z.string(),
});

export type PlanClonePayloadType = z.infer<typeof PlanClonePayloadSchema>;
