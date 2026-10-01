import type { PlanDataBuilding } from "@/features/api/schemas/planningData.schemas";

export interface ITypicalRecipes {
	/** % of the planet's plans with this building that run it */
	percentage: number;
	recipes: PlanDataBuilding["active_recipes"];
}
