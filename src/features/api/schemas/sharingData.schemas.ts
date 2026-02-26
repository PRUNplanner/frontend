import { z } from "zod";

// Types & Interfaces
import {
	IShared,
	ISharedCloneResponse,
	ISharedCreatePayload,
	ISharedCreateResponse,
} from "@/features/api/sharingData.types";

// Util
import { PositiveOrZeroNumber } from "@/util/zodValidators";

const SharedSchema: z.ZodType<IShared> = z.object({
	uuid: z.uuid(),
	plan: z.uuid(),
	view_count: PositiveOrZeroNumber,
	created_at: z.coerce.date(),
});

export const SharedListResponseSchema = z.array(SharedSchema);
export type ScharedListResponseType = z.infer<typeof SharedListResponseSchema>;

export const SharedCreateResponseSchema: z.ZodType<ISharedCreateResponse> =
	z.object({
		uuid: z.uuid(),
		created_at: z.coerce.date(),
		view_count: PositiveOrZeroNumber,
	});

export type SharedCreateResponseType = z.infer<
	typeof SharedCreateResponseSchema
>;

export const SharedCloneResponseSchema: z.ZodType<ISharedCloneResponse> =
	z.object({ message: z.string() });

export type SharedCloneResponseType = z.infer<typeof SharedCloneResponseSchema>;

export const SharedCreatePayloadSchema: z.ZodType<ISharedCreatePayload> =
	z.object({ plan: z.uuid() });
export type SharedCreatePayloadType = z.infer<typeof SharedCreatePayloadSchema>;
