import { z } from "zod";
import { PositiveOrZeroNumber } from "@/util/zodValidators";

/**
 * MATERIALS
 */

export const MaterialSchema = z.object({
	material_id: z.string(),
	category_name: z.string(),
	category_id: z.string(),
	name: z.string(),
	ticker: z.string().min(1).max(3),
	weight: z.number(),
	volume: z.number(),
});
export type Material = z.infer<typeof MaterialSchema>;

export const MaterialPayloadSchema = z.array(MaterialSchema);

/**
 * EXCHANGES
 */

export const ExchangeSchema = z.object({
	ticker_id: z.string().min(5).max(12),
	ticker: z.string().min(1).max(3),
	exchange_code: z.string(),
	calendar_date: z.coerce.date(),
	traded_daily: z.number(),
	vwap_daily: z.number(),
	sum_traded_7d: z.number(),
	avg_traded_7d: z.number(),
	vwap_7d: z.number(),
	sum_traded_30d: z.number(),
	avg_traded_30d: z.number(),
	vwap_30d: z.number(),
	ask: z.number(),
	bid: z.number(),
	supply: z.number(),
	demand: z.number(),
	exchange_status: z.literal(["STALE", "ACTIVE", "INACTIVE"]),
});
export type Exchange = z.infer<typeof ExchangeSchema>;

export const ExchangePayloadSchema = z.array(ExchangeSchema);

/**
 * RECIPES
 */

const RecipeMaterialSchema = z.object({
	material_ticker: z.string().min(1).max(3),
	material_amount: PositiveOrZeroNumber,
});
export type RecipeMaterial = z.infer<typeof RecipeMaterialSchema>;

export const RecipeSchema = z.object({
	recipe_id: z.string(),
	building_ticker: z.string().min(2).max(3),
	recipe_name: z.string(),
	time_ms: z.number(),
	inputs: z.array(RecipeMaterialSchema),
	outputs: z.array(RecipeMaterialSchema),
});
export type Recipe = z.infer<typeof RecipeSchema>;

export const RecipePayloadSchema = z.array(RecipeSchema);

/**
 * BUILDINGS
 */

const BuildingCostSchema = z.object({
	material_ticker: z.string().min(1).max(3),
	material_amount: PositiveOrZeroNumber,
});

const BuildingHabitationSchema = z.object({
	pioneers: PositiveOrZeroNumber,
	settlers: PositiveOrZeroNumber,
	technicians: PositiveOrZeroNumber,
	engineers: PositiveOrZeroNumber,
	scientists: PositiveOrZeroNumber,
});

const BuildingTypeSchema = z.enum([
	"INFRASTRUCTURE",
	"PLANETARY",
	"PRODUCTION",
]);

const BuildingExpertiseSchema = z.enum([
	"AGRICULTURE",
	"CHEMISTRY",
	"CONSTRUCTION",
	"ELECTRONICS",
	"FOOD_INDUSTRIES",
	"FUEL_REFINING",
	"MANUFACTURING",
	"METALLURGY",
	"RESOURCE_EXTRACTION",
]);
export type BuildingExpertise = z.infer<typeof BuildingExpertiseSchema>;

export const BuildingSchema = z.object({
	building_name: z.string(),
	building_ticker: z.string().min(2).max(3),
	expertise: BuildingExpertiseSchema.nullable(),
	pioneers: PositiveOrZeroNumber,
	settlers: PositiveOrZeroNumber,
	technicians: PositiveOrZeroNumber,
	engineers: PositiveOrZeroNumber,
	scientists: PositiveOrZeroNumber,
	area_cost: PositiveOrZeroNumber,
	costs: z.array(BuildingCostSchema),
	habitations: BuildingHabitationSchema.nullable(),
	building_type: BuildingTypeSchema,
});
export type Building = z.infer<typeof BuildingSchema>;

export const BuildingPayloadSchema = z.array(BuildingSchema);

