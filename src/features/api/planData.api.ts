// services
import { apiService } from "@/lib/apiService";

// Schemas & Schema Types
import {
	PlanClonePayloadSchema,
	PlanClonePayloadType,
	PlanCreateDataSchema,
	PlanCreateDataType,
	PlanListPayload,
	PlanSaveCreateResponseSchema,
	PlanSaveCreateResponseType,
	PlanSaveDataSchema,
	PlanSaveDataType,
	PlanSchema,
	PlanSchemaType,
	PlanShareSchema,
	PlanShareSchemaType,
} from "@/features/api/schemas/planningData.schemas";

// Types & Interfaces
import { IPlan, IPlanShare } from "@/stores/planningStore.types";
import {
	IPlanCreateData,
	IPlanSaveData,
} from "@/features/planning_data/usePlan.types";

/**
 * Fetches data of a shared plans uuid from the API
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} sharedPlanUuid Shared Plan Uuid
 * @returns {Promise<IPlanShare>} Shared Plan Data
 */
export async function callGetShared(
	sharedPlanUuid: string
): Promise<IPlanShare> {
	return apiService.get<PlanShareSchemaType>(
		`/planning/shared/${sharedPlanUuid}`,
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
 * @returns {Promise<IPlan>} Plan Data
 */
export async function callGetPlan(planUuid: string): Promise<IPlan> {
	return apiService.get<PlanSchemaType>(
		`/planning/plan/${planUuid}`,
		PlanSchema
	);
}

/**
 * Gets all user plans
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<IPlan[]>} List of Plan Data
 */
export async function callGetPlanlist(): Promise<IPlan[]> {
	return apiService.get<PlanSchemaType[]>("/planning/plan/", PlanListPayload);
}

/**
 * Executes a Put request containing a new plans data towards
 * the backend API and returns its response
 * @author jplacht
 *
 * @export
 * @async
 * @param {IPlanCreateData} data Plan data to be created
 * @returns {Promise<PlanSaveCreateResponseType>}  Plan Uuid
 */
export async function callCreatePlan(
	data: IPlanCreateData
): Promise<PlanSaveCreateResponseType> {
	return apiService.post<PlanCreateDataType, PlanSaveCreateResponseType>(
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
 * @param {IPlanSaveData} data Plan Data to be stored
 * @returns {Promise<PlanSaveCreateResponseType>} Plan Uuid
 */
export async function callSavePlan(
	planUuid: string,
	data: IPlanSaveData
): Promise<PlanSaveCreateResponseType> {
	return apiService.put<PlanSaveDataType, PlanSaveCreateResponseType>(
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
 * @returns {Promise<IPlanCloneResponse>} Clone Message
 */
export async function callClonePlan(
	planUuid: string,
	cloneName: string
): Promise<IPlan> {
	return apiService.post<PlanClonePayloadType, PlanSchemaType>(
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
