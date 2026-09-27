import { z } from "zod";

import {
	PLAN_COGCPROGRAM_TYPE_ENUM,
	PlanFactionSchema,
	PlanEmpireFactionSchema,
	PlanEmpireSchema,
} from "@/features/api/schemas/planningData.schemas";

export const PlanEmpireElementSchema = PlanEmpireSchema.extend({
	plans: z.array(
		z.object({
			uuid: z.uuid(),
			plan_name: z.string(),
			planet_natural_id: z.string(),
		})
	),
});
export type PlanEmpireElement = z.infer<typeof PlanEmpireElementSchema>;

export const PlanEmpireElementListSchema = z.array(PlanEmpireElementSchema);

// Create and patch send the same body.
export const EmpirePayloadSchema = z.object({
	empire_name: z.string(),
	empire_faction: PlanEmpireFactionSchema,
	empire_permits_used: z.number().int().min(1),
	empire_permits_total: z.number().int().min(2),
});
export type EmpirePayload = z.input<typeof EmpirePayloadSchema>;

const PlanEmpireJunctionSchema = z.object({
	empire_uuid: z.string().uuid(),
	baseplanners: z.array(z.object({ baseplanner_uuid: z.string().uuid() })),
});
export type PlanEmpireJunction = z.input<typeof PlanEmpireJunctionSchema>;

export const PlanEmpireJunctionListSchema = z.array(PlanEmpireJunctionSchema);

const MaterialValueSchema = z.object({
	p: z.number(),
	c: z.number(),
	d: z.number(),
});

export const EmpireMaterialIOStateSchema = z.object({
	metadata: z.object({
		faction: PlanFactionSchema,
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
export type EmpireMaterialIOState = z.input<typeof EmpireMaterialIOStateSchema>;
