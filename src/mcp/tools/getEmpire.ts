import { basisText } from "@/mcp/priceBasis";
import { z } from "zod";

// Engine
import { empireCostOverview } from "@/features/empire/util/empireMaterialIO.util";

// Util
import {
	findEmpireCX,
	getCXs,
	getEmpirePlans,
	getEmpires,
} from "@/mcp/context";
import { loadGameData } from "@/mcp/gameData";
import { calculateEmpirePlans } from "@/mcp/empireState";
import { ToolError } from "@/mcp/backend";
import {
	amount,
	defineTool,
	empireUrl,
	money,
	planUrl,
	cxMatch,
	uuidArg,
} from "@/mcp/tools/shared";

// Types & Interfaces
import type { IEmpireMaterialIOPlanet } from "@/features/empire/empire.types";

const side = (planets: IEmpireMaterialIOPlanet[], key: "input" | "output") =>
	planets.map((p) => ({
		plan_uuid: p.planUuid,
		plan: p.planName,
		planet: p.planetId,
		amount: amount(p[key]),
	}));

export const getEmpire = defineTool({
	name: "get_empire",
	title: "Calculate an empire",
	description:
		"Calculates every plan of an empire now with the plan engine and adds them up like the Empire page: profit and cost per plan, empire totals per day, and the net material input/output per day with values (the 30 largest money flows by default: limit, sort; include_plan_breakdown adds which plans make and use each material). Warns when the empire's CX preference prices nothing.",
	inputSchema: z.object({
		empire_uuid: uuidArg().describe("Empire (from list_empires)"),
		include_material_io: z
			.boolean()
			.optional()
			.describe(
				"Include the empire's material rows (default true; false for a short answer)"
			),
		limit: z
			.number()
			.int()
			.min(1)
			.max(500)
			.optional()
			.describe("Material rows to return (default 30)"),
		sort: z
			.enum(["value", "ticker"])
			.optional()
			.describe(
				'Material rows by "value" (largest money flow first, default) or "ticker"'
			),
		include_plan_breakdown: z
			.boolean()
			.optional()
			.describe(
				"Per material, which plans make and use it (default false)"
			),
	}),
	async run(
		{
			empire_uuid,
			include_material_io,
			limit,
			sort,
			include_plan_breakdown,
		},
		{ backend, appUrl }
	) {
		const [empires, cxs, plans, gameData] = await Promise.all([
			getEmpires(backend),
			getCXs(backend),
			getEmpirePlans(backend, empire_uuid),
			loadGameData(backend),
		]);
		const empire = empires.find((e) => e.uuid === empire_uuid);
		if (!empire) throw new ToolError(`Unknown empire ${empire_uuid}.`);
		const cx = findEmpireCX(cxs, empire.uuid);

		const { calculated, combined } = await calculateEmpirePlans(
			backend,
			empire,
			cx,
			plans,
			gameData
		);
		// a CX preference that priced nothing, checked empire-wide (no planet)
		// each plan priced with its own planet's preferences: warn only when
		// the CX preference priced nothing in any plan
		const matches = calculated
			.map((c) => cxMatch(c.calc.result.materialio, c.prices, cx, "plan"))
			.filter((m) => m !== undefined);
		const matched = matches.reduce((n, m) => n + m.matched, 0);
		const traded = matches.reduce((n, m) => n + m.of, 0);
		const cxMatchWarning =
			cx && traded && matched === 0
				? `CX preference "${cx.cx_name}" matched none of the empire's traded materials in any plan: every price is the Universe VWAP 30D fallback. Set exchange preferences in the app or pass price_basis.`
				: undefined;
		const totals = empireCostOverview(
			combined,
			calculated.map((c) => c.calc.result)
		);

		const data = {
			empire: {
				uuid: empire.uuid,
				name: empire.empire_name,
				faction: empire.empire_faction,
				url: empireUrl(appUrl, empire.uuid),
			},
			price_basis: basisText("plan", cx),
			per_day: {
				revenue: money(totals.totalRevenue),
				cost: money(totals.totalCost),
				profit: money(totals.totalProfit),
			},
			area_used: totals.totalAreaUsed,
			plans: calculated.map(({ plan, calc }) => ({
				uuid: plan.uuid,
				name: plan.plan_name,
				planet: plan.planet_natural_id,
				profit: money(calc.result.profit),
				revenue: money(calc.result.revenue),
				cost: money(calc.result.cost),
				construction_cost: money(calc.overview.totalConstructionCost),
				margin_pct: calc.result.revenue
					? money((calc.result.profit / calc.result.revenue) * 100)
					: null,
				roi_days:
					Number.isFinite(calc.overview.roi) && calc.overview.roi > 0
						? money(calc.overview.roi)
						: null,
				url: planUrl(appUrl, plan),
			})),
			material_rows: {
				total: combined.length,
				shown:
					include_material_io === false
						? 0
						: Math.min(combined.length, limit ?? 30),
			},
			material_io:
				include_material_io === false
					? undefined
					: [...combined]
							.sort((a, b) =>
								sort === "ticker"
									? a.ticker.localeCompare(b.ticker)
									: Math.abs(b.deltaPrice) -
										Math.abs(a.deltaPrice)
							)
							.slice(0, limit ?? 30)
							.map((m) => ({
								ticker: m.ticker,
								input: amount(m.input),
								output: amount(m.output),
								delta: amount(m.delta),
								value: money(m.deltaPrice),
								made_by: include_plan_breakdown
									? side(m.outputPlanets, "output")
									: undefined,
								used_by: include_plan_breakdown
									? side(m.inputPlanets, "input")
									: undefined,
							})),
			warnings: [cxMatchWarning].filter(Boolean),
		};
		return {
			text: `${empire.empire_name}: ${plans.length} plans, profit ${data.per_day.profit} per day (revenue ${data.per_day.revenue}, cost ${data.per_day.cost}).${include_material_io !== false && data.material_rows.shown < data.material_rows.total ? ` Material rows: showing ${data.material_rows.shown} of ${data.material_rows.total}, by ${sort === "ticker" ? "ticker" : "largest money flow"}; pass limit for more.` : ""}`,
			data,
		};
	},
});
