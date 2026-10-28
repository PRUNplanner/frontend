// Types & Interfaces
import type { PlanFaction } from "@/features/api/schemas/planningData.schemas";
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type { ChainHave } from "@/features/production_chain/engine/chainSolver.types";
import type { IChainHaveSupply } from "@/features/production_chain/engine/chainHave";

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

/** a Have amount the user set: typed on the page or from the link */
export interface IChainHaveOverride {
	value: ChainHave | "off";
	origin: "typed" | "link";
}

/** what the views show of own production */
export interface IChainOwn {
	/** the picked empire's name, null without one */
	name: string | null;
	/** the empire's net surplus by ticker */
	surplus: ReadonlyMap<string, number>;
	suppliers: Record<string, IChainHaveSupply[]>;
	overrides: Record<string, IChainHaveOverride>;
	/** the supplying plans' planets by natural id */
	planets: ReadonlyMap<string, Pick<Planet, "planet_name" | "system_id">>;
}
