import { z } from "zod";
import { PositiveOrZeroNumber } from "@/util/zodValidators";
import {
	IMaterial,
	IExchange,
	IRecipeMaterial,
	IRecipe,
	IBuildingCost,
	IBuildingHabitation,
	IBuilding,
	IPlanetResource,
	IPlanetCOGCProgram,
	IPlanet,
	IFIOStorageItem,
	IFIOSitePlanetBuildingMaterial,
	IFIOSitePlanetBuilding,
	IFIOSitePlanet,
	IPlanetSearchAdvanced,
	IPopulationReport,
} from "@/features/api/gameData.types";

// Schemas
export const MaterialSchema: z.ZodType<IMaterial> = z.object({
	material_id: z.string(),
	category_name: z.string(),
	category_id: z.string(),
	name: z.string(),
	ticker: z.string().min(1).max(3),
	weight: z.number(),
	volume: z.number(),
});

export const MaterialPayloadSchema: z.ZodType<IMaterial[]> =
	z.array(MaterialSchema);

export const ExchangeSchema: z.ZodType<IExchange> = z.object({
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
	exchange_status: z.literal(["STALE", "ACTIVE", "INACTIVE"]),
});

export const ExchangePayloadSchema: z.ZodType<IExchange[]> =
	z.array(ExchangeSchema);

const RecipeMaterialSchema: z.ZodType<IRecipeMaterial> = z.object({
	material_ticker: z.string().min(1).max(3),
	material_amount: PositiveOrZeroNumber,
});

export const RecipeSchema: z.ZodType<IRecipe> = z.object({
	recipe_id: z.string(),
	building_ticker: z.string().min(2).max(3),
	recipe_name: z.string(),
	time_ms: z.number(),
	inputs: z.array(RecipeMaterialSchema),
	outputs: z.array(RecipeMaterialSchema),
});

export const RecipePayloadSchema: z.ZodType<IRecipe[]> = z.array(RecipeSchema);

const BuildingCostSchema: z.ZodType<IBuildingCost> = z.object({
	material_ticker: z.string().min(1).max(3),
	material_amount: PositiveOrZeroNumber,
});

const BuildingHabitationSchema: z.ZodType<IBuildingHabitation> = z.object({
	pioneers: PositiveOrZeroNumber,
	settlers: PositiveOrZeroNumber,
	technicians: PositiveOrZeroNumber,
	engineers: PositiveOrZeroNumber,
	scientists: PositiveOrZeroNumber,
});

