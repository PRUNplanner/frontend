import type { IMaterialIOMinimal } from "@/features/planning/usePlanCalculation.types";

export interface IPlanRepairAnalysisDataProp {
	name: string;
	amount: number;
	dailyRevenue: number;
	constructionMaterials: IMaterialIOMinimal[];
}

export interface IPlanRepairAnalysisElement {
	day: number;
	efficiency: number;
	dailyRevenue: number;
	dailyRevenue_integral: number;
	dailyRevenue_norm: number;
	materials: { ticker: string; amount: number }[];
	repair: number;
	dailyRepair: number;
	profit: number;
}
