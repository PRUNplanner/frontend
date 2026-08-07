// Types local to the raukk sourcing pure-math modules.
// The shared feature contract lives in ../raukkSourcing.types.ts and is
// intentionally not extended here.

// Types & Interfaces
import {
	IMaterialIO,
	IMaterialIOMinimal,
	IProductionResult,
} from "@/features/planning/usePlanCalculation.types";
import { IRaukkOutputCost } from "@/features/raukk_sourcing/raukkSourcing.types";

/**
 * Minimal building shape needed for repair capital cost. Both
 * `IProductionBuilding` (plan result) and `IPlanRepairAnalysisDataProp`
 * (repair analysis tool) structurally satisfy it.
 */
export interface IRaukkRepairBuilding {
	name: string;
	amount: number;
	constructionMaterials: IMaterialIOMinimal[];
}

/** Repair material demand, in units per day, keyed by ticker */
export type IRaukkMaterialUnits = Record<string, number>;

export interface IRaukkRepairMaterials {
	/** Key: building name, value: repair units per day per ticker */
	perBuilding: Record<string, IRaukkMaterialUnits>;
	/** Plan total repair units per day per ticker */
	total: IRaukkMaterialUnits;
}

export interface IRaukkRepairCost {
	/** Key: building name, value: repair cost per day */
	perBuilding: Record<string, number>;
	/** Plan total repair cost per day */
	total: number;
	/** Repair material demand per day, for draw bookkeeping */
	materialUnitsPerDay: IRaukkMaterialUnits;
}

/**
 * Narrow exchange price shape. `IExchange` from the game data API
 * structurally satisfies this.
 */
export interface IRaukkExchangePrices {
	bid: number;
	ask: number;
	vwap_7d: number;
	vwap_30d: number;
}

/** Price of one unit, optionally sourced from another plan's snapshot */
export interface IRaukkResolvedPrice {
	price: number;
	/** Set when the unit is drawn from another plan instead of a market */
	fromPlanUuid?: string;
}

export type IRaukkPriceResolver = (ticker: string) => IRaukkResolvedPrice;

/**
 * Subset of `IPlanResult` the true-cost rollup consumes. A full
 * `IPlanResult` structurally satisfies it.
 */
export interface IRaukkPlanCostSource {
	production: IProductionResult;
	materialio: IMaterialIO[];
	workforceMaterialIO: IMaterialIO[];
	productionMaterialIO: IMaterialIO[];
}

export interface IRaukkTrueCostInput {
	planResult: IRaukkPlanCostSource;
	/** Key: building name, value: repair cost per day */
	repairCostPerDayByBuilding: Record<string, number>;
	/** Repair material demand per day, used for draw bookkeeping only */
	repairMaterialUnitsPerDay?: IRaukkMaterialUnits;
	resolveInputPrice: IRaukkPriceResolver;
}

export interface IRaukkTrueCostResult {
	/** Key: output material ticker */
	outputs: Record<string, IRaukkOutputCost>;
	/** Key: source plan uuid, then ticker to units per day */
	draws: Record<string, IRaukkMaterialUnits>;
}
