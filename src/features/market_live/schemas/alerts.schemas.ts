import { z } from "zod";

import type { RuleGroup } from "@/features/market_live/cxDetectors.types";

const DetectorSchema = z.object({
	field: z.string(),
	operator: z.enum(["gt", "lt", "eq", "neq", "matches"]),
	target: z.discriminatedUnion("type", [
		z.object({
			type: z.literal("static"),
			value: z.union([z.number(), z.string()]),
		}),
		z.object({ type: z.literal("previous") }),
		z.object({ type: z.literal("previous_pct"), offset: z.number() }),
	]),
});

// eslint-disable-next-line no-restricted-syntax -- recursive: a group holds groups
const RuleGroupSchema: z.ZodType<RuleGroup> = z.lazy(() =>
	z.object({
		operator: z.enum(["AND", "OR"]),
		conditions: z.array(z.union([DetectorSchema, RuleGroupSchema])),
	})
);

/** Market-live alert rules as stored in localStorage */
export const StoredAlertsSchema = z.object({
	userAlerts: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
			logic: RuleGroupSchema,
			enabled: z.boolean(),
		})
	),
});
