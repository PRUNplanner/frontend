// services
import { apiService } from "@/lib/apiService";
import config from "@/lib/config";
import { correlationId } from "@/lib/requestIds";

// Schemas & Schema Types
import {
	PlanClonePayloadSchema,
	PlanCreateDataSchema,
	PlanDraftResponseSchema,
	PlanDraftSavedSchema,
	PlanDraftSaveDataSchema,
	PlanListSchema,
	PlanSaveCreateResponseSchema,
	PlanSaveDataSchema,
	PlanSchema,
	PlanShareSchema,
	PlanVersionListItemSchema,
	PlanVersionClonePayloadSchema,
	PlanVersionListSchema,
	PlanVersionRenameSchema,
	PlanVersionSchema,
} from "@/features/api/schemas/planningData.schemas";

// Types & Interfaces
import type {
	Plan,
	PlanCreateData,
	PlanDraft,
	PlanDraftSaveData,
	PlanSaveCreateResponse,
	PlanSaveData,
	PlanShare,
	PlanVersion,
	PlanVersionListItem,
} from "@/features/api/schemas/planningData.schemas";

/**
 * Fetches data of a shared plans uuid from the API
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} sharedPlanUuid Shared Plan Uuid
 * @returns {Promise<PlanShare>} Shared Plan Data
 */
export async function callGetShared(
	sharedPlanUuid: string
): Promise<PlanShare> {
	return apiService.get(
		`/planning/shared/${sharedPlanUuid}/`,
		PlanShareSchema
	);
}

/**
 * Gets a plan specified by plan Uuid
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} planUuid Uuid of the plan to fetch
 * @returns {Promise<Plan>} Plan Data
 */
export async function callGetPlan(planUuid: string): Promise<Plan> {
	return apiService.get(`/planning/plan/${planUuid}/`, PlanSchema);
}

/**
 * Gets all user plans
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<Plan[]>} List of Plan Data
 */
export async function callGetPlanlist(): Promise<Plan[]> {
	return apiService.get("/planning/plan/", PlanListSchema);
}

/**
 * Executes a Put request containing a new plans data towards
 * the backend API and returns its response
 * @author jplacht
 *
 * @export
 * @async
 * @param {PlanCreateData} data Plan data to be created
 * @returns {Promise<PlanSaveCreateResponse>}  Plan Uuid
 */
export async function callCreatePlan(
	data: PlanCreateData
): Promise<PlanSaveCreateResponse> {
	return apiService.post(
		"/planning/plan/",
		data,
		PlanCreateDataSchema,
		PlanSaveCreateResponseSchema
	);
}

/**
 * Executes a Patch request containing an existing plans updated
 * planning data towards backend and returns its response
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} planUuid Plan Uuid
 * @param {PlanSaveData} data Plan Data to be stored
 * @returns {Promise<PlanSaveCreateResponse>} Plan Uuid
 */
export async function callSavePlan(
	planUuid: string,
	data: PlanSaveData
): Promise<PlanSaveCreateResponse> {
	return apiService.put(
		`/planning/plan/${planUuid}/`,
		data,
		PlanSaveDataSchema,
		PlanSaveCreateResponseSchema
	);
}

/**
 * Executes a PUT request cloning an existing plan
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} planUuid Plan Uuid
 * @param {string} cloneName Name of cloned Plan
 * @returns {Promise<Plan>} Cloned Plan
 */
export async function callClonePlan(
	planUuid: string,
	cloneName: string
): Promise<Plan> {
	return apiService.post(
		`/planning/plan/${planUuid}/clone/`,
		{ plan_name: cloneName },
		PlanClonePayloadSchema,
		PlanSchema
	);
}

/**
 * Executres a DELETE request for an existing plan
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} planUuid Plan Uuid
 * @returns {Promise<void>} Resolves once deleted
 */
export async function callDeletePlan(planUuid: string): Promise<void> {
	return apiService.delete(`/planning/plan/${planUuid}/`);
}

/**
 * Lists the saved versions of a plan, newest first (drafts excluded)
 *
 * @param {string} planUuid Plan Uuid
 * @returns {Promise<PlanVersionListItem[]>} Versions
 */
export async function callGetPlanVersions(
	planUuid: string
): Promise<PlanVersionListItem[]> {
	return apiService.get(
		`/planning/plan/${planUuid}/versions/`,
		PlanVersionListSchema
	);
}

/**
 * Gets one saved version of a plan with its stored snapshot
 *
 * @param {string} planUuid Plan Uuid
 * @param {string} versionUuid Version Uuid
 * @returns {Promise<PlanVersion>} Version
 */
