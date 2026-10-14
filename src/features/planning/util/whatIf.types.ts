// Types & Interfaces
import type {
	IOverviewData,
	IPlanResult,
} from "@/features/planning/usePlanCalculation.types";

export type PlanCheckView = "market" | "sensitivity" | "compare";

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

/** the key figures two plans are compared by */
export type CompareFigure =
	| "profit"
	| "output"
	| "cost"
	| "degradation"
	| "planCost"
	| "roi"
	| "profitArea"
	| "area";

export interface ICompareRow {
	key: CompareFigure;
	// this plan
	a: number;
	// the other plan
	b: number;
	// other minus this, not finite when a payback never happens
	delta: number;
	// the other plan is better for you, undefined: equal or neutral
	better?: boolean;
}

export interface IMaterialChange {
	ticker: string;
	// ȼ/day value, positive when sold, in this plan and the other
	a: number;
	b: number;
	// b − a
	delta: number;
}

/** days the other plan's extra profit takes to pay its extra build cost */
export interface IPaybackOfDifference {
	// other minus this
	cost: number;
	profit: number;
	// "never": costs more, earns no more; null: costs no more
	days: number | "never" | null;
}
