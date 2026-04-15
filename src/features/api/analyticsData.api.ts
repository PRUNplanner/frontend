import { apiService } from "@/lib/apiService";
import {
	AnalyticsPlanetInsightsPayloadSchema,
	AnalyticsPlanetInsightsPayloadType,
} from "@/features/api/schemas/analyticsData.schemas";

export async function callAnalyticsPlanetInsights(
	planetNaturalId: string
): Promise<AnalyticsPlanetInsightsPayloadType> {
	return apiService.get<AnalyticsPlanetInsightsPayloadType>(
		`/analytics/planet_insights/${planetNaturalId}/`,
		AnalyticsPlanetInsightsPayloadSchema
	);
}
