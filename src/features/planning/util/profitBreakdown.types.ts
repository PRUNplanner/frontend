export type ProfitBreakdownMode = "cost_type" | "building";

export interface IProfitBreakdownItem {
	/** material ticker or building name */
	key: string;
	/** ¢ per day, positive; a building's is signed (a loss is negative) */
	value: number;
	/** units produced or consumed per day, materials only */
	amount?: number;
	/** ¢ per unit, materials only */
	price?: number;
}

export interface IProfitBreakdown {
	/** totals, ¢ per day: output and costs positive, profit signed */
	output: number;
	inputs: number;
	workforce: number;
	degradation: number;
	profit: number;
	/** items per step, largest first */
	outputItems: IProfitBreakdownItem[];
	inputItems: IProfitBreakdownItem[];
	workforceItems: IProfitBreakdownItem[];
	/** buildings before degradation, largest first */
	buildings: IProfitBreakdownItem[];
	/** profit not explained by the buildings and degradation */
	unattributed: number;
}
