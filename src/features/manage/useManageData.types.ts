import type { ComputedRef, Ref } from "vue";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

/** A Manage section with unsaved edits, saved and discarded by the save bar */
export interface IManageSection {
	changedCount: ComputedRef<number>;
	// a line under the count, e.g. how many plans and empires
	detail?: ComputedRef<string | undefined>;
	save: () => Promise<void>;
	discard: () => void;
}

/** The order the save bar saves in: CX first, then plan assignments */
export type ManageSectionName = "empire" | "assignments";

export interface IManageData {
	empireList: Ref<PlanEmpireElement[]>;
	planList: Ref<Plan[]>;
	cxList: Ref<CX[]>;
	refetchCX: () => Promise<void>;
	refetchEmpires: () => Promise<void>;
	// plans with their empires, both or neither
	refetchPlans: () => Promise<void>;
	register: (name: ManageSectionName, section: IManageSection) => void;
	totalChanged: ComputedRef<number>;
	saveDetail: ComputedRef<string | undefined>;
	saveSections: () => Promise<void>;
	discardSections: () => void;
}
