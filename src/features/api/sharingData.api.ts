// services
import { apiService } from "@/lib/apiService";

// Schemas & Schema Types
import { z } from "zod";
import {
	SharedCloneResponseSchema,
	SharedCreatePayloadSchema,
	SharedCreateResponseSchema,
	SharedListResponseSchema,
	type Shared,
	type SharedCloneResponse,
	type SharedCreateResponse,
} from "@/features/api/schemas/sharingData.schemas";

/**
 * Fetches all shared plan information for user from API
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<Shared[]>} List of Shared Plans
 */
export async function callGetSharedList(): Promise<Shared[]> {
	return apiService.get("/planning/shared/", SharedListResponseSchema);
}

/**
 * Deletes an existing plan sharing
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} sharedUuid Sharing Uuid
 * @returns {Promise<boolean>} Deletion Status
 */
export async function callDeleteSharing(sharedUuid: string): Promise<boolean> {
	return apiService.delete(`/planning/shared/${sharedUuid}/`);
}

/**
 * Creates a new sharing for plan
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} planUuid Plan Uuid
 * @returns {Promise<SharedCreateResponse>} Sharing Information
 */
export async function callCreateSharing(
	planUuid: string
): Promise<SharedCreateResponse> {
	return apiService.post(
		`/planning/shared/`,
		{
			plan: planUuid,
		},
		SharedCreatePayloadSchema,
		SharedCreateResponseSchema
	);
}

export async function callCloneSharedPlan(
	sharedUuid: string
): Promise<SharedCloneResponse> {
	return apiService.post(
		`/planning/shared/${sharedUuid}/clone/`,
		null,
		z.null(),
		SharedCloneResponseSchema
	);
}
