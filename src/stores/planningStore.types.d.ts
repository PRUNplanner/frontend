type IPlanRecord = Record<string, IPlan>;
type IEmpireRecord = Record<string, IPlanEmpireElement>;
type ICXRecord = Record<string, ICX>;
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

export type PLAN_FACTION =
	| "NONE"
	| "ANTARES"
	| "BENTEN"
	| "HORTUS"
	| "MORIA"
	| "OUTSIDEREGION";

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
		| "STO";
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
	| "pioneer"
	| "settler"
	| "technician"
	| "engineer"
	| "scientist";

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

export interface IPlanEmpire {
	empire_faction: string;
	empire_permits_used: number;
	empire_permits_total: number;
	uuid: string;
	empire_name: string;
}

export interface IPlanEmpireElement extends IPlanEmpire {
	plans: {
		uuid: string;
		plan_name: string;
		planet_natural_id: string;
	}[];
}

export interface IPlan {
	uuid: string | undefined;
	plan_name: string | undefined;
	planet_natural_id: string;
	plan_permits_used: number;
	plan_corphq: boolean;
	plan_cogc: PLAN_COGCPROGRAM_TYPE;
	plan_data: IPlanData;
	empires?: IPlanEmpire[];
}

export interface IPlanShare {
	uuid: string;
	created_at: string;
	view_count: number;
	plan_details: IPlan;
}

interface IPlanLoadData {
	planData: IPlan;
	empires: IPlanEmpireElement[];
}

type CX_EXCHANGE_OPTION_TYPE =
	| "AI1_7D"
	| "NC1_7D"
	| "CI1_7D"
	| "IC1_7D"
	| "UNIVERSE_7D"
	| "AI1_30D"
	| "NC1_30D"
	| "CI1_30D"
	| "IC1_30D"
	| "UNIVERSE_30D";

type CX_PREFERENCE_TYPE = "BUY" | "SELL" | "BOTH";

export interface ICXDataExchangeOption {
	type: CX_PREFERENCE_TYPE;
	exchange: CX_EXCHANGE_OPTION_TYPE;
}

export interface ICXDataTickerOption {
	type: CX_PREFERENCE_TYPE;
	ticker: string;
	value: number;
}

export interface ICXData {
	cx_empire: ICXDataExchangeOption[];
	cx_planets: { planet: string; preferences: ICXDataExchangeOption[] }[];
	ticker_empire: ICXDataTickerOption[];
	ticker_planets: { planet: string; preferences: ICXDataTickerOption[] }[];
}

export interface IPlanCXEmpireElement {
	uuid: string;
	empire_name: string;
	plans: {
		uuid: string;
		plan_name: string;
		planet_natural_id: string;
	}[];
}

export interface ICX {
	uuid: string;
	cx_name: string;
	empires: IPlanCXEmpireElement[];
	cx_data: ICXData;
}

export interface ICXPut {
	cx_name: string;
	cx_data: ICXData;
}

export interface ISharedPlan {
	uuid: string;
	plan: string;
	view_count: number;
	created_at: Date;
}
