import { z } from "zod";

// Util
import { calculate, loadPlanSetup } from "@/mcp/context";
import {
	defineTool,
	detailArg,
	planDetails,
	PLAN_FULL_DETAIL,
	summarizeDetails,
	uuidArg,
} from "@/mcp/tools/shared";

export const getPlan = defineTool({
	name: "get_plan",
	alwaysLoad: true,
	title: "Calculate a plan",
	description:
		"Calculates one base plan with PRUNplanner's plan engine, as its plan page does: money per day (revenue, cost, profit, fees, degradation), construction cost, ROI, buildings with efficiency and recipes, net material flow, workforce, area, habs and storage, shipping per day (weight, volume, days the storage holds), COGC and warnings.",
	inputSchema: z.object({
		plan_uuid: uuidArg().describe("Plan (from list_plans)"),
		empire_uuid: uuidArg()
			.optional()
			.describe(
				"Empire to calculate in (faction, CX prices); default the one the plan page opens with"
			),
		detail: detailArg(PLAN_FULL_DETAIL),
	}),
	async run({ plan_uuid, empire_uuid, detail }, { backend, appUrl }) {
		const setup = await loadPlanSetup(backend, plan_uuid, empire_uuid);
		const details = planDetails(setup, calculate(setup), appUrl);
		const d = details.per_day;
		return {
			text: `${details.plan.name} on ${details.plan.planet}: profit ${d.profit} per day (revenue ${d.revenue}, cost ${d.cost}), construction cost ${d.construction_cost}.${details.note ? " " + details.note : ""}`,
			data: detail === "full" ? details : summarizeDetails(details),
		};
	},
});
