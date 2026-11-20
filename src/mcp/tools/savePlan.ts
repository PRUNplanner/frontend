import { z } from "zod";

// Util
import { loadPlanSetup } from "@/mcp/context";
import { ToolError } from "@/mcp/backend";
import { buildVariant, sizingNotes, VariantChangesSchema } from "@/mcp/variant";
import { calculateNew, NewPlanSchema } from "@/mcp/tools/calculateNewPlan";
import { calculationDetails, defineTool, uuidArg } from "@/mcp/tools/shared";
import { storeEmpireStates } from "@/mcp/empireState";
import { preferenceDefaults } from "@/features/preferences/userDefaults";
import { buildPlanSummary } from "@/features/planning/planSummary.util";

// Schemas
import {
	PlanCreateDataSchema,
	PlanSaveCreateResponseSchema,
	PlanSaveDataSchema,
	PlanSchema,
} from "@/features/api/schemas/planningData.schemas";
import {
	UserPreferencePatchSchema,
	UserPreferenceSchema,
} from "@/features/api/schemas/user.schemas";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";
import type { IVariant } from "@/mcp/variant";
import type { PlanCreateData } from "@/features/api/schemas/planningData.schemas";

const PlanNameSchema = z.string().trim().min(1).max(100);

// a saved plan's changes: as calculate_plan_variant, in the plan's own
// empire and prices (what the plan page shows)
const ChangesSchema = VariantChangesSchema.omit({
	switch_empire_uuid: true,
	faction: true,
	price_basis: true,
}).partial();

/** the create/save body for a calculated plan, with its link preview */
export function body(
	v: IVariant,
	name: string,
	empireUuid?: string
): PlanCreateData {
	return {
		plan_name: name,
		planet_natural_id: v.planet.planet_natural_id,
		plan_cogc: v.plan.plan_cogc,
		plan_corphq: v.plan.plan_corphq,
		plan_permits_used: v.plan.plan_permits_used,
		plan_data: v.plan.plan_data,
		empire_uuid: empireUuid,
		// as the editor saves: the summary for link previews
		plan_summary: buildPlanSummary(v.calc, v.ctx.prices),
	};
}

/**
 * Creates a plan as the app does: in its empire, with the per-plan
 * auto-optimise-habs setting the app stores with every created plan, and
 * the empire's state refreshed. What couldn't be done comes back as notes
 * @author jplacht
 */
export async function createPlan(
	b: IBackend,
	data: PlanCreateData,
	autoHabs: boolean
): Promise<{ uuid: string; notes: string[] }> {
	const { uuid } = await b.send(
		"POST",
		"/planning/plan/",
		data,
		PlanCreateDataSchema,
		PlanSaveCreateResponseSchema
	);
	const notes: string[] = [];
	try {
		await b.send(
			"PATCH",
			"/user/preferences/",
			{ planOverrides: { [uuid]: { autoOptimizeHabs: autoHabs } } },
			UserPreferencePatchSchema,
			UserPreferenceSchema
		);
	} catch {
		notes.push(
			`Auto-optimise habs couldn't be stored for the plan; it is off until switched on in the plan editor.`
		);
	}
	const stale = await storeEmpireStates(b, [data.empire_uuid]);
	if (stale) notes.push(stale);
	return { uuid, notes };
}

/** a plan's stored auto-optimise-habs setting (the app's default: off) */
async function autoHabsOf(b: IBackend, planUuid: string): Promise<boolean> {
	const preferences = await b
		.get("/user/preferences/", UserPreferenceSchema)
		.catch(() => undefined);
	return (
		preferences?.planOverrides[planUuid]?.autoOptimizeHabs ??
		preferenceDefaults.planDefaults.autoOptimizeHabs
	);
}

