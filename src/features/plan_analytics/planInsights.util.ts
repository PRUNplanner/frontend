// Types & Interfaces
import {
	type ExpertType,
	ExpertTypeSchema,
} from "@/features/api/schemas/planningData.schemas";
import type { AnalyticsPlanetInsightsData } from "@/features/api/schemas/analyticsData.schemas";

/** buildings the starter card lists, most planned first */
export const STARTER_MAX_BUILDINGS = 8;
/** buildings in at least this % of plans start checked */
export const STARTER_PRESELECT_PERCENTAGE = 20;
/** expert types in at least this % of plans are added */
const STARTER_EXPERT_PERCENTAGE = 50;
// the expert limits of PlanExperts
const MAX_EXPERTS_PER_TYPE = 5;
const MAX_EXPERTS_TOTAL = 6;

/**
 * Colour of a segment in an insights split bar, the first one in the
 * brand colour
 *
 * @param {number} index Segment index
 * @returns {string} Tailwind background class
 */
export function segmentColor(index: number): string {
	const colors = [
		"bg-prunplanner",
		"bg-white",
		"bg-white/80",
		"bg-white/60",
		"bg-white/40",
		"bg-white/20",
		"bg-white/10",
	];
	return colors[index] || colors[colors.length - 1];
}

/**
 * The experts a typical setup adds: types in at least half of the
 * planet's plans with their median amount, within the expert limits
 * (most planned types first)
 *
 * @param experts v2 experts of the planet insights
 * @returns Expert types and amounts
 */
export function starterExperts(
	experts: AnalyticsPlanetInsightsData["insights_data"]["experts"]
): { type: ExpertType; amount: number }[] {
	let left = MAX_EXPERTS_TOTAL;
	return [...experts]
		.sort((a, b) => b.plans_percentage - a.plans_percentage)
		.flatMap((e) => {
			const type = ExpertTypeSchema.safeParse(e.type);
			if (!type.success || e.plans_percentage < STARTER_EXPERT_PERCENTAGE)
				return [];
			const amount = Math.min(
				Math.round(e.median_amount),
				MAX_EXPERTS_PER_TYPE,
				left
			);
			left -= amount;
			return amount > 0 ? [{ type: type.data, amount }] : [];
		});
}
