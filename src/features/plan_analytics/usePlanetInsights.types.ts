import type {
	ExpertType,
	PlanDataBuilding,
} from "@/features/api/schemas/planningData.schemas";

export interface ITypicalRecipes {
	/** % of the planet's plans with this building that run it */
	percentage: number;
	recipes: PlanDataBuilding["active_recipes"];
}

/** what "Use typical setup" adds to an empty plan */
export interface IStarterSetup {
	buildings: {
		ticker: string;
		amount: number;
		recipes: PlanDataBuilding["active_recipes"];
	}[];
	experts: { type: ExpertType; amount: number }[];
}
