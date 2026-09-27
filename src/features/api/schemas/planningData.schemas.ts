import { z } from "zod";

// Types & Interfaces
import {
	IPlan,
	IPlanData,
	IPlanDataBuilding,
	IPlanDataBuildingRecipe,
	IPlanDataExpert,
	IPlanDataInfrastructure,
	IPlanDataWorkforce,
	IPlanShare,
} from "@/stores/planningStore.types";
import { IPlanSaveCreateResponse } from "@/features/planning_data/usePlan.types";
import { IPlanClonePayload } from "@/features/manage/manage.types";

// Util
import { PositiveOrZeroNumber } from "@/util/zodValidators";

/**
 * PLAN
 */

export const PLAN_COGCPROGRAM_TYPE_ENUM = z.enum([
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
	experts: z.array(PlanDataExpertSchema),
	buildings: z.array(PlanDataBuildingSchema),
	workforce: z.array(PlanDataWorkforceSchema),
	infrastructure: z.array(PlanDataInfrastructureSchema),
});

export const PlanFactionSchema = z.enum([
	"NONE",
	"ANTARES",
	"BENTEN",
	"HORTUS",
	"MORIA",
	"OUTSIDEREGION",
]);
export type PlanFaction = z.infer<typeof PlanFactionSchema>;

/**
 * Faction enum that upper-cases its input first. `val` is typed `string` so
 * `z.input` is `string` rather than `unknown`; non-strings still pass through
 * to the enum and fail there.
 */
export const PlanEmpireFactionSchema = z.preprocess(
	(val: string) => (typeof val === "string" ? val.toUpperCase() : val),
	PlanFactionSchema
);

// Embedded in PlanSchema and returned by the empire endpoints. It lives here
// rather than in empireData.schemas.ts because the empire schemas depend on
// the plan schemas; the reverse import would be a cycle.
export const PlanEmpireSchema = z.object({
	empire_faction: PlanEmpireFactionSchema,
	empire_permits_used: z.number().min(0),
	empire_permits_total: z.number().min(0),
	uuid: z.uuid(),
	empire_name: z.string(),
});
export type PlanEmpire = z.infer<typeof PlanEmpireSchema>;

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

export const PlanListPayload = z.array(PlanSchema);

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

export type PlanSaveCreateResponseType = z.infer<
	typeof PlanSaveCreateResponseSchema
>;

export const PlanClonePayloadSchema: z.ZodType<IPlanClonePayload> = z.object({
	plan_name: z.string(),
});
