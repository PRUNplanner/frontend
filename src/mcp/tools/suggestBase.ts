import { z } from "zod";

// Engine
import { getBuildingRecipes } from "@prunplanner/engine";

// Util
import { getPlanet, loadGameData, resolvePlanetId } from "@/mcp/gameData";
import { ToolError } from "@/mcp/backend";
import { PriceBasisSchema } from "@/mcp/priceBasis";
import {
	calculationDetails,
	defineTool,
	plural,
	uuidArg,
} from "@/mcp/tools/shared";
import { applyBuildings, emptyPlanData } from "@/mcp/tools/planEdit";
import { loadEmpireCX } from "@/mcp/context";
import { calculateWithHabs } from "@/mcp/variant";
import { mapPlanetToPlanType } from "@/features/planning_data/planCOGC.util";
import {
	STARTER_PRESELECT_PERCENTAGE,
	starterCandidates,
	starterExperts,
	typicalRecipes,
} from "@/features/plan_analytics/planInsights.util";

// Schemas
import { AnalyticsPlanetInsightsPayloadSchema } from "@/features/api/schemas/analyticsData.schemas";

// Types & Interfaces
import type { BuildingChange } from "@/mcp/tools/planEdit";

export const suggestBase = defineTool({
	name: "suggest_base",
	title: "Suggest a base from what others run on a planet",
	description:
		"What other PRUNplanner players run on a planet (plan suggestions): buildings with the % of plans that have them, median amount, typical recipes and recipe mixes, and experts. What others run, not an optimum. Also the app's starter setup (the plan editor's \"Use typical setup\"): the most planned buildings at their typical amount and recipes, those in enough plans preselected, plus experts. With calculate (default true) the selected starter setup is calculated like calculate_new_plan (habitation auto-optimised, the planet's active COGC program), in empire_uuid, else as the server instructions' empire rule says. Pass include to add listed starter buildings that aren't preselected. Planets with fewer than 15 plans have no suggestions. Nothing is saved; the url opens a new plan on the planet.",
	inputSchema: z.object({
		planet_natural_id: z
			.string()
			.describe("Planet id (OT-580b) or name (Etherwind)"),
		empire_uuid: uuidArg().optional(),
		price_basis: PriceBasisSchema.optional(),
		calculate: z
			.boolean()
			.optional()
			.describe("Calculate the selected starter setup (default true)"),
		include: z
			.array(z.string())
			.optional()
			.describe(
				"Starter building tickers to add beyond the preselected ones (only buildings the starter setup lists)"
			),
	}),
	async run(args, { backend, appUrl }) {
		// insights need the exact id: resolve names and case first
		const planetId = await resolvePlanetId(backend, args.planet_natural_id);
		const [insights, planet, gameData, pricing] = await Promise.all([
			backend.get(
				`/analytics/planet_insights/${encodeURIComponent(planetId)}/`,
				AnalyticsPlanetInsightsPayloadSchema
			),
			getPlanet(backend, planetId),
			loadGameData(backend),
			loadEmpireCX(backend, args.empire_uuid),
		]);
		const { empire, cx } = pricing;
		const id = planet.planet_natural_id;
		const url = `${appUrl}/plan/${id}`;

		if (insights.status === "below_threshold")
			return {
				text: `Too few plans on ${id} for suggestions: PRUNplanner shows what others run only on planets with at least 15 plans.`,
				data: {
					planet: id,
					planet_name: planet.planet_name,
					status: insights.status,
					plans_analyzed: 0,
					url,
				},
			};

		// as usePlanetInsights: one row per ticker, most planned first
		const popular = [
			...new Map(
				insights.insights_data.buildings.map((b) => [b.ticker, b])
			).values(),
		].sort((a, b) => b.percentage - a.percentage);
		const byTicker = new Map(popular.map((b) => [b.ticker, b]));

		const candidates = starterCandidates(
			popular,
			(ticker) => typicalRecipes(byTicker.get(ticker)),
			(ticker) =>
				getBuildingRecipes(
					gameData.recipesByBuilding,
					ticker,
					planet.resources
				)
		);
		const experts = starterExperts(insights.insights_data.experts);

		const include = (args.include ?? []).map((t) => t.toUpperCase());
		const unknown = include.filter(
			(t) => !candidates.some((c) => c.ticker === t)
		);
		if (unknown.length)
			throw new ToolError(
				`${unknown.join(", ")} not in the starter setup of ${id}. It lists: ${candidates.map((c) => c.ticker).join(", ") || "none"}. Use calculate_new_plan for other buildings.`
			);
		const isSelected = (c: (typeof candidates)[number]) =>
			c.percentage >= STARTER_PRESELECT_PERCENTAGE ||
			include.includes(c.ticker);
		const selected = candidates.filter(isSelected);

		const data: Record<string, unknown> = {
			planet: id,
			planet_name: planet.planet_name,
			status: insights.status,
			plans_analyzed: insights.total_plans_analyzed,
			players: insights.total_users,
			last_updated: insights.last_updated,
			others_run: {
				buildings: popular.map((b) => ({
					ticker: b.ticker,
					in_plans_percentage: b.percentage,
					plans: b.plans,
					median_amount: b.median_amount,
					typical_recipes:
						typicalRecipes(b)?.recipes.map((r) => ({
							recipe_id: r.recipeid,
							amount: r.amount,
						})) ?? [],
					recipes: b.recipes,
					mixes: b.mixes.map((m) => ({
						recipe_ids: m.recipe_ids,
						in_plans_percentage: m.percentage,
						recipe_amounts: m.recipe_amounts,
					})),
				})),
				experts: insights.insights_data.experts.map((e) => ({
					type: e.type,
					in_plans_percentage: e.plans_percentage,
					median_amount: e.median_amount,
				})),
			},
			starter_setup: {
				preselect_percentage: STARTER_PRESELECT_PERCENTAGE,
				buildings: candidates.map((c) => ({
					ticker: c.ticker,
					in_plans_percentage: c.percentage,
					amount: c.amount,
					recipes: c.recipes.map((r) => ({
						recipe_id: r.recipeid,
						amount: r.amount,
					})),
					outputs: c.outputs,
					selected: isSelected(c),
				})),
				experts,
			},
			url,
		};

		const summary = `${id}: ${plural(insights.total_plans_analyzed, "plan")} analysed, ${plural(popular.length, "building")} others run; starter setup ${selected.map((c) => `${c.amount} ${c.ticker}`).join(", ") || "empty"}.`;
		if (args.calculate === false || selected.length === 0)
			return {
				text:
					selected.length === 0
						? `${summary} Nothing selected to calculate.`
						: summary,
				data,
			};

		const changes: BuildingChange[] = selected.flatMap((c) =>
			c.recipes.length
				? c.recipes.map((r) => ({
						ticker: c.ticker,
						amount: c.amount,
						recipe_id: r.recipeid,
						recipe_amount: r.amount,
					}))
				: [{ ticker: c.ticker, amount: c.amount }]
		);
		const planData = applyBuildings(
			emptyPlanData(),
			changes,
			gameData,
			planet
		);
		for (const expert of experts) {
			const entry = planData.experts.find((e) => e.type === expert.type);
			if (entry) entry.amount = expert.amount;
		}
		// a new plan in the app starts with the planet's active program
		const cogc = mapPlanetToPlanType(planet.active_cogc_program_type);
		const basis = args.price_basis ?? "plan";
		const v = calculateWithHabs(
			gameData,
			{
				plan_data: planData,
				plan_cogc: cogc,
				plan_corphq: false,
				plan_permits_used: 1,
			},
			planet,
			empire,
			cx,
			basis,
			{ habs: "auto" }
		);
		const { calc, ctx } = v;
		const habitation = v.notes.join(" ") || "as given";
		const details = calculationDetails(
			calc,
			ctx.prices,
			cx,
			{
				empire,
				note: pricing.note,
			},
			basis,
			planet,
			ctx.buildings
		);
		const d = details.per_day;
		data.calculation = {
			plan: {
				uuid: null,
				name: "Unsaved plan",
				planet: id,
				cogc,
				corphq: false,
				permits: 1,
				url,
			},
			habitation,
			...details,
			empire_choices: pricing.choices,
		};
		return {
			text: `${summary} Calculated: profit ${d.profit} per day (revenue ${d.revenue}, cost ${d.cost}), construction cost ${d.construction_cost}, ROI ${d.roi_days ?? "never"} days. Habitation ${habitation}. Nothing was saved.`,
			data,
		};
	},
});
