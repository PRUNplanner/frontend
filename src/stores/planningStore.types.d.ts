import type { PlanEmpire } from "@/features/api/schemas/planningData.schemas";

type IPlanRecord = Record<string, IPlan>;
type ISharedRecord = Record<string, ISharedPlan>;

export type PLAN_COGCPROGRAM_TYPE =
	| "---"
	| "AGRICULTURE"
	| "CHEMISTRY"
	| "CONSTRUCTION"
	| "ELECTRONICS"
	| "FOOD_INDUSTRIES"
	| "FUEL_REFINING"
	| "MANUFACTURING"
	| "METALLURGY"
	| "RESOURCE_EXTRACTION"
	| "PIONEERS"
	| "SETTLERS"
	| "TECHNICIANS"
	| "ENGINEERS"
	| "SCIENTISTS";

export interface IPlanDataInfrastructure {
	building:
		| "HB1"
		| "HB2"
		| "HB3"
		| "HB4"
		| "HB5"
		| "HBB"
		| "HBC"
		| "HBM"
		| "HBL"
		| "STO"
		| "STA"
		| "STE"
		| "STV"
		| "STW";
	amount: number;
}

export interface IPlanDataExpert {
	type:
		| "Agriculture"
		| "Chemistry"
		| "Construction"
		| "Electronics"
		| "Food_Industries"
		| "Fuel_Refining"
		| "Manufacturing"
		| "Metallurgy"
		| "Resource_Extraction";
	amount: number;
}

type PLAN_WORKFORCE_TYPE =
	"pioneer" | "settler" | "technician" | "engineer" | "scientist";

export interface IPlanDataWorkforce {
	type: PLAN_WORKFORCE_TYPE;
	lux1: boolean;
	lux2: boolean;
}

export interface IPlanDataBuildingRecipe {
	recipeid: string;
	amount: number;
}

export interface IPlanDataBuilding {
	name: string;
	amount: number;
	active_recipes: IPlanDataBuildingRecipe[];
}

export interface IPlanData {
	experts: IPlanDataExpert[];
	buildings: IPlanDataBuilding[];
	infrastructure: IPlanDataInfrastructure[];
	workforce: IPlanDataWorkforce[];
}

export interface IPlan {
	uuid: string | undefined;
	plan_name: string | undefined;
	planet_natural_id: string;
	plan_permits_used: number;
	plan_corphq: boolean;
	plan_cogc: PLAN_COGCPROGRAM_TYPE;
	plan_data: IPlanData;
	empires?: PlanEmpire[];
}

export interface IPlanShare {
	uuid: string;
	created_at: string;
	view_count: number;
	plan_details: IPlan;
}

export interface ISharedPlan {
	uuid: string;
	plan: string;
	view_count: number;
	created_at: Date;
}
