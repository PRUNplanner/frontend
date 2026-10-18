// Types & Interfaces
import type {
	Building,
	Material,
	Planet,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import type { IPriceBook } from "@/features/cx/priceBook";
import type { TRACE_PHASES } from "@/features/planning/engine/trace";
import type {
	Plan,
	PlanEmpire,
} from "@/features/api/schemas/planningData.schemas";
import type {
	IOverviewData,
	IPlanResult,
} from "@/features/planning/usePlanCalculation.types";

/**
 * Game data every plan calculation reads, as plain maps. One instance can
 * be shared by every plan of a batch.
 */
export interface IGameData {
	buildings: ReadonlyMap<string, Building>;
	recipesByBuilding: Readonly<Record<string, Recipe[]>>;
	materials: ReadonlyMap<string, Material>;
}

/**
 * Everything a plan calculation reads besides the plan itself: game data,
 * the plan's planet and the price book for the plan's CX and planet.
 */
export interface IPlanContext extends IGameData {
	planet: Planet;
	prices: IPriceBook;
	// records every step for the calculation debug panel, off when unset
	trace?: IPlanTracer;
}

/**
 * A plan calculation's input. Empire and CX are explicit, not implied by
 * the caller's state.
 */
export interface IPlanInput {
	plan: Pick<
		Plan,
		"plan_data" | "plan_cogc" | "plan_corphq" | "plan_permits_used"
	>;
	// active empire, for the faction bonus
	empire: PlanEmpire | undefined;
	// CX the prices in the context were built for, undefined for Universe
	cxUuid: string | undefined;
	// compute recipe options for every building (default true)
	recipeOptions?: boolean;
}

export interface IPlanCalculation {
	result: IPlanResult;
	overview: IOverviewData;
}

/** the engine's steps, in calculation order */
export type TracePhase = (typeof TRACE_PHASES)[number];

export interface ITraceScope {
	building?: string;
	ticker?: string;
	workforce?: string;
	recipeId?: string;
}

export interface ITraceStepInput {
	phase: TracePhase;
	label: string;
	// English, with the names of `inputs` as placeholders
	formula?: string;
	inputs?: Record<string, number | string | boolean>;
	value?: number | string;
	unit?: string;
	scope?: ITraceScope;
	level?: "info" | "warn";
	note?: string;
}

export interface ITraceEntry extends ITraceStepInput {
	id: number;
	// the group this step is in, null at the top
	parent: number | null;
	level: "info" | "warn";
}

/**
 * Write-only sink for the engine's steps. Engine functions take it as an
 * optional parameter and call `trace?.step(…)` where a value is computed.
 */
export interface IPlanTracer {
	step(entry: ITraceStepInput): void;
	group<T>(
		phase: TracePhase,
		label: string,
		scope: ITraceScope | undefined,
		fn: () => T
	): T;
}
