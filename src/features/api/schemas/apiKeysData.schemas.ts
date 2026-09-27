import { z } from "zod";

export const APIKeySchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	prefix: z.string().min(1),
	created: z.coerce.date(),
	last_used: z.coerce.date().nullable(),
});
export type APIKey = z.infer<typeof APIKeySchema>;

export const APIKeyCreateResponseSchema = APIKeySchema.pick({
	id: true,
	name: true,
	prefix: true,
}).extend({ api_key: z.string().min(1) });
export type APIKeyCreateResponse = z.infer<typeof APIKeyCreateResponseSchema>;

export const APIKeyCreatePayloadSchema = APIKeySchema.pick({ name: true });
export type APIKeyCreatePayload = z.input<typeof APIKeyCreatePayloadSchema>;

export const APIKeyListSchema = z.array(APIKeySchema);
