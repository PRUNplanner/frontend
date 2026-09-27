// services
import { apiService } from "@/lib/apiService";

// Schemas & Schema Types
import {
	CXEmpireJunctionListSchema,
	CXListSchema,
	CXPutSchema,
	CXSchema,
} from "@/features/api/schemas/cxData.schemas";

// Types & Interfaces
import type {
	CX,
	CXData,
	CXEmpireJunction,
} from "@/features/api/schemas/cxData.schemas";

/**
 * Gets all cx preferences a user has defined
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<CX[]>} CX Preference Array
 */
export async function callGetCXList(): Promise<CX[]> {
	return apiService.get(`/planning/cx/`, CXListSchema);
}

/**
 * Creates a new CX preference in backend
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} cxName CX Name
 * @returns {Promise<CX>} Created CX data
 */
export async function callCreateCX(cxName: string): Promise<CX> {
	return apiService.post(
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
 * @param {CXEmpireJunction[]} junctions Junctions
 * @returns {Promise<CX[]>} CX data
 */
export async function callUpdateCXJunctions(
	junctions: CXEmpireJunction[]
): Promise<CX[]> {
	return apiService.post(
		"/planning/cx/junctions/",
		junctions,
		CXEmpireJunctionListSchema,
		CXListSchema
	);
}

/**
 * Patches an existing CX with new data
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} cxUuid CX Uuid
 * @param {CXData} data CX Preference Data
 * @returns {Promise<CXData>} Updated CX Preference Data
 */
export async function callPatchCX(
	cxName: string,
	cxUuid: string,
	data: CXData
): Promise<CX> {
	return apiService.put(
		`/planning/cx/${cxUuid}/`,
		{
			cx_name: cxName,
			cx_data: data,
		},
		CXPutSchema,
		CXSchema
	);
}
