import { z } from "zod";

// Util
import { assignCX, getCXs, getEmpires, getPlans } from "@/mcp/context";
import { storeEmpireStates } from "@/mcp/empireState";
import { ToolError } from "@/mcp/backend";
import { defineTool, empireUrl, plural, uuidArg } from "@/mcp/tools/shared";

// Schemas
import {
	EmpirePayloadSchema,
	EmpireSaveResponseSchema,
	PlanEmpireElementListSchema,
	PlanEmpireJunctionListSchema,
} from "@/features/api/schemas/empireData.schemas";
import {
	PlanEmpireSchema,
	PlanFactionSchema,
} from "@/features/api/schemas/planningData.schemas";

export const saveEmpire = defineTool({
	name: "save_empire",
	title: "Create or change an empire",
	write: "save",
	overwrites: true,
	description:
		"Creates an empire (no empire_uuid; name required, faction NONE and permits 1 of 2 unless given, as the app) or changes one: name, faction, permits used and total. plans sets which plans are in it (set: exactly these; add / remove: change the list). cx_preference_uuid sets the CX preference the empire is priced with (null: none, Universe VWAP 30D); every other empire keeps its own. Returns the empire with its plans and CX preference.",
	inputSchema: z.object({
		empire_uuid: uuidArg()
			.optional()
			.describe("The empire to change; omit to create one"),
		name: z.string().trim().min(1).max(100).optional(),
		faction: PlanFactionSchema.optional(),
		permits_used: z.number().int().min(1).optional(),
		permits_total: z.number().int().min(2).optional(),
		plans: z
			.object({
				set: z.array(uuidArg()).optional(),
				add: z.array(uuidArg()).optional(),
				remove: z.array(uuidArg()).optional(),
			})
			.optional()
			.describe("Plans in the empire, by plan uuid"),
		cx_preference_uuid: uuidArg()
			.nullable()
			.optional()
			.describe("CX preference the empire uses; null for none"),
	}),
	async run(args, { backend, appUrl }) {
		const [empires, cxs] = await Promise.all([
			getEmpires(backend),
			getCXs(backend),
		]);
		const current = args.empire_uuid
			? empires.find((e) => e.uuid === args.empire_uuid)
			: undefined;
		if (args.empire_uuid && !current)
			throw new ToolError(`Unknown empire ${args.empire_uuid}.`);
		if (!current && !args.name)
			throw new ToolError("A new empire needs a name.");
		if (
			args.cx_preference_uuid &&
			!cxs.some((c) => c.uuid === args.cx_preference_uuid)
		)
			throw new ToolError(
				`Unknown CX preference ${args.cx_preference_uuid}.`
			);

		const config = {
			empire_name: args.name ?? current?.empire_name ?? "",
			empire_faction: args.faction ?? current?.empire_faction ?? "NONE",
			empire_permits_used:
				args.permits_used ?? current?.empire_permits_used ?? 1,
			empire_permits_total:
				args.permits_total ?? current?.empire_permits_total ?? 2,
		};
		if (config.empire_permits_used > config.empire_permits_total)
			throw new ToolError(
				`Permits used (${config.empire_permits_used}) can't exceed permits total (${config.empire_permits_total}).`
			);

		const changed: string[] = [];
		let uuid = current?.uuid;
		const configChanged =
			!current ||
			(Object.keys(config) as (keyof typeof config)[]).some(
				(k) => config[k] !== current[k]
			);
		if (!current) {
			uuid = (
				await backend.send(
					"POST",
					"/planning/empire/",
					config,
					EmpirePayloadSchema,
					PlanEmpireSchema
				)
			).uuid;
			changed.push("created");
		} else if (configChanged) {
			await backend.send(
				"PUT",
				`/planning/empire/${encodeURIComponent(current.uuid)}/`,
				// a newer save in the app is a conflict, not overwritten
				{ ...config, base_modified_at: current.modified_at },
				EmpirePayloadSchema,
				EmpireSaveResponseSchema
			);
			changed.push("name, faction and permits");
		}

		if (args.plans) {
			const own = new Set((await getPlans(backend)).map((p) => p.uuid));
			const asked = [
				...(args.plans.set ?? []),
				...(args.plans.add ?? []),
			];
			const unknown = asked.filter((p) => !own.has(p));
			if (unknown.length)
				throw new ToolError(`Unknown plans: ${unknown.join(", ")}.`);
			const list = new Set(
				args.plans.set ?? current?.plans.map((p) => p.uuid) ?? []
			);
			for (const p of args.plans.add ?? []) list.add(p);
			for (const p of args.plans.remove ?? []) list.delete(p);
			await backend.send(
				"POST",
				"/planning/empire/junctions/",
				[
					{
						empire_uuid: uuid!,
						baseplanners: [...list].map((p) => ({
							baseplanner_uuid: p,
						})),
					},
				],
				PlanEmpireJunctionListSchema,
				PlanEmpireElementListSchema
			);
			changed.push("plans");
		}

		if (args.cx_preference_uuid !== undefined) {
			await assignCX(
				backend,
				cxs,
				new Map([[uuid!, args.cx_preference_uuid ?? undefined]])
			);
			changed.push("CX preference");
		}

		// faction, permits and plans change what it produces: stored as the
		// Empire page does (the API's empire exports read it)
		const stale =
			configChanged || args.plans
				? await storeEmpireStates(backend, [uuid])
				: undefined;
		const [after, cxsAfter] = await Promise.all([
			getEmpires(backend),
			args.cx_preference_uuid !== undefined ? getCXs(backend) : cxs,
		]);
		const empire = after.find((e) => e.uuid === uuid);
		if (!empire)
			throw new ToolError(`Empire ${uuid} not found after saving.`);
		const cx = cxsAfter.find((c) => c.empires.some((e) => e.uuid === uuid));
		const url = empireUrl(appUrl, empire.uuid);
		return {
			text: `${current ? `Saved "${empire.empire_name}" (${changed.join(", ") || "nothing changed"})` : `Created the empire "${empire.empire_name}"`}: ${empire.empire_faction}, permits ${empire.empire_permits_used}/${empire.empire_permits_total}, ${plural(empire.plans.length, "plan")}, CX preference ${cx ? `"${cx.cx_name}"` : "none"}. ${url}`,
			data: {
				changed,
				empire: {
					uuid: empire.uuid,
					name: empire.empire_name,
					faction: empire.empire_faction,
					permits_used: empire.empire_permits_used,
					permits_total: empire.empire_permits_total,
					plans: empire.plans.map((p) => ({
						uuid: p.uuid,
						name: p.plan_name,
						planet: p.planet_natural_id,
					})),
					cx_preference: cx
						? { uuid: cx.uuid, name: cx.cx_name }
						: null,
					url,
				},
				...(stale && { note: stale }),
				reload_hint:
					"If PRUNplanner is open, reload the page to see the change.",
			},
		};
	},
});
