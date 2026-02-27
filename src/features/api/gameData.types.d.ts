export interface IMaterial {
	material_id: string;
	category_name: string;
	category_id: string;
	name: string;
	ticker: string;
	weight: number;
	volume: number;
}

export interface IExchange {
	ticker: string;
	exchange_code: string;
	calendar_date: Date;
	traded_daily: number;
	vwap_daily: number;
	sum_traded_7d: number;
	avg_traded_7d: number;
	vwap_7d: number;
	sum_traded_30d: number;
	avg_traded_30d: number;
	vwap_30d: number;
	exchange_status: "ACTIVE" | "INACTIVE" | "STALE";

	[key: string]: string | number | Date;
}

export interface IRecipeMaterial {
	material_ticker: string;
	material_amount: number;
}

export interface IRecipe {
	recipe_id: string;
	building_ticker: string;
	recipe_name: string;
	time_ms: number;
	inputs: IRecipeMaterial[];
	outputs: IRecipeMaterial[];
}

export interface IBuildingCost {
	material_ticker: string;
	material_amount: number;
}

export interface IBuildingHabitation {
	pioneers: number;
	settlers: number;
	technicians: number;
	engineers: number;
	scientists: number;
}

export type BUILDING_EXPERTISE_TYPE =
	| "AGRICULTURE"
	| "CHEMISTRY"
	| "CONSTRUCTION"
	| "ELECTRONICS"
	| "FOOD_INDUSTRIES"
	| "FUEL_REFINING"
	| "MANUFACTURING"
	| "METALLURGY"
	| "RESOURCE_EXTRACTION";

type BUILDING_TYPE = "INFRASTRUCTURE" | "PLANETARY" | "PRODUCTION";

export interface IBuilding {
	building_name: string;
	building_ticker: string;
	pioneers: number;
	settlers: number;
	technicians: number;
	engineers: number;
	scientists: number;
	area_cost: number;
	costs: IBuildingCost[];
	habitations: IBuildingHabitation | null;
	expertise: BUILDING_EXPERTISE_TYPE | null;
	building_type: BUILDING_TYPE;

	[key: string]:
		| string
		| number
		| null
		| IBuildingCost[]
		| IBuildingHabitation
		| BUILDING_TYPE;
}

export type PLANET_RESOURCETYPE_TYPE = "MINERAL" | "GASEOUS" | "LIQUID";
type PLANET_DISTANCE_NAMES =
	| "Moria Station"
	| "Antares Station"
	| "Benten Station"
	| "Hortus Station";

export interface IPlanetResource {
	resource_type: PLANET_RESOURCETYPE_TYPE;
	factor: number;
	daily_extraction: number;
	material_ticker: string;
	max_daily_extraction: number;
}

export type PLANET_COGCPROGRAM_TYPE =
	| "Invalid"
	| "ADVERTISING_AGRICULTURE"
	| "ADVERTISING_CHEMISTRY"
	| "ADVERTISING_CONSTRUCTION"
	| "ADVERTISING_ELECTRONICS"
	| "ADVERTISING_FOOD_INDUSTRIES"
	| "ADVERTISING_FUEL_REFINING"
	| "ADVERTISING_MANUFACTURING"
	| "ADVERTISING_METALLURGY"
	| "ADVERTISING_RESOURCE_EXTRACTION"
	| "WORKFORCE_PIONEERS"
	| "WORKFORCE_SETTLERS"
	| "WORKFORCE_TECHNICIANS"
	| "WORKFORCE_ENGINEERS"
	| "WORKFORCE_SCIENTISTS";

export interface IPlanetCOGCProgram {
	program_type: PLANET_COGCPROGRAM_TYPE | null;
	start_epochms: number;
	end_epochms: number;
}

type PLANET_COGCPROGRAM_STATUS_TYPE = "ACTIVE" | "ON_STRIKE" | "PLANNED";

