import { z } from "zod";

const AnalyticsPlanetInsightsRecipeSchema = z.object({
	recipe_id: z.string(),
	percentage: z.number(),
});

// v2 (insights-01a): only items planned by enough plans and players
const AnalyticsPlanetInsightsBuildingSchema = z.object({
	ticker: z.string(),
	plans: z.number(),
	users: z.number(),
	percentage: z.number(),
	median_amount: z.number(),
	recipes: z.array(
		z.object({
			recipe_id: z.string(),
			plans: z.number(),
			percentage: z.number(),
			median_amount: z.number(),
		})
	),
	mixes: z.array(
		z.object({
			recipe_ids: z.array(z.string()),
			plans: z.number(),
			percentage: z.number(),
			median_building_amount: z.number(),
			recipe_amounts: z.record(z.string(), z.number()),
		})
	),
});

// Schema with Aggregated Data
const AnalyticsPlanetInsightsDataSchema = z.object({
	status: z.literal("success"),
	planet_natural_id: z.string(),
	total_plans_analyzed: z.number().min(15),
	// rows written before the first v2 run lack the v2 keys
	total_users: z.number().default(0),
	insights_data: z.object({
		expert_distribution: z.array(
			z.object({
				type: z.string(),
				percentage: z.number(),
			})
		),
		building_distribution: z.array(
			z.object({
				ticker: z.string(),
				percentage: z.number(),
			})
		),
		recipe_distribution: z.record(
			z.string(),
			z.array(AnalyticsPlanetInsightsRecipeSchema)
		),
		buildings: z.array(AnalyticsPlanetInsightsBuildingSchema).default([]),
		experts: z
			.array(
				z.object({
					type: z.string(),
					plans_percentage: z.number(),
					median_amount: z.number(),
				})
			)
			.default([]),
	}),
	last_updated: z.iso.datetime(),
});

// Schema for valid planet, but no data available
const AnalyticsPlanetInsightsEmptySchema = z.object({
	status: z.literal("below_threshold"),
	planet_natural_id: z.string(),
	total_plans_analyzed: z.literal(0),
	// JSON has no undefined, the key is missing or null
	insights_data: z.null().optional(),
});

// discriminated union via status of response
export const AnalyticsPlanetInsightsPayloadSchema = z.discriminatedUnion(
	"status",
	[AnalyticsPlanetInsightsDataSchema, AnalyticsPlanetInsightsEmptySchema]
);

export type AnalyticsPlanetInsightsRecipe = z.infer<
	typeof AnalyticsPlanetInsightsRecipeSchema
>;

export type AnalyticsPlanetInsightsBuilding = z.infer<
	typeof AnalyticsPlanetInsightsBuildingSchema
>;
export type AnalyticsPlanetInsightsData = z.infer<
	typeof AnalyticsPlanetInsightsDataSchema
>;
export type AnalyticsPlanetInsightsPayload = z.infer<
	typeof AnalyticsPlanetInsightsPayloadSchema
>;
