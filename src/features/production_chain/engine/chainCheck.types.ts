// Types & Interfaces
import type {
	PlanetSearchIndexEntry,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import type {
	ExpertType,
	PlanCOGCProgram,
} from "@/features/api/schemas/planningData.schemas";
import type { IBuildingEfficiency } from "@/features/planning/calculations/bonusCalculations.types";
import type { IPlanResult } from "@/features/planning/usePlanCalculation.types";
import type {
	ChainLux,
	IChainMarketShare,
} from "@/features/production_chain/engine/chainSolver.types";

/** one plan of the empire, calculated by the plan engine */
export interface ICheckPlan {
	/** A, B, … in name order */
	id: string;
	uuid: string;
	name: string;
	planetId: string;
	cogc: PlanCOGCProgram;
	result: IPlanResult;
	/** profit per day as the plan calculates it */
	profit: number;
}

export interface ICheckInput {
	plans: ICheckPlan[];
	/** the chains to check: materials the empire sells */
	targets: string[];
	/** findings below this many ȼ / day are hidden, plan fixes never */
	min: number;
	/** show luxuries and experts gains */
	setup: boolean;
	/** moves pay back within this many days */
	payback: number;
	/** per step key, the planet the user picked */
	picks: Record<string, string>;
}

/** a plan building running one recipe */
export interface ICheckStep {
	/** base:building:material, the key of a location pick */
	key: string;
	base: string;
	building: string;
	/** the output worth most */
	ticker: string;
	recipe: Recipe;
	extraction: boolean;
	/** buildings working on it: amount × daily share */
	buildings: number;
	/** buildings of this type in the plan */
	built: number;
	efficiency: number;
	elements: IBuildingEfficiency[];
	outputs: Record<string, number>;
	inputs: Record<string, number>;
	/** of the main output */
	perDay: number;
	/** upkeep with the plan's luxuries and wear per building and day */
	daily: number;
	/** inputs at the empire's unit cost, or CX price when bought, per day */
	inputCost: number;
	/** per unit of the main output, with upkeep and wear */
	unitCost: number;
	/** output value at CX price minus input cost, per day */
	margin: number;
	inChain: boolean;
}

export interface ICheckPlots {
	free: number;
	total: number;
	ghost: boolean;
}

/** a planet a step could run on instead */
export interface ICheckOption {
	planet: PlanetSearchIndexEntry;
	/** the empire's base on it, null for a new base */
	own: string | null;
	/** its planet factor over the step's planet now */
	ratio: number;
	gain: number;
	construction: number;
	/** days, null without gain */
	payback: number | null;
	/** area the move needs */
	area: number;
	/** own base: its free area */
	free: number | null;
	fits: boolean;
	/** null when unknown */
	plots: ICheckPlots | null;
	/** no free plot and no ghost sites */
	full: boolean;
	/** no free plot, but ghost sites */
	ghostOnly: boolean;
	/** payback above the limit */
	slow: boolean;
	running: PlanCOGCProgram;
	/** it runs the step's expertise program */
	runsProgram: boolean;
	/** units per building and day at 100 %, extraction only */
	rate: number | null;
}

export type CheckKind = "fix" | "recipe" | "buy" | "location" | "setup";

interface ICheckFindingBase {
	/** unique, for keys and filters */
	id: string;
	base: string;
	/** null for base-wide findings (plan fixes, setup) */
	step: ICheckStep | null;
	delta: number;
	construction: number;
	/** days, null without construction */
	payback: number | null;
}

/** the plan's COGC program and the planet's differ */
export interface ICheckFixFinding extends ICheckFindingBase {
	kind: "fix";
	/** "lost": the plan counts a program the planet doesn't run; "missed": the planet runs one the plan doesn't count */
	fix: "lost" | "missed";
	program: PlanCOGCProgram;
	running: PlanCOGCProgram;
	steps: ICheckStep[];
	/** what the program changes: −0.2 lost, +0.25 missed for advertising */
	factor: number;
}

export interface ICheckRecipeFinding extends ICheckFindingBase {
	kind: "recipe";
	step: ICheckStep;
	recipe: Recipe;
	/** unit costs now and with the recipe */
	now: number;
	alt: number;
	/** exact buildings the recipe needs for the same output */
	need: number;
	extra: number;
}

export interface ICheckBuyFinding extends ICheckFindingBase {
	kind: "buy";
	step: ICheckStep;
	cost: number;
	price: number;
	market: IChainMarketShare;
}

export interface ICheckLocationFinding extends ICheckFindingBase {
	kind: "location";
	step: ICheckStep;
	/** every option, best gain first */
	options: ICheckOption[];
	option: ICheckOption;
	suggested: ICheckOption | null;
	picked: boolean;
	/** options ranked above the suggestion that fail a check */
	better: ICheckOption[];
	/** the step's planet factor now */
	here: number;
	/** extraction: units per building and day at 100 % on its planet */
	hereRate: number | null;
	expertise: string | null;
}

export interface ICheckLuxFinding extends ICheckFindingBase {
	kind: "setup";
	setup: "lux";
	lux: ChainLux;
	/** output gain and luxury cost per day */
	gain: number;
	cost: number;
	/** average efficiency gain of the base's buildings */
	factor: number;
}

export interface ICheckExpertsFinding extends ICheckFindingBase {
	kind: "setup";
	setup: "experts";
	experts: Record<ExpertType, number>;
	now: Record<ExpertType, number>;
}

export type ICheckFinding =
	| ICheckFixFinding
	| ICheckRecipeFinding
	| ICheckBuyFinding
	| ICheckLocationFinding
	| ICheckLuxFinding
	| ICheckExpertsFinding;

/** out: no step in the chains; fix: a plan fix; imp: improvements; ok: none */
export type CheckVerdict = "out" | "fix" | "imp" | "ok";

export interface ICheckBase {
	id: string;
	plan: ICheckPlan;
	planet: PlanetSearchIndexEntry | null;
	running: PlanCOGCProgram;
	lux: ChainLux;
	experts: Record<ExpertType, number>;
	/** the split worth most for its steps */
	bestExperts: Record<ExpertType, number>;
	steps: ICheckStep[];
	checked: boolean;
	/** targets of the chains it is in */
	targets: string[];
	buildings: number;
	efficiency: { min: number; max: number };
	/** 1,000 minus the area it uses */
	free: number;
	verdict: CheckVerdict;
	/** shown findings */
	findings: ICheckFinding[];
	/** fixes + setup + the best alternative per step */
	gain: number;
}

/** what the chain planner would do with a material */
export type CheckDefault =
	| { kind: "same" }
	| { kind: "recipe"; recipe: Recipe }
	| { kind: "extract" }
	| { kind: "buy_cheaper" }
	| { kind: "make"; recipe: Recipe; cost: number }
	| { kind: "bought" }
	| { kind: "raw" };

export interface ICheckChainRow {
	ticker: string;
	depth: number;
	/** per day, 0 when bought */
	made: number;
	steps: ICheckStep[];
	unitCost: number;
	price: number;
	chainDefault: CheckDefault;
}

export interface ICheckChain {
	target: string;
	/** net per day */
	sold: number;
	value: number;
	bases: string[];
	rows: ICheckChainRow[];
}

export interface ICheckSold {
	ticker: string;
	perDay: number;
	value: number;
}

export interface ICheckTotals {
	profit: number;
	gain: number;
	checked: number;
	optimal: number;
	/** shown findings per kind */
	counts: Record<CheckKind, number>;
	setupGain: number;
	moveCost: number;
	moveGain: number;
}

export interface ICheckResult {
	bases: ICheckBase[];
	/** what the empire sells, by value */
	sold: ICheckSold[];
	net: Record<string, number>;
	chains: ICheckChain[];
	/** shown findings, plan fixes first, then by Δ */
	findings: ICheckFinding[];
	totals: ICheckTotals;
	/** sold outputs of bases outside the chains */
	unchecked: string[];
}
