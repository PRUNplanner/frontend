import type {
	Plan,
	PlanSaveData,
} from "@/features/api/schemas/planningData.schemas";

/**
 * A plan as the editor holds it. A blank definition has no uuid or name
 * until it is saved the first time.
 */
export interface IPlanDefinition extends Omit<Plan, "uuid" | "plan_name"> {
	uuid: string | undefined;
	plan_name: string | undefined;
}

export interface IPlanSaved {
	uuid: string;
	/** the new save version */
	modifiedAt: string | undefined;
}

export interface IPlanSaveFailed {
	/**
	 * conflict: saved elsewhere meanwhile, deleted: gone (404),
	 * restored_from: the restored version is gone (400)
	 */
	error: "conflict" | "deleted" | "restored_from" | "failed";
}

/** what a save sends about the version it creates */
export type IPlanSaveVersion = Pick<
	PlanSaveData,
	"version_name" | "restored_from" | "draft_updated_at"
>;

export type IPlanSaveResult = IPlanSaved | IPlanSaveFailed;
