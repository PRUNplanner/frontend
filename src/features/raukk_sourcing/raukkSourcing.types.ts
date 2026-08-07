// Shared type contract for the raukk sourcing feature.
// See docs/raukk_sourcing/spec.md for the full model.

export type RAUKK_PRICE_MODE = "BID" | "ASK" | "MID" | "AVG7D" | "AVG30D";

export type RAUKK_REPAIR_DAY = 30 | 60 | 90 | 120;

/** Synthetic multi-producer sources */
export type RAUKK_SOURCE_AGGREGATE = "AGG_AVG" | "AGG_MAX";

export type IRaukkTickerSource =
	| { mode: "market"; priceMode: RAUKK_PRICE_MODE }
	| { mode: "plan"; sourcePlanUuid: string | RAUKK_SOURCE_AGGREGATE };

/** Per-plan sourcing configuration, keyed into store by plan uuid */
export interface IRaukkPlanConfig {
	repairDay: RAUKK_REPAIR_DAY;
	/** Key: material ticker. Covers production inputs, workforce
	 * consumables and repair materials alike. Tickers without an
	 * entry default to market at the plan's CX preference price. */
	sources: Record<string, IRaukkTickerSource>;
}

/** Per-unit cost components; shipping stays 0 until the stretch goal */
export interface IRaukkCostBreakdown {
	workforce: number;
	repair: number;
	inputs: number;
	shipping: number;
}

export interface IRaukkOutputCost {
	ticker: string;
	unitsPerDay: number;
	/** Break-even ȼ per unit at current configuration */
	costPerUnit: number;
	breakdown: IRaukkCostBreakdown;
}

/** Frozen true-cost result for one plan */
export interface IRaukkSnapshot {
	/** ISO timestamp of computation */
	computedAt: string;
	stale: boolean;
	planName: string;
	planetNaturalId: string;
	/** Key: output material ticker */
	outputs: Record<string, IRaukkOutputCost>;
	/** Daily amounts drawn from other plans' snapshots.
	 * Key: CONCRETE source plan uuid (never an AGG_* sentinel —
	 * aggregate draws are pre-split across producers proportional
	 * to their unitsPerDay before storing), then ticker →
	 * units/day. Drives subscription percentages and staleness
	 * propagation. */
	draws: Record<string, Record<string, number>>;
	/** Sourcing config this snapshot was computed with */
	config?: IRaukkPlanConfig;
}
