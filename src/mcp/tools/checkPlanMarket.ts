import { z } from "zod";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { MARKET_FLAG_LEVEL, marketCheck } from "@/features/cx/marketCheck.util";
import {
	breakEven,
	priceSensitivity,
	realisticPlan,
	targetFactor,
} from "@/features/planning/util/whatIf.util";

// Util
import { loadPlanSetup } from "@/mcp/context";
import { getSparks, historySummary, loadGameData } from "@/mcp/gameData";
import { calculateNew, NewPlanSchema } from "@/mcp/tools/calculateNewPlan";
import { ToolError } from "@/mcp/backend";
import { basisBook, basisText, PriceBasisSchema } from "@/mcp/priceBasis";
import {
	sizingNotes,
	buildVariant,
	VariantChangesSchema,
	type IVariant,
} from "@/mcp/variant";
import {
	amount,
	argsOf,
	defineTool,
	FIXED_DRIFT_PCT,
	fixedPriceDrift,
	money,
	planUrl,
	uuidArg,
} from "@/mcp/tools/shared";

export const checkPlanMarket = defineTool({
	name: "check_plan_market",
	title: "Check a plan against the market",
	description:
		"Plan check for a saved plan, a variant of it, or an unsaved plan (new_plan, the fields of calculate_new_plan), as in the app: the daily profit buying at ask and selling at bid on each material's exchange, every traded material flagged for thin volume, missing offers or buyers, stale or missing prices (share = the plan's daily amount against the exchange's average daily traded volume), the profit range (how far profit moves when one material's price moves by range_pct, with each material's break-even), the profit at other price bases side by side (profit_at, e.g. each exchange's ask/bid, VWAP 7D vs 30D), and optionally the price one material needs for a target daily profit. Without an exchange (no CX preference and basis plan) ask and bid can't be checked; pass price_basis, e.g. AI1_ASKBID or BEST_ASKBID.",
	inputSchema: z.object({
		plan_uuid: uuidArg()
			.optional()
			.describe("A saved plan (or pass new_plan instead)"),
		new_plan: argsOf(NewPlanSchema)
			.optional()
			.describe("An unsaved plan: calculate_new_plan's arguments"),
		empire_uuid: uuidArg().optional(),
		price_basis: PriceBasisSchema.optional(),
		variant: argsOf(VariantChangesSchema)
			.optional()
			.describe(
				"Check a variant of the plan instead: calculate_plan_variant's change arguments"
			),
		profit_at: z
			.array(PriceBasisSchema)
			.max(12)
			.optional()
			.describe("Price bases to compare the plan's profit at"),
		range_pct: z
			.union([z.literal(10), z.literal(20), z.literal(30), z.literal(50)])
			.optional()
			.describe(
				"Price move for the profit range (default 20, as Plan check opens)"
			),
		target: z
			.object({
				ticker: z.string().describe("Material whose price moves"),
				daily_profit: z.number().describe("Wanted profit per day"),
			})
			.optional(),
	}),
	async run(args, { backend, appUrl }) {
		if (!args.plan_uuid === !args.new_plan)
			throw new ToolError("Pass either plan_uuid or new_plan.");
		if (args.new_plan && args.variant)
			throw new ToolError(
				"variant works with plan_uuid; put the changes into new_plan instead."
			);
		const gameData = await loadGameData(backend);
		let header: { uuid: string | null; name: string; url: string };
		let note: string | undefined;
		let v: Pick<
			IVariant,
			"input" | "ctx" | "cx" | "basis" | "planet" | "notes"
		>;
		if (args.new_plan) {
			const created = await calculateNew(
				backend,
				args.new_plan,
				args.empire_uuid,
				args.price_basis
			);
			v = created;
			header = {
				uuid: null,
				name: `Unsaved plan on ${v.planet.planet_natural_id}`,
				url: `${appUrl}/plan/${v.planet.planet_natural_id}`,
			};
			note =
				[created.pricing?.note, ...sizingNotes(created)]
					.filter(Boolean)
					.join(" ") || undefined;
		} else {
			const setup = await loadPlanSetup(
				backend,
				args.plan_uuid!,
				args.empire_uuid,
				args.price_basis
			);
			note = setup.resolved.note;
			header = {
				uuid: setup.plan.uuid,
				name: setup.plan.plan_name,
				url: planUrl(appUrl, setup.plan),
			};
			v = args.variant
				? await buildVariant(backend, setup, args.variant)
				: {
						input: setup.input,
						ctx: setup.ctx,
						cx: setup.cx,
						basis: setup.basis,
						planet: setup.planet,
						notes: [] as string[],
					};
		}
		const sensitivity = priceSensitivity(v.input, v.ctx);
		// 30-day daily VWAPs on the exchanges the rows are checked against
		const sparks = new Map<
			string,
			Awaited<ReturnType<typeof getSparks>> | undefined
		>();
		const { result } = sensitivity;
		const checks = marketCheck(
			result.materialio,
			v.ctx.prices,
			gameData.getExchange
		);
		const exchangeChecked = checks.some((c) => c.exchange !== "UNIVERSE");
		for (const code of new Set(checks.map((c) => c.exchange)))
			sparks.set(
				code,
				await getSparks(backend, code).catch(() => undefined)
			);
		// as Plan check: ask/bid with a CX preference, or a basis that names one
		const real =
			v.cx || v.basis !== "plan"
				? realisticPlan(v.input, v.ctx, gameData.getExchange)
				: undefined;

		let target = null;
		if (args.target) {
			const ticker = args.target.ticker.toUpperCase();
			const row = sensitivity.rows.find((r) => r.ticker === ticker);
			if (!row)
				throw new ToolError(
					`${ticker} doesn't move this plan's profit (not bought or sold).`
				);
			const type = row.side === "sell" ? "SELL" : "BUY";
			const today = v.ctx.prices.getPrice(ticker, type);
			const factor =
				today > 0
					? targetFactor(
							result.profit,
							row.slope,
							args.target.daily_profit
						)
					: null;
			target = {
				ticker,
				side: row.side,
				daily_profit: args.target.daily_profit,
				price_today: money(today),
				price_needed: factor === null ? null : money(today * factor),
				change_pct: factor === null ? null : money((factor - 1) * 100),
				note:
					factor === null
						? "No price of this material reaches the target."
						: undefined,
			};
		}

		const drift = fixedPriceDrift(
			result.materialio,
			v.ctx.prices,
			gameData.exchanges
		);
		const driftTotal = drift.reduce(
			(s, r) => s + r.profit_overstated_per_day,
			0
		);

		const pct = args.range_pct ?? 20;
		const profitAt = (args.profit_at ?? []).map((basis) => {
			const calc = calculatePlan(v.input, {
				...v.ctx,
				prices: basisBook(
					basis,
					v.cx,
					v.planet.planet_natural_id,
					gameData
				),
			});
			return {
				basis,
				profit_per_day: money(calc.result.profit),
				difference: money(calc.result.profit - result.profit),
			};
		});

		const data = {
			plan: header,
			variant: args.variant ? true : undefined,
			note: [note, ...v.notes].filter(Boolean).join(" ") || null,
			price_basis: basisText(v.basis, v.cx),
			profit_per_day: money(result.profit),
			at_ask_bid: real
				? {
						exchange_checked: exchangeChecked,
						profit_per_day: money(real.calculation.overview.profit),
						difference: money(
							real.calculation.overview.profit -
								sensitivity.overview.profit
						),
						kept_plan_price: {
							no_exchange: [...real.kept.fallback],
							universe_preference: [...real.kept.universe],
							no_ask_or_bid: [...real.kept.zero],
						},
					}
				: {
						note: "No exchange to check: the plan has no CX preference and is priced at Universe VWAPs. Pass price_basis (e.g. AI1_ASKBID, BEST_ASKBID) or profit_at to see ask/bid.",
					},
			profit_at: profitAt.length ? profitAt : undefined,
			// fixed prices that flatter the plan against its exchange
			fixed_price_drift: drift.length
				? {
						note: `Fixed CX preference prices more than ${FIXED_DRIFT_PCT} % under the ask (buying) or over the bid (selling).`,
						profit_overstated_per_day: money(driftTotal),
						materials: drift,
					}
				: undefined,
			profit_range: {
				price_move_pct: pct,
				note: `Profit when one material's price moves by ±${pct} %; break-even is the price change at which profit is 0.`,
				materials: sensitivity.rows.slice(0, 10).map((r) => {
					const impact = (Math.abs(r.slope) * pct) / 100;
					const be = breakEven(result.profit, r.slope);
					return {
						ticker: r.ticker,
						side: r.side,
						profit_change: money(impact),
						range: [
							money(result.profit - impact),
							money(result.profit + impact),
						],
						break_even_pct:
							typeof be === "number"
								? money(be)
								: be === "over"
									? "over +500 %"
									: "never",
					};
				}),
			},
			materials: checks.map((c) => {
				// "all exchanges" says only that no exchange was set: shown once above
				const flags = c.flags.filter((f) => f !== "all_exchanges");
				const universe = c.exchange === "UNIVERSE";
				return {
					ticker: c.ticker,
					delta: amount(c.delta),
					exchange: c.exchange,
					share_of_daily_volume_pct:
						c.sharePct === null ? null : money(c.sharePct),
					traded_7d: amount(c.traded7d),
					traded_30d: amount(c.traded30d),
					daily_vwap_30d: historySummary(
						sparks.get(c.exchange)?.series[c.ticker]
					),
					ask: universe ? null : money(c.ask),
					bid: universe ? null : money(c.bid),
					spread_pct:
						universe || c.spreadPct === null
							? null
							: money(c.spreadPct),
					level: flags.length ? MARKET_FLAG_LEVEL[flags[0]] : null,
					flags,
				};
			}),
			target,
		};
		const flagged = data.materials.filter(
			(c) => c.level === "red" || c.level === "amber"
		);
		return {
			text: `${header.name}${args.variant ? " (variant)" : ""}: profit ${data.profit_per_day} per day${real ? `, ${money(real.calculation.overview.profit)} at ask/bid` : ""}; ${flagged.length} of ${checks.length} materials flagged${flagged.length ? ` (${flagged.map((c) => c.ticker).join(", ")})` : ""}${drift.length ? `; fixed prices overstate profit by about ${money(driftTotal)} per day (${drift.map((r) => r.ticker).join(", ")})` : ""}.`,
			data,
		};
	},
});
