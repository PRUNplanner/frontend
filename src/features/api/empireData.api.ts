// services
import { apiService } from "@/lib/apiService";

// Schemas & Schema Types
import {
	PlanEmpireSchema,
	PlanListSchema,
	EmpireMaterialIOStateSchema,
	EmpirePayloadSchema,
	EmpireSaveResponseSchema,
	PlanEmpireElementListSchema,
	PlanEmpireJunctionListSchema,
} from "@prunplanner/engine/schemas";

// Types & Interfaces
import type {
	Plan,
	PlanEmpire,
	EmpireMaterialIOState,
	EmpirePayload,
	EmpireSaveResponse,
	PlanEmpireElement,
	PlanEmpireJunction,
} from "@prunplanner/engine/schemas";

/**
 * Gets all empires a user has defined
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<PlanEmpireElement[]>} User Empire Array
 */
export async function callGetEmpireList(): Promise<PlanEmpireElement[]> {
	return apiService.get(`planning/empire/`, PlanEmpireElementListSchema);
}

/**
 * Gets all plans in a users empire
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} empireUuid Empire Uuid
 * @returns {Promise<Plan[]>} List of plans in specified empire
 */
export async function callGetEmpirePlans(empireUuid: string): Promise<Plan[]> {
	return await apiService.get(
		`planning/empire/${empireUuid}/plans/`,
		PlanListSchema
	);
}

/**
 * Updates data for specific empire
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} empireUuid Empire Uuid
 * @param {EmpirePayload} data Empire Patch data
 * @returns {Promise<EmpireSaveResponse>} Updated empire data
 */
export async function callPatchEmpire(
	empireUuid: string,
	data: EmpirePayload
): Promise<EmpireSaveResponse> {
	return apiService.put(
		`planning/empire/${empireUuid}/`,
		data,
		EmpirePayloadSchema,
		EmpireSaveResponseSchema
	);
}

/**
 * Creates a new empire
 * @author jplacht
 *
 * @export
 * @async
 * @param {EmpirePayload} data Empire Configuration
 * @returns {Promise<PlanEmpire>} Empire
 */
export async function callCreateEmpire(
	data: EmpirePayload
): Promise<PlanEmpire> {
	return apiService.post(
		"/planning/empire/",
		data,
		EmpirePayloadSchema,
		PlanEmpireSchema
	);
}

/**
 * Deletes an existing empire
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} empireUuid Empire Uuid
 * @returns {Promise<void>} Resolves once deleted
 */
export async function callDeleteEmpire(empireUuid: string): Promise<void> {
	return apiService.delete(`/planning/empire/${empireUuid}/`);
}

export async function callPatchEmpirePlanJunctions(
	junctions: PlanEmpireJunction[]
): Promise<PlanEmpireElement[]> {
	return apiService.post(
		"/planning/empire/junctions/",
		junctions,
		PlanEmpireJunctionListSchema,
		PlanEmpireElementListSchema
	);
}

export async function callPatchEmpireState(
	empireUuid: string,
	empireState: EmpireMaterialIOState
): Promise<PlanEmpire> {
	return apiService.patch(
		`/planning/empire/${empireUuid}/state/`,
		empireState,
		EmpireMaterialIOStateSchema,
		PlanEmpireSchema
	);
}
