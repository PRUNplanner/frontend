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

export interface IPlanDataPlanet {
	planetid: string;
	permits: number;
	corphq: boolean;
	cogc: PLAN_COGCPROGRAM_TYPE;
	experts: IPlanDataExpert[];
	workforce: IPlanDataWorkforce[];
}

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
	planet: IPlanDataPlanet;
	infrastructure: IPlanDataInfrastructure[];
	buildings: IPlanDataBuilding[];
}

export interface IPlanEmpire {
	faction: string;
	permits_used: number;
	permits_total: number;
	uuid: string;
	name: string;
	use_fio_storage: boolean;
}

export interface IPlanEmpireElement extends IPlanEmpire {
	baseplanners: {
		name: string;
		uuid: string;
		planet_id: string;
	}[];
}

export interface IPlan {
	name: string | undefined;
	uuid: string | undefined;
	planet_id: string;
	faction: PLAN_FACTION;
	permits_used: number;
	permits_total: number;
	override_empire: boolean;
	baseplanner_data: IPlanData;
	empires: IPlanEmpire[];
}

export interface IPlanShare {
	uuid: string;
	created_date: string;
	view_count: number;
	baseplanner: IPlan;
}

interface IPlanLoadData {
	planData: IPlan;
	empires: IPlanEmpireElement[];
}

type CX_EXCHANGE_OPTION_TYPE =
	| "AI1_BUY"
	| "AI1_SELL"
	| "AI1_AVG"
	| "IC1_BUY"
	| "IC1_SELL"
	| "IC1_AVG"
	| "CI1_BUY"
	| "CI1_SELL"
	| "CI1_AVG"
	| "CI2_BUY"
	| "CI2_SELL"
	| "CI2_AVG"
	| "NC1_BUY"
	| "NC1_SELL"
	| "NC1_AVG"
	| "NC2_BUY"
	| "NC2_SELL"
	| "NC2_AVG"
	| "PP7D_AI1"
	| "PP7D_IC1"
	| "PP7D_CI1"
	| "PP7D_CI2"
	| "PP7D_NC1"
	| "PP7D_NC2"
	| "PP30D_AI1"
	| "PP30D_IC1"
	| "PP30D_CI1"
	| "PP30D_CI2"
	| "PP30D_NC1"
	| "PP30D_NC2"
	| "PP7D_UNIVERSE"
	| "PP30D_UNIVERSE";

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
	name: string;
	cx_empire: ICXDataExchangeOption[];
	cx_planets: { planet: string; preferences: ICXDataExchangeOption[] }[];
	ticker_empire: ICXDataTickerOption[];
	ticker_planets: { planet: string; preferences: ICXDataTickerOption[] }[];
}

export interface ICX {
	uuid: string;
	name: string;
	empires: IPlanEmpireElement[];
	cx_data: ICXData;
}

export interface ISharedPlan {
	shared_uuid: string;
	plan_uuid: string;
	view_count: number;
}