export async function callGetPlanVersion(
	planUuid: string,
	versionUuid: string
): Promise<PlanVersion> {
	return apiService.get(
		`/planning/plan/${planUuid}/versions/${versionUuid}/`,
		PlanVersionSchema
	);
}

/**
 * Names a version, "" unnames it
 *
 * @param {string} planUuid Plan Uuid
 * @param {string} versionUuid Version Uuid
 * @param {string} name New name
 * @returns {Promise<PlanVersionListItem>} Renamed version
 */
export async function callRenamePlanVersion(
	planUuid: string,
	versionUuid: string,
	name: string
): Promise<PlanVersionListItem> {
	return apiService.patch(
		`/planning/plan/${planUuid}/versions/${versionUuid}/`,
		{ name },
		PlanVersionRenameSchema,
		PlanVersionListItemSchema
	);
}

/**
 * Creates a new plan from a version; the original plan stays unchanged
 *
 * @param {string} planUuid Plan Uuid
 * @param {string} versionUuid Version Uuid
 * @returns {Promise<Plan>} The new plan
 */
export async function callClonePlanVersion(
	planUuid: string,
	versionUuid: string
): Promise<Plan> {
	return apiService.post(
		`/planning/plan/${planUuid}/versions/${versionUuid}/clone/`,
		{},
		PlanVersionClonePayloadSchema,
		PlanSchema
	);
}

/**
 * Gets the plan's autosave draft, null if there is none
 *
 * @param {string} planUuid Plan Uuid
 * @returns {Promise<PlanDraft | null>} Draft
 */
export async function callGetPlanDraft(
	planUuid: string
): Promise<PlanDraft | null> {
	const { draft } = await apiService.get(
		`/planning/plan/${planUuid}/draft/`,
		PlanDraftResponseSchema
	);
	return draft;
}

/**
 * Stores the plan's autosave draft; 409 draft_conflict if another draft
 * than `draft_updated_at` is stored
 *
 * @param {string} planUuid Plan Uuid
 * @param {PlanDraftSaveData} data Draft
 * @returns {Promise<string>} updated_at of the stored draft, raw
 */
export async function callSavePlanDraft(
	planUuid: string,
	data: PlanDraftSaveData
): Promise<string> {
	const { updated_at } = await apiService.put(
		`/planning/plan/${planUuid}/draft/`,
		data,
		PlanDraftSaveDataSchema,
		PlanDraftSavedSchema
	);
	return updated_at;
}

/**
 * Deletes the plan's autosave draft if it is still the one this tab saw
 * (409 draft_conflict otherwise)
 *
 * @param {string} planUuid Plan Uuid
 * @param {string} draftUpdatedAt updated_at of the draft this tab saw, raw
 * @returns {Promise<void>} Resolves once deleted
 */
export async function callDeletePlanDraft(
	planUuid: string,
	draftUpdatedAt: string
): Promise<void> {
	return apiService.delete(
		`/planning/plan/${planUuid}/draft/?draft_updated_at=${encodeURIComponent(draftUpdatedAt)}`
	);
}

// browsers cap the bodies of all pending keepalive requests at 64 KiB
const KEEPALIVE_MAX_BYTES = 64 * 1024;

/**
 * Stores the draft while the page is hidden or unloads: a keepalive fetch
 * outlives the page, axios can't send one. Like `lib/clientErrors.ts`, but
 * authenticated: the token is set by hand and can't be refreshed on a 401.
 * Its answer arrives only if the page lives on (hidden, not closed).
 *
 * @param {string} planUuid Plan Uuid
 * @param {PlanDraftSaveData} data Draft
 * @param {string} token Access token
 * @returns {Promise<string | null> | false} The stored draft's updated_at
 * (raw), null if it wasn't stored (e.g. a 401 or 409, offline); false if
 * not sent, the body is over the keepalive cap
 */
export function sendPlanDraftKeepalive(
	planUuid: string,
	data: PlanDraftSaveData,
	token: string
): Promise<string | null> | false {
	const body = JSON.stringify(PlanDraftSaveDataSchema.parse(data));
	if (new Blob([body]).size > KEEPALIVE_MAX_BYTES) return false;

	return fetch(`${config.API_BASE_URL}/planning/plan/${planUuid}/draft/`, {
		method: "PUT",
		keepalive: true,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
			"X-Correlation-ID": correlationId(),
		},
		body,
	})
		.then(async (response) =>
			response.ok
				? PlanDraftSavedSchema.parse(await response.json()).updated_at
				: null
		)
		.catch(() => null);
}
