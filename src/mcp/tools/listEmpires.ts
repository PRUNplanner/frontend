import { z } from "zod";

// Util
import { findEmpireCX, getCXs, getEmpires } from "@/mcp/context";
import { defineTool, empireUrl, plural } from "@/mcp/tools/shared";

// Schemas
import { UserProfileSchema } from "@/features/api/schemas/user.schemas";

const KEY_PAGE = "https://prunplanner.org/apikey";

export const listEmpires = defineTool({
	name: "list_empires",
	title: "List empires",
	description:
		"Lists the user's PRUNplanner empires (groups of base plans) with faction, CX price preference and plan count, and whether the API key can change data. Start here to find empire_uuid values.",
	inputSchema: z.object({}),
	async run(_args, { backend, appUrl }) {
		const [empires, cxs, access] = await Promise.all([
			getEmpires(backend),
			getCXs(backend),
			// the key's access, as the profile reports it; unknown on a
			// backend without the field or when the profile can't be read
			backend
				.get("/user/profile/", UserProfileSchema)
				.then((p) => p.api_key_scope ?? null)
				.catch(() => null),
		]);
		const list = empires.map((e) => ({
			uuid: e.uuid,
			name: e.empire_name,
			faction: e.empire_faction,
			cx_preference: findEmpireCX(cxs, e.uuid)?.cx_name ?? null,
			plan_count: e.plans.length,
			url: empireUrl(appUrl, e.uuid),
		}));
		const keyText =
			access === "read_write"
				? "API key: read & write (the write tools can save)."
				: access === "read"
					? `API key: read-only (reads and calculates; to save, the user creates a read & write key at ${KEY_PAGE}).`
					: "";
		return {
			text: `${plural(list.length, "empire")}: ${list.map((e) => `${e.name} (${plural(e.plan_count, "plan")})`).join(", ")}${keyText ? `. ${keyText}` : ""}`,
			data: { api_key_access: access, empires: list },
		};
	},
});
