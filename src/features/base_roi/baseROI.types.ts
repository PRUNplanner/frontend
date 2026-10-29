// Types & Interfaces
import type { IPriceSource } from "@/features/cx/priceBook";
import type { BuildingExpertise } from "@/features/api/schemas/gameData.schemas";
import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";
import type {
	IInfrastructureRecord,
	IPlanResult,
} from "@/features/planning/usePlanCalculation.types";
import type { IPlanCalculation } from "@/features/planning/engine/engine.types";

/** the engine result of one base and the layout it ended with */
export interface IBaseCalculation extends IPlanCalculation {
	amount: number;
	infrastructure: IInfrastructureRecord;
	storageAdded: { STO: number; STA: number };
}

export type BaseROIRowKind = "resource" | "farming" | "recipe";

/** a row to calculate: one building and recipe, on a planet or not */
export interface IBaseROICandidate {
	key: string;
	kind: BaseROIRowKind;
	building: string;
	expertise: BuildingExpertise | null;
	recipeId: string;
	// planet rows only
	planetNaturalId: string | null;
	planetName: string | null;
	jumps: number | null;
}

/** a material the base buys (amount < 0) or sells (amount > 0) per day */
export interface IBaseROIMaterial {
	ticker: string;
	amount: number;
	price: number;
	source: IPriceSource;
	// bid and ask on the price source's exchange, 0 without data
	bid: number;
	ask: number;
}

export interface IBaseROIOutput {
	ticker: string;
	amount: number;
	// 7-day average traded per day on the price source's volume exchange
	traded: number;
}

/** what the engine gives a row, before the settings' add-ons */
export interface IBaseROIRowInput extends IBaseROICandidate {
	productionBuildings: number;
	infrastructure: IInfrastructureRecord;
	// storage the buffer added on top of the static layout
	storageAdded: { STO: number; STA: number };
	areaUsed: number;
	areaTotal: number;
	// money per day
	revenue: number;
	inputs: number;
	consumables: number;
	degradation: number;
	construction: number;
	// the planet's active COGC program, shown, never applied
	planetCOGC: string | null;
	// the planet's environment materials, part of the construction
	environment: number;
	environmentMaterials: { ticker: string; amount: number; price: number }[];
	// every building to construct: production, core module, infrastructure
	buildingCosts: { ticker: string; amount: number; unitCost: number }[];
	// cargo per day
	weightIn: number;
	weightOut: number;
	volumeIn: number;
	volumeOut: number;
	storageWeight: number;
	storageVolume: number;
	// expert bonus the engine ran with (5 with the ramp)
	expertBonus: number;
	materials: IBaseROIMaterial[];
	outputs: IBaseROIOutput[];
	workforce: { tier: WorkforceType; required: number }[];
	result: IPlanResult;
}

export interface IBaseROIStage {
	experts: number;
	dailyProfit: number;
	// building cost left at the start of the stage
	remaining: number;
	// stage length, Infinity for the last (5 experts)
	days: number;
	// paid off in this stage after this many days, else null
	paidAfter: number | null;
}

export interface IBaseROIScenarioPrice {
	ticker: string;
	side: "bid" | "ask";
	price: number;
}

export interface IBaseROIScenario {
	prices: IBaseROIScenarioPrice[];
	dailyProfit: number;
}

export interface IBaseROIMetrics {
	dailyProfit: number;
	runningCost: number;
	buildingCost: number;
	bufferStock: number;
	hqCost: number;
	shipCost: number;
	shipsNeeded: number;
	// days, Infinity = never
	breakEven: number;
	// payback at 5 experts (ramp), else the break-even
	payback: number;
	timeline: IBaseROIStage[];
	weeklyReturn: number;
	cargo: number;
	fitsLogistics: boolean;
	marketCapacity: number;
	scenarios: IBaseROIScenario[];
}

export interface IBaseROIRow extends IBaseROIRowInput {
	metrics: IBaseROIMetrics;
}

export interface IBaseROIHidden {
	maxJumps: number;
	logistics: number;
	marketCapacity: number;
	negative: number;
}

/** per day of the history, oldest first */
export interface IBaseROIHistory {
	revenue: number[];
	cost: number[];
	profit: number[];
}

export interface IBaseROIDetailLine {
	label: string;
	value: string;
	formula?: string;
	// the section's result
	total?: boolean;
	// a material ticker shown as a tile
	ticker?: string;
}

export interface IBaseROIDetailSection {
	id: number;
	title: string;
	lines: IBaseROIDetailLine[];
}

/** daily VWAP per exchange and ticker, oldest first, null without trades */
export type IBaseROISeries = Record<
	string,
	Record<string, (number | null)[]> | undefined
>;

/** where a calculation is; "error" when a request failed */
export type BaseROIStep =
	| "idle"
	| "game"
	| "planets"
	| "recipes"
	| "calculating"
	| "done"
	| "error";
