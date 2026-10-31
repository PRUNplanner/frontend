import { z } from "zod";

// Util
import { PositiveOrZeroNumber } from "@/util/zodValidators";

/**
 * PLAN
 */

export const PlanCOGCProgramSchema = z.enum([
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
export type PlanCOGCProgram = z.infer<typeof PlanCOGCProgramSchema>;

export const ExpertTypeSchema = z.enum([
	"Agriculture",
	"Chemistry",
	"Construction",
	"Electronics",
	"Food_Industries",
	"Fuel_Refining",
	"Manufacturing",
	"Metallurgy",
	"Resource_Extraction",
]);
export type ExpertType = z.infer<typeof ExpertTypeSchema>;

export const WorkforceTypeSchema = z.enum([
	"pioneer",
	"settler",
	"technician",
	"engineer",
	"scientist",
]);
export type WorkforceType = z.infer<typeof WorkforceTypeSchema>;

export const StorageTypeSchema = z.enum(["STO", "STA", "STE", "STV", "STW"]);
export type StorageType = z.infer<typeof StorageTypeSchema>;

export const HabTypeSchema = z.enum([
	"HB1",
	"HB2",
	"HB3",
	"HB4",
	"HB5",
	"HBB",
	"HBC",
	"HBM",
	"HBL",
]);

export const InfrastructureTypeSchema = z.enum([
	...HabTypeSchema.options,
	...StorageTypeSchema.options,
]);
export type InfrastructureType = z.infer<typeof InfrastructureTypeSchema>;

const PlanDataExpertSchema = z.object({
	type: ExpertTypeSchema,
	amount: PositiveOrZeroNumber,
});
export type PlanDataExpert = z.infer<typeof PlanDataExpertSchema>;

const PlanDataWorkforceSchema = z.object({
	type: WorkforceTypeSchema,
	lux1: z.boolean(),
	lux2: z.boolean(),
});
export type PlanDataWorkforce = z.infer<typeof PlanDataWorkforceSchema>;

const PlanDataInfrastructureSchema = z.object({
	building: InfrastructureTypeSchema,
	amount: PositiveOrZeroNumber,
});
export type PlanDataInfrastructure = z.infer<
	typeof PlanDataInfrastructureSchema
>;

const PlanDataBuildingRecipeSchema = z.object({
	recipeid: z.string(),
	amount: PositiveOrZeroNumber,
});

const PlanDataBuildingSchema = z.object({
	name: z.string().min(2).max(3),
	amount: PositiveOrZeroNumber,
	active_recipes: z.array(PlanDataBuildingRecipeSchema),
});
export type PlanDataBuilding = z.infer<typeof PlanDataBuildingSchema>;

const PlanDataSchema = z.object({
	experts: z.array(PlanDataExpertSchema),
	buildings: z.array(PlanDataBuildingSchema),
	workforce: z.array(PlanDataWorkforceSchema),
	infrastructure: z.array(PlanDataInfrastructureSchema),
});
export type PlanData = z.infer<typeof PlanDataSchema>;

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

export const PlanSchema = z.object({
	uuid: z.uuid(),
	plan_name: z.string(),
	planet_natural_id: z.string(),
	plan_permits_used: z.number().min(0),
	plan_corphq: z.boolean(),
	plan_cogc: PlanCOGCProgramSchema,
	plan_data: PlanDataSchema,
	empires: z.array(PlanEmpireSchema).optional(),
	// save version, the shared payload has none
	modified_at: z.string().optional(),
});
export type Plan = z.infer<typeof PlanSchema>;

export const PlanShareSchema = z.object({
	uuid: z.uuid(),
	created_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
		message: "Invalid date string",
	}),
	view_count: PositiveOrZeroNumber,
	plan_details: PlanSchema,
});
export type PlanShare = z.infer<typeof PlanShareSchema>;

export const PlanListSchema = z.array(PlanSchema);

// Permits aren't bounded on create/save, unlike on a parsed plan.
export const PlanCreateDataSchema = PlanSchema.pick({
	plan_name: true,
	planet_natural_id: true,
	plan_corphq: true,
	plan_cogc: true,
	plan_data: true,
}).extend({
	empire_uuid: z.uuid().optional(),
	plan_permits_used: z.number(),
});
export type PlanCreateData = z.input<typeof PlanCreateDataSchema>;

// base_modified_at: the version the edit started from, a newer stored one
// makes the save fail with 409; absent or null overwrites.
// version_name names the version the save creates, restored_from marks it
// as a restore of that version, draft_updated_at deletes the draft only if
// it is still the one this tab saw (raw string, microseconds matter)
export const PlanSaveDataSchema = PlanCreateDataSchema.extend({
	uuid: z.uuid(),
	base_modified_at: z.string().nullish(),
	version_name: z.string().max(80).optional(),
	restored_from: z.uuid().nullish(),
	draft_updated_at: z.string().nullish(),
});
export type PlanSaveData = z.input<typeof PlanSaveDataSchema>;

export const PlanSaveCreateResponseSchema = PlanSchema.pick({
	uuid: true,
	modified_at: true,
});
export type PlanSaveCreateResponse = z.infer<
	typeof PlanSaveCreateResponseSchema
>;

export const PlanClonePayloadSchema = PlanSchema.pick({ plan_name: true });

/**
 * PLAN VERSIONS AND DRAFT
 */

export const PlanVersionKindSchema = z.enum([
	"save",
	"restore",
	"baseline",
	"admin",
]);

// name "" is an unnamed version, source_version the version a restore
// came from (null once pruned)
export const PlanVersionListItemSchema = z.object({
	uuid: z.uuid(),
	kind: PlanVersionKindSchema,
	name: z.string(),
	created_at: z.string(),
	source_version: z.uuid().nullable(),
	is_active: z.boolean(),
	data_bytes: z.number(),
});
export type PlanVersionListItem = z.infer<typeof PlanVersionListItemSchema>;

export const PlanVersionListSchema = z.array(PlanVersionListItemSchema);

// the stored snapshot, not migrated: older plan_data may lack newer keys
export const PlanVersionSchema = PlanVersionListItemSchema.extend({
	...PlanSchema.pick({
		plan_name: true,
		planet_natural_id: true,
		plan_corphq: true,
		plan_cogc: true,
		plan_data: true,
	}).shape,
	plan_permits_used: z.number(),
});
export type PlanVersion = z.infer<typeof PlanVersionSchema>;

export const PlanVersionRenameSchema = z.object({ name: z.string().max(80) });

// the clone takes no body
export const PlanVersionClonePayloadSchema = z.object({});

export const PlanDraftSchema = PlanVersionSchema.pick({
	plan_name: true,
	planet_natural_id: true,
	plan_permits_used: true,
	plan_corphq: true,
	plan_cogc: true,
	plan_data: true,
}).extend({
	base_modified_at: z.string(),
	updated_at: z.string(),
});
export type PlanDraft = z.infer<typeof PlanDraftSchema>;

export const PlanDraftResponseSchema = z.object({
	draft: PlanDraftSchema.nullable(),
});

// draft_updated_at: the draft this tab saw (null: none), another one
// stored meanwhile answers 409 draft_conflict
export const PlanDraftSaveDataSchema = PlanCreateDataSchema.omit({
	empire_uuid: true,
}).extend({
	base_modified_at: z.string(),
	draft_updated_at: z.string().nullable(),
});
export type PlanDraftSaveData = z.input<typeof PlanDraftSaveDataSchema>;

export const PlanDraftSavedSchema = z.object({ updated_at: z.string() });