/**
 * PLANETS
 */

const PlanetResourceTypeSchema = z.enum(["MINERAL", "GASEOUS", "LIQUID"]);
export type PlanetResourceType = z.infer<typeof PlanetResourceTypeSchema>;

const PlanetResourceSchema = z.object({
	resource_type: PlanetResourceTypeSchema,
	factor: z.number(),
	daily_extraction: z.number(),
	material_ticker: z.string().min(1).max(3),
	max_daily_extraction: z.number(),
});
export type PlanetResource = z.infer<typeof PlanetResourceSchema>;

// Not PlanCOGCProgramSchema (planningData.schemas.ts): the game's program
// names differ from the plan's COGC options.
const PlanetCOGCProgramTypeSchema = z.enum([
	"Invalid",
	"ADVERTISING_AGRICULTURE",
	"ADVERTISING_CHEMISTRY",
	"ADVERTISING_CONSTRUCTION",
	"ADVERTISING_ELECTRONICS",
	"ADVERTISING_FOOD_INDUSTRIES",
	"ADVERTISING_FUEL_REFINING",
	"ADVERTISING_MANUFACTURING",
	"ADVERTISING_METALLURGY",
	"ADVERTISING_RESOURCE_EXTRACTION",
	"WORKFORCE_PIONEERS",
	"WORKFORCE_SETTLERS",
	"WORKFORCE_TECHNICIANS",
	"WORKFORCE_ENGINEERS",
	"WORKFORCE_SCIENTISTS",
]);
export type PlanetCOGCProgramType = z.infer<typeof PlanetCOGCProgramTypeSchema>;

const PlanetCOGCProgramSchema = z.object({
	program_type: PlanetCOGCProgramTypeSchema.nullable(),
	start_epochms: z.number(),
	end_epochms: z.number(),
});

const PlanetCOGCProgramStatusSchema = z.enum([
	"ACTIVE",
	"ON_STRIKE",
	"PLANNED",
]);

export const PlanetSchema = z.object({
	planet_id: z.string().min(32).max(32),
	planet_natural_id: z.string(),
	planet_name: z.string(),
	system_id: z.string().min(32).max(32),
	has_localmarket: z.boolean(),
	has_chamberofcommerce: z.boolean(),
	has_warehouse: z.boolean(),
	has_administrationcenter: z.boolean(),
	has_shipyard: z.boolean(),
	pressure: z.number(),
	surface: z.boolean(),
	temperature: z.number(),
	fertility: z.number(),
	gravity: z.number(),
	faction_code: z.string().nullable(),
	faction_name: z.string().nullable(),
	cogc_program_status: PlanetCOGCProgramStatusSchema.nullable(),

	resources: z.array(PlanetResourceSchema),
	cogc_programs: z.array(PlanetCOGCProgramSchema),
	active_cogc_program_type: PlanetCOGCProgramTypeSchema.nullable(),
});
export type Planet = z.infer<typeof PlanetSchema>;

export const PlanetMultiplePayloadSchema = z.array(PlanetSchema);

export const PlanetMultipleRequestPayloadSchema = z.array(z.string());

export const PlanetSearchAdvancedPayloadSchema = z.object({
	materials: z.array(z.string().min(1).max(3)),
	cogc_programs: z.array(PlanetCOGCProgramTypeSchema),
	environment_rocky: z.boolean(),
	environment_gaseous: z.boolean(),
	environment_low_gravity: z.boolean(),
	environment_high_gravity: z.boolean(),
	environment_low_pressure: z.boolean(),
	environment_high_pressure: z.boolean(),
	environment_low_temperature: z.boolean(),
	environment_high_temperature: z.boolean(),
	must_be_fertile: z.boolean(),
	must_have_localmarket: z.boolean(),
	must_have_chamberofcommerce: z.boolean(),
	must_have_warehouse: z.boolean(),
	must_have_administrationcenter: z.boolean(),
	must_have_shipyard: z.boolean(),
});
export type PlanetSearchAdvancedPayload = z.input<
	typeof PlanetSearchAdvancedPayloadSchema
