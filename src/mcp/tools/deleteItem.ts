import { z } from "zod";

// Util
import { getCXs, getEmpires, getPlan } from "@/mcp/context";
import { ToolError } from "@/mcp/backend";
import { defineTool, plural, uuidArg } from "@/mcp/tools/shared";
import { getShares, shareUrl } from "@/mcp/tools/sharing";
import { storeEmpireStates } from "@/mcp/empireState";

// Schemas
import { PlanVersionListSchema } from "@/features/api/schemas/planningData.schemas";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";

const PATHS = {
	plan: "/planning/plan/",
	empire: "/planning/empire/",
	cx_preference: "/planning/cx/",
	share: "/planning/shared/",
} as const;
type Kind = keyof typeof PATHS;

/**
 * What deleting would remove, in words, and the empires whose production
 * changes; throws for an unknown uuid
 */
async function describe(
	b: IBackend,
	kind: Kind,
	uuid: string,
	appUrl: string
): Promise<{ what: string; empires?: string[] }> {
	if (kind === "plan") {
		const [plan, versions] = await Promise.all([
			getPlan(b, uuid),
			b.get(`/planning/plan/${uuid}/versions/`, PlanVersionListSchema),
		]);
		const empires = (plan.empires ?? []).map((e) => e.empire_name);
		return {
			empires: (plan.empires ?? []).map((e) => e.uuid),
			what: `the plan "${plan.plan_name}" on ${plan.planet_natural_id}${empires.length ? `, taken out of ${empires.join(", ")}` : ""}, with its ${plural(versions.length, "saved version")} and any share link. This can't be undone.`,
		};
	}
	if (kind === "empire") {
		const empire = (await getEmpires(b)).find((e) => e.uuid === uuid);
		if (!empire) throw new ToolError(`Unknown empire ${uuid}.`);
		return {
			what: `the empire "${empire.empire_name}". Its ${plural(empire.plans.length, "plan")} stay, just no longer in this empire. This can't be undone.`,
		};
	}
	if (kind === "cx_preference") {
		const cx = (await getCXs(b)).find((c) => c.uuid === uuid);
		if (!cx) throw new ToolError(`Unknown CX preference ${uuid}.`);
		const users = cx.empires.map((e) => e.empire_name);
		return {
			what: `the CX preference "${cx.cx_name}"${users.length ? `; ${users.join(", ")} will be priced at Universe VWAP 30D until given another` : ""}. This can't be undone.`,
		};
	}
	const share = (await getShares(b)).find((s) => s.uuid === uuid);
	if (!share) throw new ToolError(`Unknown share ${uuid}.`);
	const plan = await getPlan(b, share.plan).catch(() => undefined);
	return {
		what: `the share link ${shareUrl(appUrl, uuid)}${plan ? ` of "${plan.plan_name}"` : ""} (${plural(share.view_count, "view")}); it stops working, the plan stays. Sharing again makes a new link.`,
	};
}

export const deleteItem = defineTool({
	name: "delete",
	title: "Delete a plan, empire, CX preference or share link",
	write: "delete",
	description:
		"Deletes a plan, an empire, a CX preference or a share link. The first call deletes nothing: it returns what would be deleted. Show that to the user, and only when they agree call again with confirm: true. A deleted plan loses all its versions; deleting an empire keeps its plans.",
	inputSchema: z.object({
		kind: z.enum(["plan", "empire", "cx_preference", "share"]),
		uuid: uuidArg(),
		confirm: z
			.boolean()
			.optional()
			.describe("true deletes; only after the user agreed"),
	}),
	async run({ kind, uuid, confirm }, { backend, appUrl }) {
		const { what, empires } = await describe(backend, kind, uuid, appUrl);
		if (!confirm)
			return {
				text: `Nothing deleted yet. This would delete ${what} Ask the user; if they agree, call delete again with confirm: true.`,
				data: { deleted: false, kind, uuid, would_delete: what },
			};
		await backend.send("DELETE", `${PATHS[kind]}${uuid}/`, null, null);
		// its empires produce less now: stored as the Empire page does
		const stale = await storeEmpireStates(backend, empires ?? []);
		return {
			text: `Deleted ${what}${stale ? ` ${stale}` : ""}`,
			data: {
				deleted: true,
				kind,
				uuid,
				what,
				reload_hint:
					"If PRUNplanner is open, reload the page to see the change.",
			},
		};
	},
});