export interface IPlanet {
	planet_id: string;
	planet_natural_id: string;
	planet_name: string;
	system_id: string;
	has_localmarket: boolean;
	has_chamberofcommerce: boolean;
	has_warehouse: boolean;
	has_administrationcenter: boolean;
	has_shipyard: boolean;
	pressure: number;
	surface: boolean;
	temperature: number;
	fertility: number;
	gravity: number;
	faction_code: string | null;
	faction_name: string | null;
	cogc_program_status: PLANET_COGCPROGRAM_STATUS_TYPE | null;

	resources: IPlanetResource[];
	cogc_programs: IPlanetCOGCProgram[];
	active_cogc_program_type: PLANET_COGCPROGRAM_TYPE | null;
}

export interface IFIOStorageItem {
	MaterialTicker: string;
	MaterialAmount: number;
}

export interface IFIOStorageElement {
	WeightCapacity: number;
	VolumeCapacity: number;
	WeightLoad: number;
	VolumeLoad: number;
	Identifier: string;
	StorageItems: IFIOStorageItem[];
}

export interface IFIOSitePlanet {
	PlanetIdentifier: string;
	PlanetName: string;
	InvestedPermits: number;
	MaximumPermits: number;
	Buildings: IFIOSitePlanetBuilding[];
}

export interface IFIOStorage {
	storage_data: {
		planets: Record<string, IFIOStorageElement>;
		warehouses: Record<string, IFIOStorageElement>;
		ships: Record<string, IFIOStorageElement & { Name: string }>;
	};
	sites_data: Record<string, IFIOSitePlanet>;
	last_modified: Date;
}

export interface IFIOSitePlanetBuildingMaterial {
	MaterialTicker: string;
	MaterialAmount: number;
}

export interface IFIOSitePlanetBuilding {
	BuildingTicker: string;
	BuildingLastRepair?: Date;
	Condition: number;
	ReclaimableMaterials: IFIOSitePlanetBuildingMaterial[];
	RepairMaterials: IFIOSitePlanetBuildingMaterial[];
	AgeDays?: number;
}

export interface IPlanetSearchAdvanced {
	materials: string[];
	cogc_programs: PLANET_COGCPROGRAM_TYPE[];
	environment_rocky: boolean;
	environment_gaseous: boolean;
	environment_low_gravity: boolean;
	environment_high_gravity: boolean;
	environment_low_pressure: boolean;
	environment_high_pressure: boolean;
	environment_low_temperature: boolean;
	environment_high_temperature: boolean;
	must_be_fertile: boolean;
	must_have_localmarket: boolean;
	must_have_chamberofcommerce: boolean;
	must_have_warehouse: boolean;
	must_have_administrationcenter: boolean;
	must_have_shipyard: boolean;
}

export interface IPopulationReport {
	explorers_grace_enabled: boolean;
	simulation_period: number;
	next_population_pioneer: number;
	next_population_settler: number;
	next_population_technician: number;
	next_population_engineer: number;
	next_population_scientist: number;
	population_difference_pioneer: number;
	population_difference_settler: number;
	population_difference_technician: number;
	population_difference_engineer: number;
	population_difference_scientist: number;
	unemployment_rate_pioneer: number;
	unemployment_rate_settler: number;
	unemployment_rate_technician: number;
	unemployment_rate_engineer: number;
	unemployment_rate_scientist: number;
	open_jobs_pioneer: number;
	open_jobs_settler: number;
	open_jobs_technician: number;
	open_jobs_engineer: number;
	open_jobs_scientist: number;
	need_fulfillment_life_support: number;
	need_fulfillment_safety: number;
	need_fulfillment_health: number;
	need_fulfillment_comfort: number;
	need_fulfillment_culture: number;
	need_fulfillment_education: number;
	free_pioneer: number;
	free_settler: number;
	free_technician: number;
	free_engineer: number;
	free_scientist: number;
}
