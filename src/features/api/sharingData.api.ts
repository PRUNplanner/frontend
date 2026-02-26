// services
import { apiService } from "@/lib/apiService";

// Schemas & Schema Types
import { z } from "zod";
import {
	ScharedListResponseType,
	SharedCloneResponseSchema,
	SharedCloneResponseType,
	SharedCreatePayloadSchema,
	SharedCreatePayloadType,
	SharedCreateResponseSchema,
	SharedCreateResponseType,
	SharedListResponseSchema,
} from "@/features/api/schemas/sharingData.schemas";

// Types & Interfaces
import {
	IShared,
	ISharedCloneResponse,
	ISharedCreateResponse,
} from "@/features/api/sharingData.types";

/**
 * Fetches all shared plan information for user from API
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<IShared[]>} List of Shared Plans
 */
export async function callGetSharedList(): Promise<IShared[]> {
	return apiService.get<ScharedListResponseType>(
		"/planning/shared/",
		SharedListResponseSchema
	);
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
	return apiService.delete(`/planning/shared/${sharedUuid}`);
}

/**
 * Creates a new sharing for plan
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} planUuid Plan Uuid
 * @returns {Promise<ISharedCreateResponse>} Sharing Information
 */
export async function callCreateSharing(
	planUuid: string
): Promise<ISharedCreateResponse> {
	return apiService.post<SharedCreatePayloadType, SharedCreateResponseType>(
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
): Promise<ISharedCloneResponse> {
	return apiService.put<null, SharedCloneResponseType>(
		`/planning/shared/${sharedUuid}/clone`,
		null,
		z.null(),
		SharedCloneResponseSchema
	);
}
