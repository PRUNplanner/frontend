import { z } from "zod";

// Types & Interfaces
import {
	PLAN_COGCPROGRAM_TYPE_ENUM,
	PLAN_FACTION_TYPE_ZOD_ENUM,
} from "@/features/api/schemas/planningData.schemas";
import {
	IEmpireMaterialIOState,
	IEmpirePatchPayload,
} from "@/features/empire/empire.types";
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

const MaterialValueSchema = z.object({
	p: z.number(),
	c: z.number(),
	d: z.number(),
});

export const EmpireMaterialIOStateSchema: z.ZodType<IEmpireMaterialIOState> =
	z.object({
		metadata: z.object({
			faction: PLAN_FACTION_TYPE_ZOD_ENUM,
			permits_used: z.number(),
			permits_total: z.number(),
			plan_count: z.number(),
			timestamp: z.iso.datetime(),
		}),

		empire_total: z.record(z.string(), MaterialValueSchema),

		plan_details: z.record(
			z.string(),
			z.object({
				metadata: z.object({
					planet_natural_id: z.string(),
					cogc: PLAN_COGCPROGRAM_TYPE_ENUM,
				}),
				deltas: z.record(z.string(), MaterialValueSchema),
			})
		),
	});

export type EmpireMaterialIOStateType = z.infer<
	typeof EmpireMaterialIOStateSchema
>;
