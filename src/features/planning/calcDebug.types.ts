// Types & Interfaces
import type {
	ITraceEntry,
	TracePhase,
} from "@/features/planning/engine/engine.types";

/** one self-check of a traced calculation */
export interface ICalcDebugCheck {
	name: string;
	pass: boolean;
	expected?: number | string;
	actual?: number | string;
	// actual − expected, for numbers
	difference?: number;
	// where it failed, e.g. the ticker or building
	detail?: string;
}

export interface ICalcDebugReport {
	checks: ICalcDebugCheck[];
	// not failures: unresolved or 0 prices, 0 % buildings, …
	warnings: string[];
}

/** the header of a copied trace */
export interface ICalcDebugMeta {
	plan: string;
	planet: string;
	cx: string;
	empire: string;
	version: string;
	build: string;
	date: string;
}

/** a trace entry with the entries of its group in the same phase */
export interface ITraceNode {
	entry: ITraceEntry;
	children: ITraceNode[];
}

export type ITraceTree = Record<TracePhase, ITraceNode[]>;
