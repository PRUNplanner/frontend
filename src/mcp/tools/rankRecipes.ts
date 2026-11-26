import { z } from "zod";

// Engine
import { calculatePlan } from "@prunplanner/engine";
import { pickerOptions } from "@/features/planning/recipePicker.util";

// Util
import { loadPlanSetup } from "@/mcp/context";
import { ToolError } from "@/mcp/backend";
import { AnalyticsPlanetInsightsPayloadSchema } from "@/features/api/schemas/analyticsData.schemas";
import { basisText, PriceBasisSchema } from "@/mcp/priceBasis";
import {
	amount,
	defineTool,
	money,
	planUrl,
	uuidArg,
} from "@/mcp/tools/shared";

export const rankRecipes = defineTool({
	name: "rank_recipes",
	title: "Rank a building's recipes",
	description:
		"What a building in a plan could make instead, as the plan editor's recipe picker shows it: every recipe the building can run on the plan's planet, with the daily profit of one building running only that recipe at the plan's efficiency, prices, workforce cost, degradation and fees, the difference to its current recipe, profit per area and payback. Use it to answer 'what instead of X', then try the best ones with calculate_plan_variant (recipes) to see the whole plan.",
	inputSchema: z.object({
		plan_uuid: uuidArg(),
		building: z.string().describe("Building ticker in the plan, e.g. SPF"),
		empire_uuid: uuidArg().optional(),
		price_basis: PriceBasisSchema.optional(),
		limit: z.number().int().min(1).max(100).optional(),
	}),
	async run(args, { backend, appUrl }) {
		const setup = await loadPlanSetup(
			backend,
			args.plan_uuid,
			args.empire_uuid,
			args.price_basis
		);
		const ticker = args.building.toUpperCase();
		const { result } = calculatePlan(
			{ ...setup.input, recipeOptions: true },
			setup.ctx
		);
		const building = result.production.buildings.find(
			(b) => b.name === ticker
		);
		if (!building)
			throw new ToolError(
				`${ticker} isn't in ${setup.plan.plan_name}. Its buildings: ${result.production.buildings.map((b) => b.name).join(", ")}.`
			);

		// the recipe picker's "Plans here": share of plans on the planet running it
		const popularity = new Map<string, number>();
		try {
			const insights = await backend.get(
				`/analytics/planet_insights/${encodeURIComponent(setup.planet.planet_natural_id)}/`,
				AnalyticsPlanetInsightsPayloadSchema
			);
			if (insights.status === "success") {
				const row = insights.insights_data.buildings
					.filter((b) => b.ticker === ticker)
					.sort((a, b) => b.percentage - a.percentage)[0];
				for (const r of row?.recipes ?? [])
					popularity.set(r.recipe_id, r.percentage);
			}
		} catch {
			// insights are optional: without them there's no popularity
		}

		const activeIds = building.activeRecipes.map((r) => r.recipeId);
		const current = building.recipeOptions.find(
			(r) => r.recipe_id === activeIds[0]
		);
		const rows = pickerOptions(
			"change",
			building.recipeOptions,
			activeIds,
			activeIds[0],
			"daily",
			() => undefined
		).slice(0, args.limit ?? 30);

		const data = {
			plan: {
				uuid: setup.plan.uuid,
				name: setup.plan.plan_name,
				url: planUrl(appUrl, setup.plan),
			},
			building: ticker,
			amount: building.amount,
			efficiency: amount(building.totalEfficiency),
			current_recipes: activeIds,
			price_basis: basisText(setup.basis, setup.cx),
			note: [
				setup.resolved.note,
				"Each row is one building running only that recipe, per day. plans_here_pct: share of plans on this planet running the recipe (null when the planet has fewer than 15 plans or no plan here runs it; the app shows that as below 5 %).",
			]
				.filter(Boolean)
				.join(" "),
			recipes: rows.map(({ recipe, current: isCurrent, inPlan }) => ({
				recipe_id: recipe.recipe_id,
				current: isCurrent,
				in_plan: inPlan,
				inputs: recipe.inputs.map(
					(m) => `${m.material_amount}x${m.material_ticker}`
				),
				outputs: recipe.outputs.map(
					(m) => `${m.material_amount}x${m.material_ticker}`
				),
				hours_per_run: amount(recipe.time_ms / 3_600_000),
				daily_profit: money(recipe.dailyRevenue),
				vs_current: current
					? money(recipe.dailyRevenue - current.dailyRevenue)
					: null,
				profit_per_area: money(recipe.profitPerArea),
				plans_here_pct: popularity.get(recipe.recipe_id) ?? null,
				payback_days:
					Number.isFinite(recipe.roi) && recipe.roi > 0
						? amount(recipe.roi)
						: null,
			})),
		};
		const best = data.recipes.find((r) => !r.current);
		return {
			text: `${ticker} in ${setup.plan.plan_name}: ${data.recipes.length} recipes; best other ${best?.recipe_id ?? "none"} at ${best?.daily_profit ?? 0} per building per day${best?.vs_current !== null && best ? ` (${best.vs_current >= 0 ? "+" : ""}${best.vs_current} vs current)` : ""}.`,
			data,
		};
	},
});
