import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

export interface IEmpirePlanListData {
	uuid: string;
	name: string | undefined;
	planet: string;
	permits: number;
	cogc: PlanCOGCProgram;
	profit: number;
}

export interface IEmpireMaterialIOPlanet {
	planetId: string;
	planUuid: string;
	planName: string;
	planCOGC: PlanCOGCProgram;
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
	planCOGC: PlanCOGCProgram;
	materialIO: IMaterialIO[];
}

export interface IEmpireCostOverview {
	totalProfit: number;
	totalRevenue: number;
	totalCost: number;
	totalAreaUsed: number;
}

export interface IEmpireMaterialIOSideEntry {
	planetId: string;
	planUuid: string;
	planName: string;
	amount: number;
	share: number;
}

export interface IEmpireMaterialIOSide {
	entries: IEmpireMaterialIOSideEntry[];
	total: number;
	top: IEmpireMaterialIOSideEntry | undefined;
	more: number;
	fillPct: number;
}

export interface IEmpireMaterialIONetPlan {
	planUuid: string;
	planName: string;
	volume: number;
}

export interface IEmpireMaterialIONetEntry {
	planetId: string;
	produces: number;
	consumes: number;
	net: number;
	balanced: boolean;
	plans: IEmpireMaterialIONetPlan[];
}

export interface IEmpireMaterialIONet {
	surplus: IEmpireMaterialIONetEntry[];
	needs: IEmpireMaterialIONetEntry[];
	surplusTotal: number;
	needsTotal: number;
}
