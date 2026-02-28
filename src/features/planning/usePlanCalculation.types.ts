import { BUILDING_EXPERTISE_TYPE, IBuilding, IRecipe } from "@/features/api/gameData.types";
import { IBuildingEfficiency } from "@/features/planning/calculations/bonusCalculations.types";
import { PLAN_COGCPROGRAM_TYPE } from "@/stores/planningStore.types";
import { IInfrastructureCosts } from "../cx/usePrice.types";

export type WORKFORCE_TYPE =
	| "pioneer"
	| "settler"
	| "technician"
	| "engineer"
	| "scientist";

export type STORAGE_TYPE =
	| "STO"
	| "STA"
	| "STE"
	| "STV"
	| "STW";

export type INFRASTRUCTURE_TYPE =
	| "HB1"
	| "HB2"
	| "HB3"
	| "HB4"
	| "HB5"
	| "HBB"
	| "HBC"
	| "HBM"
	| "HBL"
	| STORAGE_TYPE;

export type EXPERT_TYPE =
	| "Agriculture"
	| "Chemistry"
	| "Construction"
	| "Electronics"
	| "Food_Industries"
	| "Fuel_Refining"
	| "Manufacturing"
	| "Metallurgy"
	| "Resource_Extraction";

export interface IWorkforceElement {
	name: WORKFORCE_TYPE;
	required: number;
	capacity: number;
	left: number;
	lux1: boolean;
	lux2: boolean;
	efficiency: number;
}

export interface IAreaResult {
	permits: number;
	areaUsed: number;
	areaTotal: number;
	areaLeft: number;
}

export interface IExpertElement {
	name: EXPERT_TYPE;
	amount: number;
	bonus: number;
}

export type IWorkforceRecord = Required<
	Record<WORKFORCE_TYPE, IWorkforceElement>
>;

export type IInfrastructureRecord = Required<
	Record<INFRASTRUCTURE_TYPE, number>
>;

export type IStorageRecord = Required<Record<STORAGE_TYPE, number>>;

export type IExpertRecord = Required<Record<EXPERT_TYPE, IExpertElement>>;

export interface IRecipeBuildingOption extends IRecipe {
	dailyRevenue: number;
	roi: number;
	profitPerArea: number;
}

export interface ICOGMMaterialCost {
	ticker: string;
	amount: number;
	costUnit: number;
	costTotal: number;
}

export interface ICOGMMaterialReturn {
	ticker: string;
	amount: number;
	costSplit: number;
	costTotal: number;
}

export interface IProductionBuildingRecipeCOGM {
	visible: boolean;
	runtime: number;
	runtimeShare: number;
	efficiency: number;
	degradation: number;
	degradationShare: number;
	workforceCost: number;
	workforceCostTotal: number;
	inputCost: ICOGMMaterialCost[];
	inputTotal: number;
	outputCOGM: ICOGMMaterialReturn[];
	totalCost: number;
	outputRevenue: number;
	totalProfit: number;
}

export interface IProductionBuildingRecipe {
	recipeId: string;
	amount: number;
	recipe: IRecipeBuildingOption;
	dailyShare: number;
	time: number;
	cogm: IProductionBuildingRecipeCOGM | undefined;
}

export interface IProductionBuilding {
	name: string;
	amount: number;
	areaUsed: number;
	activeRecipes: IProductionBuildingRecipe[];
	recipeOptions: IRecipeBuildingOption[];
	totalEfficiency: number;
	efficiencyElements: IBuildingEfficiency[];
	totalBatchTime: number;
	constructionMaterials: IMaterialIOMinimal[];
	constructionCost: number;
	workforceMaterials: IMaterialIOMinimal[];
	workforceDailyCost: number;
	dailyRevenue: number;
	expertise: BUILDING_EXPERTISE_TYPE | null;
}

export interface IProductionResult {
	buildings: IProductionBuilding[];
	materialio: IMaterialIOMinimal[];
}
export interface IMaterialIOMinimal {
	ticker: string;
	input: number;
	output: number;
}

