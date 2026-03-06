// services
import { apiService } from "@/lib/apiService";

// Schemas & Schema Types
import {
	CXListPayloadSchema,
	CXListPayloadSchemaType,
	CXPutSchema,
	CXPutType,
	CXSchema,
	CXSchemaType,
} from "@/features/api/schemas/planningData.schemas";
import {
	CXEmpireJunctionSchemaPayload,
	CXEmpireJunctionSchemaPayloadType,
} from "@/features/api/schemas/cxData.schemas";

// Types & Interfaces
import { ICX, ICXData } from "@/stores/planningStore.types";
import { ICXEmpireJunction } from "@/features/manage/manage.types";

/**
 * Gets all cx preferences a user has defined
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<ICX[]>} CX Preference Array
 */
export async function callGetCXList(): Promise<ICX[]> {
	return apiService.get<CXListPayloadSchemaType>(
		`/planning/cx/`,
		CXListPayloadSchema
	);
}

/**
 * Creates a new CX preference in backend
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} cxName CX Name
 * @returns {Promise<ICX>} Created CX data
 */
export async function callCreateCX(cxName: string): Promise<ICX> {
	return apiService.post<CXPutType, CXSchemaType>(
		"/planning/cx/",
		{
			cx_name: cxName,
			cx_data: {
				cx_empire: [],
				cx_planets: [],
				ticker_empire: [],
				ticker_planets: [],
			},
		},
		CXPutSchema,
		CXSchema
	);
}

/**
 * Deletes CX from backend
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} cxUuid CX Uuid
 * @returns {Promise<boolean>} Deletion status
 */
export async function callDeleteCX(cxUuid: string): Promise<boolean> {
	return apiService.delete(`/planning/cx/${cxUuid}/`);
}

/**
 * Updates Empire-CX junctions
 * @author jplacht
 *
 * @export
 * @async
 * @param {ICXEmpireJunction[]} junctions Junctions
 * @returns {Promise<ICX[]>} CX data
 */
export async function callUpdateCXJunctions(
	junctions: ICXEmpireJunction[]
): Promise<ICX[]> {
	return apiService.post<
		CXEmpireJunctionSchemaPayloadType,
		CXListPayloadSchemaType
	>(
		"/planning/cx/junctions/",
		junctions,
		CXEmpireJunctionSchemaPayload,
		CXListPayloadSchema
	);
}

/**
 * Patches an existing CX with new data
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} cxUuid CX Uuid
 * @param {ICXData} data CX Preference Data
 * @returns {Promise<ICXData>} Updated CX Preference Data
 */
export async function callPatchCX(
	cxName: string,
	cxUuid: string,
	data: ICXData
): Promise<ICX> {
	return apiService.put<CXPutType, CXSchemaType>(
		`/planning/cx/${cxUuid}/`,
		{
			cx_name: cxName,
			cx_data: data,
		},
		CXPutSchema,
		CXSchema
	);
}
