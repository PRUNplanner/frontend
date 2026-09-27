import { apiService } from "@/lib/apiService";
import {
	AnalyticsPlanetInsightsPayloadSchema,
	type AnalyticsPlanetInsightsPayload,
} from "@/features/api/schemas/analyticsData.schemas";

export async function callAnalyticsPlanetInsights(
	planetNaturalId: string
): Promise<AnalyticsPlanetInsightsPayload> {
	return apiService.get(
		`/analytics/planet_insights/${planetNaturalId}/`,
		AnalyticsPlanetInsightsPayloadSchema
	);
}
