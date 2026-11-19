import { z } from "zod";

// Engine
import {
	calculateBase,
	recipeCandidates,
	toRowInput,
} from "@/features/base_roi/baseROIRows";
import {
	calculateMetrics,
	filterRows,
	hqStepCost,
} from "@/features/base_roi/baseROIMetrics";
import { basisBook, basisText, PriceBasisSchema } from "@/mcp/priceBasis";

// Util
import { loadEmpireCX } from "@/mcp/context";
import {
	getPlannedMaterials,
	loadGameData,
	PLANNED_NOTE,
} from "@/mcp/gameData";
import type { IPlannedMaterial } from "@/mcp/gameData";
import { amount, defineTool, money, plural, uuidArg } from "@/mcp/tools/shared";

// Static
import { STANDARD_PLANET } from "@/features/base_roi/baseROI.constants";
import { BaseROISettingsSchema } from "@/features/base_roi/baseROI.schemas";

// Types & Interfaces
import type { IPlanContext } from "@/features/planning/engine/engine.types";
import type { IBaseROIRow } from "@/features/base_roi/baseROI.types";

/** Infinity (never) as null, the rest rounded */
const days = (v: number): number | null =>
	Number.isFinite(v) ? money(v) : null;

const lower = (s: string | undefined) => s?.trim().toLowerCase();

/**
 * A Base ROI row for an assistant
 * @author jplacht
 */
function rowOut(
	row: IBaseROIRow,
	planned: Map<string, IPlannedMaterial> | undefined
) {
	const m = row.metrics;
	const capacity = Number.isFinite(m.marketCapacity)
		? amount(m.marketCapacity)
		: null;
	return {
		building: row.building,
		expertise: row.expertise,
		recipe_id: row.recipeId,
		outputs: row.outputs.map((o) => ({
			ticker: o.ticker,
			amount_per_day: amount(o.amount),
			traded_per_day: amount(o.traded),
			// PRUNplanner players' planned production of it, per day
			planned_by_players_per_day: planned
				? amount(planned.get(o.ticker)?.production ?? 0)
				: null,
			exchange: o.exchange,
		})),
		production_buildings: row.productionBuildings,
		daily_profit: money(m.dailyProfit),
		daily_revenue: money(row.revenue),
		daily_running_cost: money(m.runningCost),
		construction_cost: money(row.construction),
		building_cost: money(m.buildingCost),
		break_even_days: days(m.breakEven),
		payback_days_at_5_experts: days(m.payback),
		area_used: row.areaUsed,
		profit_per_area: row.areaUsed
			? money(m.dailyProfit / row.areaUsed)
			: null,
		workforce: row.workforce.map((w) => ({
			type: w.tier,
			required: amount(w.required),
		})),
		market_capacity_bases: capacity,
		market_capacity_limited_by: m.capacityTicker
			? { ticker: m.capacityTicker, side: m.capacitySide }
			: null,
		volume_share_pct:
			capacity !== null && m.marketCapacity > 0
				? money(100 / m.marketCapacity)
				: null,
	};
}

