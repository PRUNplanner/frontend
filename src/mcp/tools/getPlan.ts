import { z } from "zod";

// Util
import { calculate, loadPlanSetup } from "@/mcp/context";
import { defineTool, planDetails, uuidArg } from "@/mcp/tools/shared";

export const getPlan = defineTool({
	name: "get_plan",
	title: "Calculate a plan",
	description:
		"Calculates one base plan with PRUNplanner's plan engine, as its plan page does: buildings and recipes, workforce, area, material input/output per day with prices and price sources, revenue/cost/profit per day, production fees, degradation, construction cost, the construction materials of all buildings with prices, habs and storage (infrastructure), shipping per day (import/export weight and volume, days the storage holds), and ROI.",
	inputSchema: z.object({
		plan_uuid: uuidArg().describe("Plan (from list_plans)"),
		empire_uuid: uuidArg()
			.optional()
			.describe(
				"Empire to calculate in (faction, CX prices); default the one the plan page opens with"
			),
	}),
	async run({ plan_uuid, empire_uuid }, { backend, appUrl }) {
		const setup = await loadPlanSetup(backend, plan_uuid, empire_uuid);
		const details = planDetails(setup, calculate(setup), appUrl);
		const d = details.per_day;
		return {
			text: `${details.plan.name} on ${details.plan.planet}: profit ${d.profit} per day (revenue ${d.revenue}, cost ${d.cost}), construction cost ${d.construction_cost}.${details.note ? " " + details.note : ""}`,
			data: details,
		};
	},
});
