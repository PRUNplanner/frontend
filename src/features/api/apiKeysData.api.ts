import { apiService } from "@/lib/apiService";
import {
	APIKeyCreatePayloadSchema,
	APIKeyCreatePayloadType,
	APIKeyCreateResponseSchema,
	APIKeyCreateResponseType,
	APIKeyListSchema,
	APIKeyListType,
} from "@/features/api/schemas/apiKeysData.schema";

export async function callGetAPIKeys(): Promise<APIKeyListType> {
	return apiService.get<APIKeyListType>("/user/api/keys/", APIKeyListSchema);
}

export async function callPostCreateAPIKey(
	apiKeyName: string
): Promise<APIKeyCreateResponseType> {
	return apiService.post<APIKeyCreatePayloadType, APIKeyCreateResponseType>(
		"/user/api/keys/",
		{ name: apiKeyName },
		APIKeyCreatePayloadSchema,
		APIKeyCreateResponseSchema
	);
}

export async function callDeleteAPIKey(id: string): Promise<boolean> {
	return apiService.delete(`/user/api/keys/${id}/`);
}
