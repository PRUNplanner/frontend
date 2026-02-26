// services
import { apiService } from "@/lib/apiService";

// Schemas & Schema Types
import {
	PlanEmpireElementPayload,
	PlanEmpireElementPayloadType,
	PlanEmpirePlanListPayload,
	PlanEmpirePlanListType,
	PlanEmpireSchema,
	PlanEmpireSchemaType,
} from "@/features/api/schemas/planningData.schemas";
import {
	EmpireCreatePayload,
	EmpireCreatePayloadType,
	EmpireJunctionPayloadSchema,
	EmpireJunctionPayloadType,
	EmpirePatchPayload,
	EmpirePatchPayloadType,
} from "@/features/api/schemas/empireData.schemas";

// Types & Interfaces
import {
	IPlan,
	IPlanEmpire,
	IPlanEmpireElement,
} from "@/stores/planningStore.types";
import {
	IEmpireCreatePayload,
	IEmpirePatchPayload,
} from "@/features/empire/empire.types";
import { IPlanEmpireJunction } from "@/features/manage/manage.types";

/**
 * Gets all empires a user has defined
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<IPlanEmpireElement[]>} User Empire Array
 */
export async function callGetEmpireList(): Promise<IPlanEmpireElement[]> {
	return apiService.get<PlanEmpireElementPayloadType>(
		`planning/empire/`,
		PlanEmpireElementPayload
	);
}

/**
 * Gets all plans in a users empire
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} empireUuid Empire Uuid
 * @returns {Promise<IPlan[]>} List of plans in specified empire
 */
export async function callGetEmpirePlans(empireUuid: string): Promise<IPlan[]> {
	return await apiService.get<PlanEmpirePlanListType>(
		`planning/empire/${empireUuid}/plans`,
		PlanEmpirePlanListPayload
	);
}

/**
 * Updates data for specific empire
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} empireUuid Empire Uuid
 * @param {IEmpirePatchPayload} data Empire Patch data
 * @returns {Promise<IPlanEmpire>} Updated empire data
 */
export async function callPatchEmpire(
	empireUuid: string,
	data: IEmpirePatchPayload
): Promise<IPlanEmpire> {
	return apiService.put<EmpirePatchPayloadType, PlanEmpireSchemaType>(
		`planning/empire/${empireUuid}/`,
		data,
		EmpirePatchPayload,
		PlanEmpireSchema
	);
}

/**
 * Creates a new empire
 * @author jplacht
 *
 * @export
 * @async
 * @param {IEmpireCreatePayload} data Empire Configuration
 * @returns {Promise<IPlanEmpire>} Empire
 */
export async function callCreateEmpire(
	data: IEmpireCreatePayload
): Promise<IPlanEmpire> {
	return apiService.post<EmpireCreatePayloadType, PlanEmpireSchemaType>(
		"/planning/empire/",
		data,
		EmpireCreatePayload,
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
 * @returns {Promise<boolean>} Deletion Status
 */
export async function callDeleteEmpire(empireUuid: string): Promise<boolean> {
	return apiService.delete(`/planning/empire/${empireUuid}/`);
}

export async function callPatchEmpirePlanJunctions(
	junctions: IPlanEmpireJunction[]
): Promise<IPlanEmpireElement[]> {
	return apiService.post<
		EmpireJunctionPayloadType,
		PlanEmpireElementPayloadType
	>(
		"/planning/empire/junctions/",
		junctions,
		EmpireJunctionPayloadSchema,
		PlanEmpireElementPayload
	);
}
