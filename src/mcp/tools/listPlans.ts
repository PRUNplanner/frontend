import { z } from "zod";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";

// Util
import {
	createPlanContext,
	findEmpireCX,
	getCXs,
	getEmpirePlans,
	getDefaultEmpireUuid,
	getEmpires,
	getPlans,
	resolveEmpire,
} from "@/mcp/context";
import { getPlanet, loadGameData } from "@/mcp/gameData";
import {
	defineTool,
	figures,
	money,
	planUrl,
	plural,
	uuidArg,
} from "@/mcp/tools/shared";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

/**
 * Every plan calculated as get_plan does (in the given empire, else its
 * first), with the empire and CX preference it was priced in
 * @author jplacht
 */
async function calculateAll(
	backend: IBackend,
	plans: Plan[],
	empires: PlanEmpireElement[],
	empireUuid: string | undefined
) {
	const [cxs, gameData, defaultEmpire] = await Promise.all([
		getCXs(backend),
		loadGameData(backend),
		empireUuid ? undefined : getDefaultEmpireUuid(backend),
	]);
	return Promise.all(
		plans.map(async (plan) => {
			const planet = await getPlanet(backend, plan.planet_natural_id);
			const { empire } = resolveEmpire(
				plan,
				empires,
				empireUuid,
				defaultEmpire
			);
			const cx = findEmpireCX(cxs, empire?.uuid);
			const calc = calculatePlan(
				{ plan, empire, cxUuid: cx?.uuid, recipeOptions: false },
				createPlanContext(gameData, planet, cx)
			);
			return {
				calculated_in: empire?.empire_name ?? null,
				cx_preference: cx?.cx_name ?? null,
				per_day: figures(calc),
				margin_pct: calc.result.revenue
					? money((calc.result.profit / calc.result.revenue) * 100)
					: null,
			};
		})
	);
}

export const listPlans = defineTool({
	name: "list_plans",
	title: "List plans",
	description:
		"Lists the user's base plans (one planet each), optionally only those of one empire, with plan uuids for the other tools. By default every plan is also calculated with the plan engine (in the given empire, else the one its plan page opens with, as get_plan does: calculated_in) with profit, revenue, cost, construction cost, margin and ROI, and the list is ranked by profit per day, highest first; in_several_empires marks plans whose numbers depend on the empire. with_profit false lists only.",
	inputSchema: z.object({
		empire_uuid: uuidArg()
			.optional()
			.describe("Only plans in this empire (from list_empires)"),
		with_profit: z
			.boolean()
			.optional()
			.describe(
				"Calculate and rank every plan (default true; false only lists)"
			),
		limit: z
			.number()
			.int()
			.min(1)
			.max(1000)
			.optional()
			.describe(
				"Plans to return (default 50; the most profitable first when ranked)"
			),
	}),
	async run(
		{ empire_uuid, with_profit: withProfitArg, limit = 50 },
		{ backend, appUrl }
	) {
		const with_profit = withProfitArg ?? true;
		const plans = empire_uuid
			? await getEmpirePlans(backend, empire_uuid)
			: await getPlans(backend);
		// an empire's plan list comes without each plan's empires: the
		// empire list says which plans each empire holds
		const empires =
			with_profit || plans.some((p) => !p.empires)
				? await getEmpires(backend)
				: [];
		const planEmpires = (p: Plan) =>
			p.empires ??
			empires.filter((e) => e.plans.some((ep) => ep.uuid === p.uuid));
		const calculated = with_profit
			? await calculateAll(
					backend,
					plans.map((p) => ({ ...p, empires: planEmpires(p) })),
					empires,
					empire_uuid
				)
			: undefined;

		const list = plans.map((p, i) => ({
			uuid: p.uuid,
			name: p.plan_name,
			planet: p.planet_natural_id,
			empires: planEmpires(p).map((e) => ({
				uuid: e.uuid,
				name: e.empire_name,
			})),
			in_several_empires: planEmpires(p).length > 1,
			modified_at: p.modified_at ?? null,
			url: planUrl(appUrl, p),
			...calculated?.[i],
		}));
		if (calculated)
			list.sort((a, b) => b.per_day!.profit - a.per_day!.profit);

		// big accounts: the top of the list, and how to get the rest
		const shown = list.slice(0, limit);
		const label = (p: (typeof list)[number]) =>
			p.per_day
				? `${p.name} (${p.planet}) ${money(p.per_day.profit)}/day`
				: `${p.name} (${p.planet})`;
		return {
			text: `${plural(list.length, "plan")}${calculated ? ", by profit per day" : ""}${shown.length < list.length ? `, the first ${shown.length}` : ""}: ${shown.map(label).join(", ")}`,
			data: {
				total: list.length,
				plans: shown,
				note:
					[
						calculated &&
							"Each plan is priced in the empire its plan page opens with (calculated_in: your default empire if the plan is in it, else its first; a plan in no empire: your first empire) and that empire's CX preference.",
						shown.length < list.length &&
							`Showing ${shown.length} of ${list.length}: pass limit for more, or empire_uuid for one empire.`,
					]
						.filter(Boolean)
						.join(" ") || undefined,
			},
		};
	},
});