export interface IMaterialIOMaterial extends IMaterialIOMinimal {
	delta: number;
	individualWeight: number;
	individualVolume: number;
	totalWeight: number;
	totalVolume: number;
}

export interface IMaterialIO extends IMaterialIOMaterial {
	price: number;
}

export interface IPlanResult {
	done: boolean;
	corphq: boolean;
	cogc: PLAN_COGCPROGRAM_TYPE;
	workforce: IWorkforceRecord;
	area: IAreaResult;
	infrastructure: IInfrastructureRecord;
	storage: IStorageRecord;
	experts: IExpertRecord;
	production: IProductionResult;
	materialio: IMaterialIO[];
	workforceMaterialIO: IMaterialIO[];
	productionMaterialIO: IMaterialIO[];
	profit: number;
	cost: number;
	revenue: number;
	infrastructureCosts: IInfrastructureCosts;
	constructionMaterials: IBuildingConstruction[];
}

export const planEmptyResult = {
	done: false,
	corphq: false,
	cogc: "---" as PLAN_COGCPROGRAM_TYPE,
	workforce: [
		"pioneer",
		"settler",
		"technician",
		"engineer",
		"scientist",
	].reduce((sum, w) => {
		sum[w as WORKFORCE_TYPE] = {
			name: w as WORKFORCE_TYPE,
			required: 0,
			capacity: 0,
			left: 0,
			lux1: true,
			lux2: true,
			efficiency: 0,
		};
		return sum;
	}, {} as IWorkforceRecord),
	area: { permits: 0, areaUsed: 0, areaTotal: 0, areaLeft: 0 },
	infrastructure: {
		HB1: 0,
		HB2: 0,
		HB3: 0,
		HB4: 0,
		HB5: 0,
		HBB: 0,
		HBC: 0,
		HBM: 0,
		HBL: 0,
		STO: 0,
		STA: 0,
		STE: 0,
		STV: 0,
		STW: 0,
	},
	storage: {
		STO: 0,
		STA: 0,
		STE: 0,
		STV: 0,
		STW: 0,
	},
	experts: [
		"Agriculture",
		"Chemistry",
		"Construction",
		"Electronics",
		"Food_Industries",
		"Fuel_Refining",
		"Manufacturing",
		"Metallurgy",
		"Resource_Extraction",
	].reduce((sum, e) => {
		sum[e as EXPERT_TYPE] = {
			name: e as EXPERT_TYPE,
			amount: 0,
			bonus: 0,
		};
		return sum;
	}, {} as IExpertRecord),
	production: {
		buildings: [],
		materialio: [],
	},
	materialio: [],
	workforceMaterialIO: [],
	productionMaterialIO: [],
	profit: 0,
	cost: 0,
	revenue: 0,
	infrastructureCosts: {
		HB1: 0,
		HB2: 0,
		HB3: 0,
		HB4: 0,
		HB5: 0,
		HBB: 0,
		HBC: 0,
		HBM: 0,
		HBL: 0,
		STO: 0,
		STA: 0,
		STE: 0,
		STV: 0,
		STW: 0,
	},
	constructionMaterials: [],
};

// Procomputational values
interface IPreBuildingInformation {
	ticker: string;
	buildingData: IBuilding;
	buildingRecipes: IRecipe[];
	constructionMaterials: IMaterialIOMinimal[];
	constructionCost: number;
	workforceMaterials: IMaterialIOMinimal[];
}

export type IPreBuildingRecord = Record<string, IPreBuildingInformation>;

export interface IBuildingConstruction {
	ticker: string;
	materials: IMaterialIOMinimal[];
	amount: number;
}

export interface IVisitationData {
	storageFilled: number;
	dailyWeightImport: number;
	dailyWeightExport: number;
	dailyVolumeImport: number;
	dailyVolumeExport: number;
	dailyWeight: number;
	dailyVolume: number;
}

export interface IOverviewData {
	dailyCost: number;
	dailyProfit: number;
	totalConstructionCost: number;
	dailyDegradationCost: number;
	profit: number;
	roi: number;
}
