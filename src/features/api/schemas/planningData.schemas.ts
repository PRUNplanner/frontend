import { z } from "zod";

// Types & Interfaces
import {
	ICX,
	ICXData,
	ICXDataExchangeOption,
	ICXDataTickerOption,
	IPlan,
	IPlanData,
	IPlanDataBuilding,
	IPlanDataBuildingRecipe,
	IPlanDataExpert,
	IPlanDataInfrastructure,
	IPlanDataPlanet,
	IPlanDataWorkforce,
	IPlanEmpireElement,
	IPlanShare,
} from "@/stores/planningStore.types";
import {
	IPlanPatchMaterialIOElement,
	IPlanSaveCreateResponse,
} from "@/features/planning_data/usePlan.types";
import {
	IPlanClonePayload,
	IPlanCloneResponse,
} from "@/features/manage/manage.types";

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

const PlanDataPlanetSchema: z.ZodType<IPlanDataPlanet> = z.object({
	planetid: z.string(),
	permits: z.number().min(1),
	corphq: z.boolean(),
	cogc: z.preprocess(
		(val) =>
			typeof val === "string" ? val.toUpperCase().replace(" ", "_") : val,
		PLAN_COGCPROGRAM_TYPE_ENUM
	) as z.ZodType<z.infer<typeof PLAN_COGCPROGRAM_TYPE_ENUM>>,
	experts: z.array(PlanDataExpertSchema),
	workforce: z.array(PlanDataWorkforceSchema),
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
			"STA",
			"STE",
			"STV",
			"STW",
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
	planet: PlanDataPlanetSchema,
	infrastructure: z.array(PlanDataInfrastructureSchema),
	buildings: z.array(PlanDataBuildingSchema),
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
	faction: z.preprocess(
		(val) => (typeof val === "string" ? val.toUpperCase() : val),
		PLAN_FACTION_TYPE_ZOD_ENUM
	) as z.ZodType<z.infer<typeof PLAN_FACTION_TYPE_ZOD_ENUM>>,
	permits_used: z.number().min(0),
	permits_total: z.number().min(0),
	uuid: z.uuid(),
	name: z.string(),
	use_fio_storage: z.boolean(),
});

export const PlanSchema: z.ZodType<IPlan> = z.object({
	name: z.string(),
	uuid: z.uuid(),
	planet_id: z.string(),
	faction: z.preprocess(
		(val) => (typeof val === "string" ? val.toUpperCase() : val),
		PLAN_FACTION_TYPE_ZOD_ENUM
	) as z.ZodType<z.infer<typeof PLAN_FACTION_TYPE_ZOD_ENUM>>,
	permits_used: z.number().min(0),
	permits_total: z.number().min(0),
	override_empire: z.boolean(),
	baseplanner_data: PlanDataSchema,
	empires: z.array(PlanEmpireSchema),
});

export const PlanShareSchema: z.ZodType<IPlanShare> = z.object({
	uuid: z.uuid(),
	created_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
		message: "Invalid date string",
	}),
	view_count: PositiveOrZeroNumber,
	baseplanner: PlanSchema,
});

const PlanEmpireElementSchema: z.ZodType<IPlanEmpireElement> =
	PlanEmpireSchema.extend({
		baseplanners: z.array(
			z.object({
				name: z.string(),
				uuid: z.uuid(),
				planet_id: z.string(),
			})
		),
	});

export const PlanEmpireElementPayload = z.array(PlanEmpireElementSchema);
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
	"AI1_BUY",
	"AI1_SELL",
	"AI1_AVG",
	"IC1_BUY",
	"IC1_SELL",
	"IC1_AVG",
	"CI1_BUY",
	"CI1_SELL",
	"CI1_AVG",
	"CI2_BUY",
	"CI2_SELL",
	"CI2_AVG",
	"NC1_BUY",
	"NC1_SELL",
	"NC1_AVG",
	"NC2_BUY",
	"NC2_SELL",
	"NC2_AVG",
	"PP7D_AI1",
	"PP7D_IC1",
	"PP7D_CI1",
	"PP7D_CI2",
	"PP7D_NC1",
	"PP7D_NC2",
	"PP30D_AI1",
	"PP30D_IC1",
	"PP30D_CI1",
	"PP30D_CI2",
	"PP30D_NC1",
	"PP30D_NC2",
	"PP7D_UNIVERSE",
	"PP30D_UNIVERSE",
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
	name: z.string().nonempty(),
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
	name: z.string().nonempty(),
	empires: PlanEmpireElementPayload,
	cx_data: CXDataSchema,
});

export const CXListPayloadSchema = z.array(CXSchema);

const PLAN_FACTION_TYPE_ENUM = z.enum([
	"NONE",
	"ANTARES",
	"BENTEN",
	"HORTUS",
	"MORIA",
	"OUTSIDEREGION",
]);

export const PlanCreateDataSchema = z.object({
	name: z.string(),
	planet_id: z.string(),
	faction: PLAN_FACTION_TYPE_ENUM,
	override_empire: z.boolean(),
	permits_used: z.number(),
	permits_total: z.number(),
	planet: PlanDataPlanetSchema,
	infrastructure: z.array(PlanDataInfrastructureSchema),
	buildings: z.array(PlanDataBuildingSchema),
	empire_uuid: z.uuid().optional(),
});

const PlanPatchMaterialIOElement: z.ZodType<IPlanPatchMaterialIOElement> =
	z.object({
		uuid: z.uuidv4(),
		planet_id: z.string(),
		material_io: z.array(
			z.object({
				ticker: z.string().min(1).max(3),
				input: z.number(),
				output: z.number(),
			})
		),
	});

export const PlanPatchMaterialIOSchema: z.ZodType<
	IPlanPatchMaterialIOElement[]
> = z.array(PlanPatchMaterialIOElement);

export const PlanPatchMaterialIOResponse = z.boolean();

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
export type CXListPayloadSchemaType = z.infer<typeof CXListPayloadSchema>;
export type CXDataSchemaType = z.infer<typeof CXDataSchema>;

export const PlanClonePayloadSchema: z.ZodType<IPlanClonePayload> = z.object({
	plan_name: z.string(),
});

export const PlanCloneResponseSchema: z.ZodType<IPlanCloneResponse> = z.object({
	message: z.string(),
});

export type PlanClonePayloadType = z.infer<typeof PlanClonePayloadSchema>;
export type PlanCloneResponseType = z.infer<typeof PlanCloneResponseSchema>;

export type PlanPatchMaterialIOType = z.infer<typeof PlanPatchMaterialIOSchema>;
