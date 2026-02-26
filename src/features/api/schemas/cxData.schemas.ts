import { z } from "zod";

// Types & Interfaces
import { ICXEmpireJunction } from "@/features/manage/manage.types";

const CXEmpireJunctionSchema: z.ZodType<ICXEmpireJunction> = z.object({
	cx_uuid: z.uuid(),
	empires: z.array(z.object({ empire_uuid: z.uuid() })),
});

export const CXEmpireJunctionSchemaPayload = z.array(CXEmpireJunctionSchema);
export type CXEmpireJunctionSchemaPayloadType = z.infer<
	typeof CXEmpireJunctionSchemaPayload
>;
