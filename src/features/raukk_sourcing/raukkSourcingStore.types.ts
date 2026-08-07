// Derived, non-persisted result types of the raukk sourcing store.
// The persisted contract itself lives in raukkSourcing.types.ts and is
// intentionally not extended here.

// Types & Interfaces
import {
	IRaukkPlanConfig,
	IRaukkSnapshot,
	RAUKK_SOURCE_AGGREGATE,
} from "@/features/raukk_sourcing/raukkSourcing.types";

/** A single plan offering `ticker` as an output of its snapshot */
export interface IRaukkProducerOption {
	planUuid: string;
	planName: string;
	planetNaturalId: string;
	costPerUnit: number;
	unitsPerDay: number;
	/** Snapshot the numbers originate from is flagged stale */
	stale: boolean;
	computedAt: string;
}

/** Draw of one consumer plan against a source plan's output */
export interface IRaukkSubscriptionEntry {
	planUuid: string;
	unitsPerDay: number;
}

/** Aggregated draws against one source plan's output ticker */
export interface IRaukkSubscription {
	totalDrawnPerDay: number;
	byPlan: IRaukkSubscriptionEntry[];
	/** Share of the source's daily output, may exceed 1 when
	 * oversubscribed; 0 when the source produces nothing */
	pctOfOutput: number;
}

/** Candidate edge checked by the cycle guard before it is stored */
export type IRaukkEdgeCandidate =
	| { sourcePlanUuid: string }
	| { aggregate: RAUKK_SOURCE_AGGREGATE; ticker: string };

/** Full, versioned payload of the store's JSON export/import */
export interface IRaukkExportPayload {
	version: number;
	configs: Record<string, IRaukkPlanConfig>;
	snapshots: Record<string, IRaukkSnapshot>;
}