export const rankBases = defineTool({
	name: "rank_bases",
	title: "Rank one-recipe bases (Base ROI)",
	description:
		"Base ROI's recipe rows: a base of one production building type running one recipe, with the app's static layout (habs, storage, plus storage for the stock buffer), on Base ROI's standard planet (rocky, normal conditions, no planet fees or environment materials). Ranked like the app's table: break-even ascending, then daily profit descending, after the app's default filters (fits a WCB visited every 3 days, market capacity at least 0.7 bases, positive profit). Market capacity: how many such bases the market takes (7-day daily traded units ÷ the base's daily output or input, the lower side); volume_share_pct: one base's share of that volume. Extraction and farming bases on real planets (Base ROI's planet rows) are not included. Priced in empire_uuid's CX preference (no faction bonus, as in Base ROI), else per the server instructions' empire rule. Check a row on a real planet with calculate_new_plan.",
	inputSchema: z.object({
		cogc: z
			.enum(["matching", "none"])
			.optional()
			.describe(
				'"matching" (default): each base gets the COGC program of its expertise; "none": no program'
			),
		experts: z
			.union([z.literal("ramp"), z.number().int().min(0).max(5)])
			.optional()
			.describe(
				'"ramp" (default): break-even with experts arriving over time, the engine runs at 5; or a fixed count 0-5'
			),
		buffer_days: z
			.number()
			.int()
			.min(0)
			.max(28)
			.optional()
			.describe(
				"Stock buffer in days (default 10, 0 off): adds storage and half the stock's value to the building cost"
			),
		building: z.string().optional().describe("Only this building, e.g. FP"),
		expertise: z
			.string()
			.optional()
			.describe("Only this expertise, e.g. FOOD_INDUSTRIES"),
		ticker: z
			.string()
			.optional()
			.describe("Only recipes that output this material, e.g. RAT"),
		limit: z
			.number()
			.int()
			.min(1)
			.max(100)
			.optional()
			.describe("Rows returned (default 20)"),
		empire_uuid: uuidArg().optional(),
		price_basis: PriceBasisSchema.optional(),
	}),
	async run(args, { backend }) {
		const [gameData, pricing] = await Promise.all([
			loadGameData(backend),
			loadEmpireCX(backend, args.empire_uuid),
		]);
		const { empire, cx } = pricing;
		const basis = args.price_basis ?? "plan";

		const settings = BaseROISettingsSchema.parse({
			cogc: args.cogc,
			experts: args.experts,
			bufferDays: args.buffer_days,
		});
		const ctx: IPlanContext = {
			...gameData,
			planet: STANDARD_PLANET,
			prices: basisBook(
				basis,
				cx,
				STANDARD_PLANET.planet_natural_id,
				gameData
			),
		};
		const hqCost = hqStepCost(settings.targetPermit, (t) =>
			ctx.prices.getPrice(t, "BUY")
		);

		// filters before the engine: building and expertise on the
		// candidate, ticker on the recipe's outputs
		const building = lower(args.building);
		const expertise = lower(args.expertise)?.replaceAll(" ", "_");
		const ticker = lower(args.ticker);
		const candidates = recipeCandidates(gameData).filter(
			(c) =>
				(!building || c.building.toLowerCase() === building) &&
				(!expertise || c.expertise?.toLowerCase() === expertise) &&
				(!ticker ||
					gameData.recipesByBuilding[c.building]
						?.find((r) => r.recipe_id === c.recipeId)
						?.outputs.some(
							(o) => o.material_ticker.toLowerCase() === ticker
						))
		);

		const rows: IBaseROIRow[] = [];
		for (const c of candidates) {
			try {
				const input = toRowInput(
					c,
					calculateBase(c, ctx, settings, cx?.uuid),
					ctx,
					gameData.getExchange
				);
				rows.push({
					...input,
					metrics: calculateMetrics(input, settings, hqCost),
				});
			} catch {
				// a recipe the engine can't run is no row, as in the app
			}
		}

		const { rows: shown, hidden } = filterRows(rows, [], settings);
		const planned = await getPlannedMaterials(backend).catch(
			() => undefined
		);
		const top = shown
			.slice(0, args.limit ?? 20)
			.map((row) => rowOut(row, planned));
		const best = top[0];
		return {
			text: `${plural(shown.length, "base")} pass Base ROI's filters (of ${rows.length} calculated); returning ${top.length}.${best ? ` Best: ${best.building} ${best.recipe_id}, break-even ${best.break_even_days ?? "never"} days, profit ${best.daily_profit} per day.` : ""}`,
			data: {
				empire: empire
					? { uuid: empire.uuid, name: empire.empire_name }
					: null,
				note:
					basis !== "plan"
						? "Priced with price_basis; Base ROI applies no faction bonus."
						: [pricing.note, "Base ROI applies no faction bonus."]
								.filter(Boolean)
								.join(" "),
				empire_choices: pricing.choices,
				planned_note: planned
					? PLANNED_NOTE
					: "PRUNplanner players' planned production couldn't be loaded.",
				price_basis: basisText(basis, cx),
				settings: {
					cogc: settings.cogc,
					experts: settings.experts,
					buffer_days: settings.bufferDays,
					logistics: `${settings.ship}, visited every ${settings.visitDays} days`,
					min_market_capacity: settings.minMarketCapacity,
				},
				hidden_by_filters: {
					logistics: hidden.logistics,
					market_capacity: hidden.marketCapacity,
					negative_profit: hidden.negative,
				},
				total_shown: shown.length,
				rows: top,
			},
		};
	},
});
