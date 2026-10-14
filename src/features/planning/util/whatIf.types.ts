// Types & Interfaces
import type {
	IOverviewData,
	IPlanResult,
} from "@/features/planning/usePlanCalculation.types";

export type WhatIfView = "sensitivity";

/** price change in % at which profit is 0, or out of reach */
export type BreakEven = number | "never" | "over";

export interface ISensitivityRow {
	ticker: string;
	side: "buy" | "sell";
	// profit change in ¢/day for a +100 % price change
	slope: number;
	breakEven: BreakEven;
}

export interface IPriceSensitivity {
	result: IPlanResult;
	overview: IOverviewData;
	rows: ISensitivityRow[];
}
