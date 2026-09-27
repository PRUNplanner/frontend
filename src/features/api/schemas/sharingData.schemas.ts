import { z } from "zod";

// Util
import { PositiveOrZeroNumber } from "@/util/zodValidators";

export const SharedSchema = z.object({
	uuid: z.uuid(),
	plan: z.uuid(),
	view_count: PositiveOrZeroNumber,
	created_at: z.coerce.date(),
});
export type Shared = z.infer<typeof SharedSchema>;

export const SharedListResponseSchema = z.array(SharedSchema);

export const SharedCreateResponseSchema = SharedSchema.omit({ plan: true });
export type SharedCreateResponse = z.infer<typeof SharedCreateResponseSchema>;

export const SharedCloneResponseSchema = z.object({
	uuid: z.string().uuid(),
	plan_name: z.string(),
});
export type SharedCloneResponse = z.infer<typeof SharedCloneResponseSchema>;

export const SharedCreatePayloadSchema = SharedSchema.pick({ plan: true });
