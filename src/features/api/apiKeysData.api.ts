import { apiService } from "@/lib/apiService";
import {
	APIKeyCreatePayloadSchema,
	APIKeyCreateResponseSchema,
	type APIKeyCreateResponse,
	APIKeyListSchema,
	type APIKey,
	type APIKeyScope,
} from "@/features/api/schemas/apiKeysData.schemas";

export async function callGetAPIKeys(): Promise<APIKey[]> {
	return apiService.get("/user/api/keys/", APIKeyListSchema);
}

export async function callPostCreateAPIKey(
	apiKeyName: string,
	scope: APIKeyScope
): Promise<APIKeyCreateResponse> {
	return apiService.post(
		"/user/api/keys/",
		{ name: apiKeyName, scope },
		APIKeyCreatePayloadSchema,
		APIKeyCreateResponseSchema
	);
}

export async function callDeleteAPIKey(id: string): Promise<void> {
	return apiService.delete(`/user/api/keys/${id}/`);
}
