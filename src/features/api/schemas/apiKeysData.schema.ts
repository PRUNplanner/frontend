import { z } from "zod";

export const APIKeySchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	prefix: z.string().min(1),
	created: z.coerce.date(),
	last_used: z.coerce.date().nullable(),
});

export const APIKeyCreateResponseSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	api_key: z.string().min(1),
	prefix: z.string().min(1),
});

export const APIKeyCreatePayloadSchema = z.object({
	name: z.string().min(1),
});

export const APIKeyListSchema = z.array(APIKeySchema);

export type APIKeyListType = z.infer<typeof APIKeyListSchema>;

export type APIKeyCreatePayloadType = z.infer<typeof APIKeyCreatePayloadSchema>;
export type APIKeyCreateResponseType = z.infer<
	typeof APIKeyCreateResponseSchema
>;
