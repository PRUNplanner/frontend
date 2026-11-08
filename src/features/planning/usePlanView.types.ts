import type { ComputedRef, Ref } from "vue";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import type { IPlanCalculation } from "@/features/planning/planView.types";
import type { HabSolverGoal } from "@/features/planning/calculations/habOptimization";
import type { ElementId } from "@/features/planning/layout/planLayout.types";
import type { IMarketCheck } from "@/features/cx/marketCheck.types";
import type { usePlanEdits } from "@/features/planning/usePlanEdits";
import type { usePlanIO } from "@/features/planning/usePlanIO";
import type { usePlanSharedCopy } from "@/features/planning/usePlanSharedCopy";

/**
 * What the plan page's elements read, provided by PlanView: they take no
 * props, so the layout can put them anywhere
 */
export interface IPlanViewContext {
	calculation: IPlanCalculation;
	planData: Ref<IPlanDefinition>;
	planet: Planet;
	// nothing can be edited: a read-only plan or a version preview
	readOnly: ComputedRef<boolean>;
	shared: boolean;
	isOwnPlan: ComputedRef<boolean>;
	empire: {
		uuid: Ref<string | undefined>;
		list: Ref<PlanEmpireElement[] | undefined>;
		cxUuid: ComputedRef<string | undefined>;
		// the empire's profit per area, when the empire page calculated it
		profitPerArea: ComputedRef<number | undefined>;
	};
	// a visitor without empires: where the prices come from
	priceSource: ComputedRef<string | undefined>;
	sharedCopy: Pick<
		ReturnType<typeof usePlanSharedCopy>,
		"sharedChanges" | "sharedCompare"
	>;
	edits: ReturnType<typeof usePlanEdits>;
	io: ReturnType<typeof usePlanIO>;
	marketChecks: ComputedRef<Map<string, IMarketCheck>>;
	flagCount: ComputedRef<number>;
	autoOptimizeHabs: Ref<boolean>;
	setAutoOptimizeHabs: (value: boolean, goal: HabSolverGoal) => void;
	openInsights: () => void;
	// switches to the element, unfolds it, scrolls it into view
	focusElement: (id: ElementId) => void;
	layoutEditing: {
		active: Ref<boolean>;
		// whether an element shows all it can hide (tiers, fields, buttons)
		showAll: (el: ElementId) => boolean;
		// whether an element shows as a table instead of cards
		table: (el: ElementId) => boolean;
	};
}
