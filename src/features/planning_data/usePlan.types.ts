import type { Plan } from "@/features/api/schemas/planningData.schemas";

export interface IPlanRouteParams {
	planetNaturalId: string | undefined;
	planUuid: string | undefined;
	sharedPlanUuid: string | undefined;
}

/**
 * A plan as the editor holds it. A blank definition has no uuid or name
 * until it is saved the first time.
 */
export interface IPlanDefinition extends Omit<Plan, "uuid" | "plan_name"> {
	uuid: string | undefined;
	plan_name: string | undefined;
}
