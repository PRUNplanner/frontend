import { z } from "zod";

// read: GET only; read_write: also changes data. No key manages keys or the account
export const APIKeyScopeSchema = z.enum(["read", "read_write"]);
export type APIKeyScope = z.infer<typeof APIKeyScopeSchema>;

export const APIKeySchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	prefix: z.string().min(1),
	scope: APIKeyScopeSchema,
	created: z.coerce.date(),
	last_used: z.coerce.date().nullable(),
});
export type APIKey = z.infer<typeof APIKeySchema>;

export const APIKeyCreateResponseSchema = APIKeySchema.pick({
	id: true,
	name: true,
	prefix: true,
	scope: true,
}).extend({ api_key: z.string().min(1) });
export type APIKeyCreateResponse = z.infer<typeof APIKeyCreateResponseSchema>;

export const APIKeyCreatePayloadSchema = APIKeySchema.pick({
	name: true,
	scope: true,
});
export type APIKeyCreatePayload = z.input<typeof APIKeyCreatePayloadSchema>;

export const APIKeyListSchema = z.array(APIKeySchema);
