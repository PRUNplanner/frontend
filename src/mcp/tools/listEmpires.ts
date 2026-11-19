import { z } from "zod";

// Util
import { findEmpireCX, getCXs, getEmpires } from "@/mcp/context";
import { defineTool, empireUrl, plural } from "@/mcp/tools/shared";

export const listEmpires = defineTool({
	name: "list_empires",
	title: "List empires",
	description:
		"Lists the user's PRUNplanner empires (groups of base plans) with faction, CX price preference and plan count. Start here to find empire_uuid values.",
	inputSchema: z.object({}),
	async run(_args, { backend, appUrl }) {
		const [empires, cxs] = await Promise.all([
			getEmpires(backend),
			getCXs(backend),
		]);
		const list = empires.map((e) => ({
			uuid: e.uuid,
			name: e.empire_name,
			faction: e.empire_faction,
			cx_preference: findEmpireCX(cxs, e.uuid)?.cx_name ?? null,
			plan_count: e.plans.length,
			url: empireUrl(appUrl, e.uuid),
		}));
		return {
			text: `${plural(list.length, "empire")}: ${list.map((e) => `${e.name} (${plural(e.plan_count, "plan")})`).join(", ")}`,
			data: { empires: list },
		};
	},
});
