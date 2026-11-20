import { z } from "zod";

// Util
import { loadEmpireCX } from "@/mcp/context";
import { getPlanet, loadGameData } from "@/mcp/gameData";
import { PriceBasisSchema } from "@/mcp/priceBasis";
import { calculateWithHabs, type IVariant } from "@/mcp/variant";
import {
	calculationDetails,
	defineTool,
	detailArg,
	permitCost,
	PLAN_FULL_DETAIL,
	summarizeDetails,
	uuidArg,
} from "@/mcp/tools/shared";
import {
	applyPlanFields,
	BuildingChangeSchema,
	emptyPlanData,
	expertsText,
	PlanFieldChangesSchema,
} from "@/mcp/tools/planEdit";
import { mapPlanetToPlanType } from "@/features/planning_data/planCOGC.util";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";

/** an unsaved plan: what calculate_new_plan and the empire variant take */
export const NewPlanSchema = PlanFieldChangesSchema.extend({
	planet_natural_id: z
		.string()
		.describe("Planet id (OT-580b) or name (Etherwind)"),
	buildings: z.array(BuildingChangeSchema).min(1),
	habs: PlanFieldChangesSchema.shape.habs.describe(
		'Habitation (default "auto", as the plan editor\'s auto-habs); "keep" uses the habs you list'
	),
	experts: PlanFieldChangesSchema.shape.experts.describe(
		'Experts (default "auto": the split worth most for the buildings, at most 5 per type and 6 per base); a list sets them, e.g. [] or all at 0 for none'
	),
});
export type NewPlan = z.infer<typeof NewPlanSchema>;

/**
 * An unsaved plan calculated as a new plan in the app starts (every
 * luxury on, permits 1, the planet's active COGC program, auto-habs), with
 * experts "auto" unless given: planning assumes the experts a base will get
 * @author jplacht
 *
 * @param {IBackend} b Backend client
 * @param {NewPlan} args The plan
 * @param {string} [empireUuid] Empire for faction and CX
 * @param {PriceBasis} [basis] Price basis
 * @returns {Promise<IVariant>} Calculation
 */
export async function calculateNew(
	b: IBackend,
	args: NewPlan,
	empireUuid?: string,
	basis: z.infer<typeof PriceBasisSchema> = "plan"
): Promise<IVariant> {
	const [planet, gameData, { empire, cx, note, choices }] = await Promise.all(
		[
			getPlanet(b, args.planet_natural_id),
			loadGameData(b),
			loadEmpireCX(b, empireUuid),
		]
	);
	const plan = applyPlanFields(
		{
			plan_data: emptyPlanData(),
			plan_cogc: mapPlanetToPlanType(planet.active_cogc_program_type),
			plan_corphq: false,
			plan_permits_used: 1,
		},
		args,
		gameData,
		planet
	);
	return {
		...calculateWithHabs(gameData, plan, planet, empire, cx, basis, {
			habs: args.habs ?? "auto",
			experts: args.experts ?? "auto",
			storage_days: args.storage_days,
		}),
		pricing: { note, choices },
	};
}

export const calculateNewPlan = defineTool({
	name: "calculate_new_plan",
	title: "Calculate an unsaved base",
	description:
		"Calculates a base that isn't saved yet, on any planet, with PRUNplanner's plan engine: the same result as get_plan (money per day, buildings, warnings, workforce, area, construction cost, shipping, ROI). Use it to plan before committing, or to try one setup on candidate planets. Several recipes in one building: see Buildings in the server instructions. Like a new plan in the app: every luxury on, 1 permit, the planet's active COGC program, auto-habs, experts \"auto\" (all unless you set them); storage_days sizes storage. Priced in empire_uuid, else as the server instructions say (default, only empire, only CX preference; else Universe VWAP 30D with empire_choices). Nothing is saved (save_plan saves it with the same arguments); the url opens a new plan on that planet.",
	inputSchema: NewPlanSchema.extend({
		empire_uuid: uuidArg().optional(),
		price_basis: PriceBasisSchema.optional(),
		detail: detailArg(PLAN_FULL_DETAIL),
	}),
	async run(args, { backend, appUrl }) {
		const v = await calculateNew(
			backend,
			args,
			args.empire_uuid,
			args.price_basis
		);
		const full = calculationDetails(
			v.calc,
			v.ctx.prices,
			v.cx,
			{
				empire: v.empire,
				note: v.pricing?.note,
			},
			v.basis,
			v.planet,
			v.ctx.buildings,
			// cached game data: no request
			(await loadGameData(backend)).exchanges
		);
		const details = args.detail === "full" ? full : summarizeDetails(full);
		const d = details.per_day;
		const habitation = v.notes.join(" ") || "as given";
		return {
			text: `Unsaved base on ${v.planet.planet_natural_id}: profit ${d.profit} per day (revenue ${d.revenue}, cost ${d.cost}), construction cost ${d.construction_cost}, ROI ${d.roi_days ?? "never"} days. Experts ${expertsText(v.plan.plan_data.experts)}${v.autoExperts !== undefined ? " (auto)" : ""}. ${habitation}${v.storage ? ` Storage: ${v.storage}.` : ""} Nothing was saved.`,
			data: {
				plan: {
					uuid: null,
					name: "Unsaved plan",
					planet: v.planet.planet_natural_id,
					planet_name: v.planet.planet_name,
					cogc: v.plan.plan_cogc,
					corphq: v.plan.plan_corphq,
					permits: v.plan.plan_permits_used,
					experts: expertsText(v.plan.plan_data.experts),
					experts_auto: v.autoExperts !== undefined,
					storage: v.storage ?? null,
					url: `${appUrl}/plan/${v.planet.planet_natural_id}`,
				},
				habitation,
				// a new base takes its permits from the empire's pool
				permits_cost:
					permitCost(
						v.empire,
						v.plan.plan_permits_used,
						v.ctx.prices,
						v.calc.result.profit,
						v.calc.overview.totalConstructionCost
					) ?? undefined,
				...details,
				empire_choices: v.pricing?.choices,
			},
		};
	},
});
