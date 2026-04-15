import { z } from "zod";

const AnalyticsPlanetInsightsRecipeSchema = z.object({
	recipe_id: z.string(),
	percentage: z.number(),
});

// Schema with Aggregated Data
const AnalyticsPlanetInsightsDataSchema = z.object({
	status: z.literal("success"),
	planet_natural_id: z.string(),
	total_plans_analyzed: z.number().min(15),
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
	}),
	last_updated: z.iso.datetime(),
});

// Schema for valid planet, but no data available
const AnalyticsPlanetInsightsEmptySchema = z.object({
	status: z.literal("below_threshold"),
	planet_natural_id: z.string(),
	total_plans_analyzed: z.literal(0),
	insights_data: z.undefined(),
});

// discriminated union via status of response
export const AnalyticsPlanetInsightsPayloadSchema = z.discriminatedUnion(
	"status",
	[AnalyticsPlanetInsightsDataSchema, AnalyticsPlanetInsightsEmptySchema]
);

export type AnalyticsPlanetInsightsRecipeType = z.infer<
	typeof AnalyticsPlanetInsightsRecipeSchema
>;

export type AnalyticsPlanetInsightsDataType = z.infer<
	typeof AnalyticsPlanetInsightsDataSchema
>;
export type AnalyticsPlanetInsightsPayloadType = z.infer<
	typeof AnalyticsPlanetInsightsPayloadSchema
>;
