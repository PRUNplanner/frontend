import { z } from "zod";

// Util
import { getCXs, getEmpires } from "@/mcp/context";
import { ToolError } from "@/mcp/backend";
import { defineTool, uuidArg } from "@/mcp/tools/shared";

// Schemas
import {
	UserPreferencePatchSchema,
	UserPreferenceSchema,
} from "@/features/api/schemas/user.schemas";

export const setPreferences = defineTool({
	name: "set_preferences",
	title: "Set planning defaults",
	write: "save",
	overwrites: true,
	description:
		"Sets the user's planning defaults in PRUNplanner: the default empire (what the app opens and what tools without a saved plan calculate in), the default CX preference, and whether new plans buy items from the CX. null clears a default. Only the given settings change.",
	inputSchema: z.object({
		default_empire_uuid: uuidArg().nullable().optional(),
		default_cx_uuid: uuidArg().nullable().optional(),
		buy_items_from_cx: z.boolean().optional(),
	}),
	async run(args, { backend }) {
		const [empires, cxs] = await Promise.all([
			getEmpires(backend),
			getCXs(backend),
		]);
		const empire = args.default_empire_uuid
			? empires.find((e) => e.uuid === args.default_empire_uuid)
			: undefined;
		if (args.default_empire_uuid && !empire)
			throw new ToolError(`Unknown empire ${args.default_empire_uuid}.`);
		const cx = args.default_cx_uuid
			? cxs.find((c) => c.uuid === args.default_cx_uuid)
			: undefined;
		if (args.default_cx_uuid && !cx)
			throw new ToolError(
				`Unknown CX preference ${args.default_cx_uuid}.`
			);

		// only what was given: PATCH merges, null clears
		const patch = {
			...(args.default_empire_uuid !== undefined && {
				defaultEmpireUuid: args.default_empire_uuid,
			}),
			...(args.default_cx_uuid !== undefined && {
				defaultCXUuid: args.default_cx_uuid,
			}),
			...(args.buy_items_from_cx !== undefined && {
				defaultBuyItemsFromCX: args.buy_items_from_cx,
			}),
		};
		if (!Object.keys(patch).length)
			throw new ToolError("Nothing to set: pass at least one setting.");
		const saved = await backend.send(
			"PATCH",
			"/user/preferences/",
			patch,
			UserPreferencePatchSchema,
			UserPreferenceSchema
		);
		const empireName = empires.find(
			(e) => e.uuid === saved.defaultEmpireUuid
		)?.empire_name;
		const cxName = cxs.find((c) => c.uuid === saved.defaultCXUuid)?.cx_name;
		return {
			text: `Planning defaults: default empire ${empireName ? `"${empireName}"` : "none"}, default CX preference ${cxName ? `"${cxName}"` : "none"}, buy items from CX ${saved.defaultBuyItemsFromCX ? "on" : "off"}.`,
			data: {
				default_empire: empireName
					? { uuid: saved.defaultEmpireUuid, name: empireName }
					: null,
				default_cx_preference: cxName
					? { uuid: saved.defaultCXUuid, name: cxName }
					: null,
				buy_items_from_cx: saved.defaultBuyItemsFromCX,
				reload_hint:
					"If PRUNplanner is open, reload the page to see the change.",
			},
		};
	},
});
