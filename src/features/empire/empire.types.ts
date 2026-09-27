import type { PLAN_COGCPROGRAM_TYPE } from "@/stores/planningStore.types";
import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

export interface IEmpirePlanListData {
	uuid: string;
	name: string | undefined;
	planet: string;
	permits: number;
	cogc: PLAN_COGCPROGRAM_TYPE;
	profit: number;
}

export interface IEmpireMaterialIOPlanet {
	planetId: string;
	planUuid: string;
	planName: string;
	planCOGC: PLAN_COGCPROGRAM_TYPE;
	delta: number;
	input: number;
	output: number;
	price: number;
}

export interface IEmpireMaterialIO {
	ticker: string;
	input: number;
	output: number;
	delta: number;
	deltaPrice: number;
	inputPlanets: IEmpireMaterialIOPlanet[];
	outputPlanets: IEmpireMaterialIOPlanet[];
}

export interface IEmpirePlanMaterialIO {
	planetId: string;
	planUuid: string;
	planName: string;
	planCOGC: PLAN_COGCPROGRAM_TYPE;
	materialIO: IMaterialIO[];
}

export interface IEmpireCostOverview {
	totalProfit: number;
	totalRevenue: number;
	totalCost: number;
	totalAreaUsed: number;
}