const BUILDING_TYPE_ZOD = z.enum(["INFRASTRUCTURE", "PLANETARY", "PRODUCTION"]);
const EXPERTISE_TYPE_ZOD = z.enum([
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

export const BuildingSchema: z.ZodType<IBuilding> = z.object({
	building_name: z.string(),
	building_ticker: z.string().min(2).max(3),
	expertise: EXPERTISE_TYPE_ZOD.nullable(),
	pioneers: PositiveOrZeroNumber,
	settlers: PositiveOrZeroNumber,
	technicians: PositiveOrZeroNumber,
	engineers: PositiveOrZeroNumber,
	scientists: PositiveOrZeroNumber,
	area_cost: PositiveOrZeroNumber,
	costs: z.array(BuildingCostSchema),
	habitations: BuildingHabitationSchema.nullable(),
	building_type: BUILDING_TYPE_ZOD,
});

export const BuildingPayloadSchema: z.ZodType<IBuilding[]> =
	z.array(BuildingSchema);

const PLANET_RESOURCETYPE_TYPE_ZOD = z.enum(["MINERAL", "GASEOUS", "LIQUID"]);

const PlanetResourceSchema: z.ZodType<IPlanetResource> = z.object({
	resource_type: PLANET_RESOURCETYPE_TYPE_ZOD,
	factor: z.number(),
	daily_extraction: z.number(),
	material_ticker: z.string().min(1).max(3),
	max_daily_extraction: z.number(),
});

const PLANET_COGCPROGRAM_TYPE_ZOD = z.enum([
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

const PlanetCOGCProgramSchema: z.ZodType<IPlanetCOGCProgram> = z.object({
	program_type: PLANET_COGCPROGRAM_TYPE_ZOD.nullable(),
	start_epochms: z.number(),
	end_epochms: z.number(),
});

const PLANET_COGCPGROGRAM_STATUS_TYPE_ZOD = z.enum([
	"ACTIVE",
	"ON_STRIKE",
	"PLANNED",
]);

export const PlanetSchema: z.ZodType<IPlanet> = z.object({
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
	cogc_program_status: PLANET_COGCPGROGRAM_STATUS_TYPE_ZOD.nullable(),

	resources: z.array(PlanetResourceSchema),
	cogc_programs: z.array(PlanetCOGCProgramSchema),
	active_cogc_program_type: PLANET_COGCPROGRAM_TYPE_ZOD.nullable(),
});

export const PlanetMultiplePayload: z.ZodType<IPlanet[]> =
	z.array(PlanetSchema);

export const PlanetMultipleRequestPayload: z.ZodType<string[]> = z.array(
	z.string()
);

const FIOStorageItemSchema: z.ZodType<IFIOStorageItem> = z.object({
	MaterialTicker: z.string(),
	MaterialAmount: z.number(),
});

const FIOStorageBaseSchema = z.object({
	WeightCapacity: z.number(),
	VolumeCapacity: z.number(),
	StorageItems: z.array(FIOStorageItemSchema),
	WeightLoad: z.number(),
	VolumeLoad: z.number(),
	Identifier: z.string(),
});

const FIOStoragePlanetSchema = FIOStorageBaseSchema.extend({});

const FIOStorageWarehouseSchema = FIOStorageBaseSchema.extend({});

const FIOStorageShipSchema = FIOStorageBaseSchema.extend({
	Name: z.string(),
});

const FIOSitePlanetBuildingMaterialSchema: z.ZodType<IFIOSitePlanetBuildingMaterial> =
	z.object({
		MaterialTicker: z.string(),
		MaterialAmount: PositiveOrZeroNumber,
	});

const FIOSitePlanetBuildingSchema: z.ZodType<IFIOSitePlanetBuilding> = z.object(
	{
		BuildingTicker: z.string(),
		BuildingLastRepair: z.coerce.date().optional(),
		Condition: z.number(),
		ReclaimableMaterials: z.array(FIOSitePlanetBuildingMaterialSchema),
		RepairMaterials: z.array(FIOSitePlanetBuildingMaterialSchema),
		AgeDays: z.number().optional(),
	}
);

const FIOSitePlanetSchema: z.ZodType<IFIOSitePlanet> = z.object({
	PlanetIdentifier: z.string(),
	PlanetName: z.string(),
	InvestedPermits: z.number(),
	MaximumPermits: z.number(),
	Buildings: z.array(FIOSitePlanetBuildingSchema),
});

export const FIOStorageSchema = z.object({
	storage_data: z.object({
		planets: z.record(z.string(), FIOStoragePlanetSchema),
		warehouses: z.record(z.string(), FIOStorageWarehouseSchema),
		ships: z.record(z.string(), FIOStorageShipSchema),
	}),
	sites_data: z.record(z.string(), FIOSitePlanetSchema),
	last_modified: z.coerce.date(),
});

export const PlanetSearchAdvancedPayloadSchema: z.ZodType<IPlanetSearchAdvanced> =
	z.object({
		materials: z.array(z.string().min(1).max(3)),
		cogc_programs: z.array(PLANET_COGCPROGRAM_TYPE_ZOD),
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

export const PopulationReportPayloadSchema: z.ZodType<IPopulationReport> =
	z.object({
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

// Schema Types
export type MaterialPayloadType = z.infer<typeof MaterialPayloadSchema>;
export type BuildingPayloadType = z.infer<typeof BuildingPayloadSchema>;
export type ExchangePayloadType = z.infer<typeof ExchangePayloadSchema>;
export type RecipePayloadType = z.infer<typeof RecipePayloadSchema>;
export type PlanetPayloadType = z.infer<typeof PlanetSchema>;
export type PlanetMultiplePayloadType = z.infer<typeof PlanetMultiplePayload>;
export type PlanetMultipleRequestType = z.infer<
	typeof PlanetMultipleRequestPayload
>;
export type FIOStoragePayloadType = z.infer<typeof FIOStorageSchema>;
export type PlanetSearchAdvancedPayloadType = z.infer<
	typeof PlanetSearchAdvancedPayloadSchema
>;
export type PopulationReportPayloadType = z.infer<
	typeof PopulationReportPayloadSchema
>;
