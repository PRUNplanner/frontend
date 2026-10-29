// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import type { usePlanCalculation } from "@/features/planning/usePlanCalculation";

/** What `usePlanCalculation` hands the plan view and its composables */
export type IPlanCalculation = ReturnType<typeof usePlanCalculation>;

/** PlanView's props, read reactively by its composables */
export interface IPlanViewProps {
	disabled?: boolean;
	planData: IPlanDefinition;
	empireList?: PlanEmpireElement[];
	sharedPlanUuid?: string;
	// a shared plan, edited as the viewer's working copy
	shared?: boolean;
}
