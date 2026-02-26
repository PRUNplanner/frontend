import { z } from "zod";

// Types & Interfaces
import { PLAN_FACTION_TYPE_ZOD_ENUM } from "@/features/api/schemas/planningData.schemas";
import { IEmpirePatchPayload } from "@/features/empire/empire.types";
import { IPlanEmpireJunction } from "@/features/manage/manage.types";

export const EmpirePatchPayload: z.ZodType<IEmpirePatchPayload> = z.object({
	empire_name: z.string(),
	empire_faction: z.preprocess(
		(val) => (typeof val === "string" ? val.toUpperCase() : val),
		PLAN_FACTION_TYPE_ZOD_ENUM
	) as z.ZodType<z.infer<typeof PLAN_FACTION_TYPE_ZOD_ENUM>>,
	empire_permits_used: z.number().int().min(1),
	empire_permits_total: z.number().int().min(2),
});

export const EmpireCreatePayload = z.object({
	empire_faction: z.preprocess(
		(val) => (typeof val === "string" ? val.toUpperCase() : val),
		PLAN_FACTION_TYPE_ZOD_ENUM
	) as z.ZodType<z.infer<typeof PLAN_FACTION_TYPE_ZOD_ENUM>>,
	empire_permits_used: z.number().int().min(1),
	empire_permits_total: z.number().int().min(2),
	empire_name: z.string(),
});
export type EmpirePatchPayloadType = z.infer<typeof EmpirePatchPayload>;
export type EmpireCreatePayloadType = z.infer<typeof EmpireCreatePayload>;

const EmpireJunctionSchema: z.ZodType<IPlanEmpireJunction> = z.object({
	empire_uuid: z.string().uuid(),
	baseplanners: z.array(z.object({ baseplanner_uuid: z.string().uuid() })),
});

export const EmpireJunctionPayloadSchema = z.array(EmpireJunctionSchema);
export type EmpireJunctionPayloadType = z.infer<
	typeof EmpireJunctionPayloadSchema
>;
