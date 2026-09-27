// services
import { apiService } from "@/lib/apiService";

// Schemas & Schema Types
import {
	PlanClonePayloadSchema,
	PlanCreateDataSchema,
	PlanListSchema,
	PlanSaveCreateResponseSchema,
	PlanSaveDataSchema,
	PlanSchema,
	PlanShareSchema,
} from "@/features/api/schemas/planningData.schemas";

// Types & Interfaces
import type {
	Plan,
	PlanCreateData,
	PlanSaveCreateResponse,
	PlanSaveData,
	PlanShare,
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
 * @returns {Promise<boolean>} Deletion Status
 */
export async function callDeletePlan(planUuid: string): Promise<boolean> {
	return apiService.delete(`/planning/plan/${planUuid}/`);
}
