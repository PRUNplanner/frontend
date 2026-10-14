import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
import type {
	IMaterialIO,
	IVisitationData,
} from "@/features/planning/usePlanCalculation.types";

/** ¢ per day: costs positive, revenue − inputs − workforce − degradation = profit */
export interface IEmpireSplitParts {
	revenue: number;
	inputs: number;
	workforce: number;
	degradation: number;
	profit: number;
}

export interface IEmpirePlanListData extends IEmpireSplitParts {
	uuid: string;
	name: string | undefined;
	planet: string;
	permits: number;
	cogc: PlanCOGCProgram;
}

/** % of revenue, or of cost for a loss (then profit is 0 and uncovered > 0) */
export interface IEmpireSplitShares {
	inputs: number;
	workforce: number;
	degradation: number;
	profit: number;
	/** share of the cost revenue does not cover */
	uncovered: number;
	/** profit / revenue, NaN without revenue */
	margin: number;
}

export interface IEmpireRevenueSplitRows {
	/** the most profitable plans */
	top: IEmpirePlanListData[];
	/** every loss-making plan */
	losses: IEmpirePlanListData[];
	/** the other profitable plans, summed in other */
	rest: IEmpirePlanListData[];
	other: IEmpireSplitParts | undefined;
}

export interface IEmpireButterflyRow {
	ticker: string;
	/** signed: bought (net consumed) < 0, sold (net produced) > 0 */
	value: number;
}

export type EmpireButterflyMetric = "price" | "amount";

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

export type IEmpireShippingDemand = Omit<IVisitationData, "storageFilled">;

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
