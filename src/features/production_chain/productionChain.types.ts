// Types & Interfaces
import type { PlanFaction } from "@/features/api/schemas/planningData.schemas";

/** Steps table row order */
export type IChainOrder = "chain" | "source";

/** a warning chip filtering the Steps table */
export type IChainFilter = "cheaper" | "thin";

/** what the graph's line width follows */
export type IChainLineMode = "t" | "c" | "n";

export type IChainView = "steps" | "graph" | "bases";

/** where created plans go */
export type IChainEmpireChoice =
	| { kind: "new"; name: string; faction: PlanFaction }
	| { kind: "existing"; uuid: string; name: string }
	| { kind: "none" };

export interface IChainCreatedPlan {
	base: string;
	uuid: string;
	name: string;
	planetId: string;
}

/** what "Create plans" made; failed names the base that failed */
export interface IChainCreated {
	plans: IChainCreatedPlan[];
	empire: { uuid: string; name: string } | null;
	failed: string | null;
}
