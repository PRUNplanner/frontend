import { apiService } from "@/lib/apiService";
import {
	APIKeyCreatePayloadSchema,
	APIKeyCreateResponseSchema,
	type APIKeyCreateResponse,
	APIKeyListSchema,
	type APIKey,
} from "@/features/api/schemas/apiKeysData.schemas";

export async function callGetAPIKeys(): Promise<APIKey[]> {
	return apiService.get("/user/api/keys/", APIKeyListSchema);
}

export async function callPostCreateAPIKey(
	apiKeyName: string
): Promise<APIKeyCreateResponse> {
	return apiService.post(
		"/user/api/keys/",
		{ name: apiKeyName },
		APIKeyCreatePayloadSchema,
		APIKeyCreateResponseSchema
	);
}

export async function callDeleteAPIKey(id: string): Promise<boolean> {
	return apiService.delete(`/user/api/keys/${id}/`);
}
