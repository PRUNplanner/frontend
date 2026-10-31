import type { ComputedRef } from "vue";

// Types & Interfaces
import type {
	PlanCreateData,
	PlanDraft,
} from "@/features/api/schemas/planningData.schemas";
import type { useSaveConflict } from "@/features/save_conflict/useSaveConflict";

export interface IPlanDraftOptions {
	/** the plan's uuid, undefined before it is created */
	planUuid: () => string | undefined;
	/** an own, created plan outside preview: drafts are possible */
	enabled: () => boolean;
	modified: ComputedRef<boolean>;
	/** the editor state, as the history serializes it */
	snapshot: () => string;
	/** the saved state the edits started from */
	savedSnapshot: () => string;
	/** the plan as it would be saved */
	payload: () => PlanCreateData;
	/** save version the edits started from, kept after a plan overwrite */
	base: () => string | undefined;
	/** shows a draft as unsaved edits, without an undo step */
	applyDraft: (draft: PlanDraft) => void;
	conflict: ReturnType<typeof useSaveConflict>;
}
