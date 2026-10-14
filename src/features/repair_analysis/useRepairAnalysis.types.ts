// Types & Interfaces
import type { IPlanRepairAnalysisElement } from "@/features/planning/components/tools/planRepairAnalysis.types";
import type { IMaterialIOMinimal } from "@/features/planning/usePlanCalculation.types";

/** one building type of the plan, its curve per single building */
export interface IRepairBuilding {
	ticker: string;
	name: string;
	amount: number;
	constructionMaterials: IMaterialIOMinimal[];
	/** daily production value of one building at full efficiency */
	productionValue: number;
	/** daily workforce cost of one building, positive */
	workforceCost: number;
	curve: IPlanRepairAnalysisElement[];
	split: { lostOutput: number; repairPerDay: number }[];
	best: number;
	/** good range, first and last day */
	range: [number, number];
}

export interface IRepairMaterial {
	ticker: string;
	amount: number;
	cost: number;
	weight: number;
	volume: number;
}

/** materials of one repair, most expensive first, with totals */
export interface IRepairMaterialList {
	materials: IRepairMaterial[];
	cost: number;
	weight: number;
	volume: number;
}

/** a real building of the player's site (FIO) */
export interface IRepairFIOBuilding {
	/** 1-based number within its type */
	index: number;
	/** days since the last repair, undefined when never repaired */
	ageDays: number | undefined;
	/** 0..1 */
	condition: number;
	repairMaterials: { ticker: string; amount: number }[];
}