>;

export const PopulationReportSchema = z.object({
	explorers_grace_enabled: z.boolean(),
	simulation_period: z.number().int(),
	next_population_pioneer: z.number().int(),
	next_population_settler: z.number().int(),
	next_population_technician: z.number().int(),
	next_population_engineer: z.number().int(),
	next_population_scientist: z.number().int(),
	population_difference_pioneer: z.number().int(),
	population_difference_settler: z.number().int(),
	population_difference_technician: z.number().int(),
	population_difference_engineer: z.number().int(),
	population_difference_scientist: z.number().int(),
	unemployment_rate_pioneer: z.number(),
	unemployment_rate_settler: z.number(),
	unemployment_rate_technician: z.number(),
	unemployment_rate_engineer: z.number(),
	unemployment_rate_scientist: z.number(),
	open_jobs_pioneer: z.number(),
	open_jobs_settler: z.number(),
	open_jobs_technician: z.number(),
	open_jobs_engineer: z.number(),
	open_jobs_scientist: z.number(),
	need_fulfillment_life_support: z.number(),
	need_fulfillment_safety: z.number(),
	need_fulfillment_health: z.number(),
	need_fulfillment_comfort: z.number(),
	need_fulfillment_culture: z.number(),
	need_fulfillment_education: z.number(),
	free_pioneer: z.number().int(),
	free_settler: z.number().int(),
	free_technician: z.number().int(),
	free_engineer: z.number().int(),
	free_scientist: z.number().int(),
});
export type PopulationReport = z.infer<typeof PopulationReportSchema>;

/**
 * FIO STORAGE & SITES
 */

const FIOStorageItemSchema = z.object({
	MaterialTicker: z.string(),
	MaterialAmount: z.number(),
});
export type FIOStorageItem = z.infer<typeof FIOStorageItemSchema>;

const FIOStorageElementSchema = z.object({
	WeightCapacity: z.number(),
	VolumeCapacity: z.number(),
	StorageItems: z.array(FIOStorageItemSchema),
	WeightLoad: z.number(),
	VolumeLoad: z.number(),
	Identifier: z.string(),
});
export type FIOStorageElement = z.infer<typeof FIOStorageElementSchema>;

const FIOStorageShipSchema = FIOStorageElementSchema.extend({
	Name: z.string().optional(),
});

const FIOSitePlanetBuildingMaterialSchema = z.object({
	MaterialTicker: z.string(),
	MaterialAmount: PositiveOrZeroNumber,
});

const FIOSitePlanetBuildingSchema = z.object({
	BuildingTicker: z.string(),
	BuildingLastRepair: z.coerce.date().optional(),
	Condition: z.number(),
	ReclaimableMaterials: z
		.array(FIOSitePlanetBuildingMaterialSchema)
		.default([]),
	RepairMaterials: z.array(FIOSitePlanetBuildingMaterialSchema).default([]),
	AgeDays: z.number().optional(),
});

const FIOSitePlanetSchema = z.object({
	PlanetIdentifier: z.string(),
	PlanetName: z.string().optional(),
	InvestedPermits: z.number(),
	MaximumPermits: z.number(),
	Buildings: z.array(FIOSitePlanetBuildingSchema),
});
export type FIOSitePlanet = z.infer<typeof FIOSitePlanetSchema>;

export const FIOStorageSchema = z.object({
	storage_data: z.object({
		planets: z.record(z.string(), FIOStorageElementSchema),
		warehouses: z.record(z.string(), FIOStorageElementSchema),
		ships: z.record(z.string(), FIOStorageShipSchema),
	}),
	sites_data: z.record(z.string(), FIOSitePlanetSchema),
	last_modified: z.coerce.date(),
});
export type FIOStorage = z.infer<typeof FIOStorageSchema>;