export const savePlan = defineTool({
	name: "save_plan",
	title: "Save a plan",
	write: "save",
	overwrites: true,
	description:
		"Saves a plan to the user's PRUNplanner account. The saved plan is calculated as calculate_new_plan / calculate_plan_variant with the same arguments. Without plan_uuid it creates a new plan: planet_natural_id, buildings and the other calculate_new_plan arguments plus plan_name, in the empire it is calculated in (empire_uuid, else the one calculate_new_plan picks: default, else only empire; no empire when none is picked), as the app saves a new plan. With plan_uuid it saves the changes onto that plan as a new version (restore_plan_version undoes it; unsaved edits open in the app stay as a draft), or with as_new_plan as a new plan (plan_name; calculated in and added to empire_uuid, else the empire its plan page opens with: your default empire if the plan is in it, else its first; a plan in no empire: your first empire). plan_name alone renames. Returns the saved plan's uuid, url and calculation.",
	inputSchema: NewPlanSchema.partial()
		.extend(ChangesSchema.shape)
		.extend({
			plan_uuid: uuidArg()
				.optional()
				.describe("The plan to save changes onto; omit for a new plan"),
			plan_name: PlanNameSchema.optional().describe(
				"Name; required for a new plan, renames a saved one"
			),
			empire_uuid: uuidArg()
				.optional()
				.describe("Empire a new plan is calculated in and added to"),
			as_new_plan: z
				.boolean()
				.optional()
				.describe(
					"With plan_uuid: save the changed plan as a new plan"
				),
			version_name: z
				.string()
				.trim()
				.max(80)
				.optional()
				.describe(
					"Name the saved version (named versions are kept; the app caps how many)"
				),
		}),
	async run(args, { backend, appUrl }) {
		let v: IVariant;
		let uuid: string;
		let name: string;
		let saved: "created" | "version" | "copy";
		let extra: string[] = [];

		if (!args.plan_uuid) {
			if (!args.planet_natural_id || !args.buildings?.length)
				throw new ToolError(
					"A new plan needs planet_natural_id and buildings (or pass plan_uuid to save onto a plan)."
				);
			if (!args.plan_name)
				throw new ToolError("A new plan needs a plan_name.");
			v = await calculateNew(
				backend,
				{
					...args,
					planet_natural_id: args.planet_natural_id,
					buildings: args.buildings,
				},
				args.empire_uuid
			);
			name = args.plan_name;
			// saved in the empire it was calculated in, with auto-habs on, as
			// the app saves a new plan
			({ uuid, notes: extra } = await createPlan(
				backend,
				body(v, name, v.empire?.uuid),
				true
			));
			saved = "created";
		} else {
			// a copy is calculated in the empire it goes into
			const setup = await loadPlanSetup(
				backend,
				args.plan_uuid,
				args.as_new_plan ? args.empire_uuid : undefined
			);
			v = await buildVariant(backend, setup, args);
			if (args.as_new_plan) {
				name = args.plan_name ?? `${setup.plan.plan_name} (copy)`;
				// a copy keeps the source's auto-habs setting, as Save as copy
				({ uuid, notes: extra } = await createPlan(
					backend,
					body(v, name, v.empire?.uuid),
					await autoHabsOf(backend, setup.plan.uuid)
				));
				saved = "copy";
			} else {
				name = args.plan_name ?? setup.plan.plan_name;
				uuid = setup.plan.uuid;
				await backend.send(
					"PUT",
					`/planning/plan/${encodeURIComponent(uuid)}/`,
					{
						...body(v, name),
						uuid,
						// a newer save in the app is a conflict, not overwritten
						base_modified_at: setup.plan.modified_at,
						version_name: args.version_name || undefined,
					},
					PlanSaveDataSchema,
					PlanSchema
				);
				const stale = await storeEmpireStates(
					backend,
					(setup.plan.empires ?? []).map((e) => e.uuid)
				);
				if (stale) extra.push(stale);
				saved = "version";
			}
		}

		const planet = v.planet.planet_natural_id;
		const url = `${appUrl}/plan/${planet}/${uuid}`;
		const details = calculationDetails(
			v.calc,
			v.ctx.prices,
			v.cx,
			{ empire: v.empire, note: v.pricing?.note },
			v.basis,
			v.planet,
			v.ctx.buildings
		);
		const d = details.per_day;
		const how = {
			created: `Created "${name}" on ${planet} in ${v.empire ? `the empire "${v.empire.empire_name}"` : "no empire"}`,
			copy: `Saved as the new plan "${name}" on ${planet} in ${v.empire ? `the empire "${v.empire.empire_name}"` : "no empire"}`,
			version: `Saved "${name}" as a new version (restore_plan_version undoes it)`,
		}[saved];
		const notes = [
			...v.notes,
			...(saved === "created" ? sizingNotes(v) : []),
			...extra,
		];
		return {
			text: `${how}: profit ${d.profit} per day, construction cost ${d.construction_cost}, ROI ${d.roi_days ?? "never"} days. ${url}`,
			data: {
				saved,
				plan: {
					uuid,
					name,
					planet,
					url,
					empire: v.empire
						? { uuid: v.empire.uuid, name: v.empire.empire_name }
						: null,
				},
				...details,
				note:
					[...new Set([details.note, ...notes])]
						.filter(Boolean)
						.join(" ") || null,
				empire_choices: v.pricing?.choices,
				reload_hint:
					"If PRUNplanner is open, reload the page to see the change.",
			},
		};
	},
});
