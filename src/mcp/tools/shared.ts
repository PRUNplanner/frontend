import { pathfinder } from "@/features/pathfinding/pathfinder";
import { marketCheck } from "@/features/cx/marketCheck.util";
import { hqStepCost } from "@/features/base_roi/baseROIMetrics";
import { mapPlanetToPlanType } from "@/features/planning_data/planCOGC.util";
import { basisText, type PriceBasis } from "@/mcp/priceBasis";
import {
	calculateVisitation,
	SHIP_SIZES,
	shipDays,
	MAX_EXPERTS_PER_TYPE,
	MAX_EXPERTS_TOTAL,
	getVolumeOfAllStorages,
	getWeightOfAllStorages,
} from "@prunplanner/engine";

// Types & Interfaces
import { z } from "zod";
import type { IBackend } from "@/mcp/backend";
import { PLANNED_NOTE, type IPlannedMaterial } from "@/mcp/gameData";
import type { IPlanSetup, IResolvedEmpire } from "@/mcp/context";
import type {
	IPriceBook,
	IPriceSource,
	PriceType,
	IPlanCalculation,
	IMaterialIO,
	IProductionBuildingRecipe,
} from "@prunplanner/engine";
import type {
	CX,
	Building,
	Exchange,
	Planet,
	Plan,
	PlanEmpireElement,
} from "@prunplanner/engine/schemas";

/** what a tool gets besides its arguments */
export interface IToolEnv {
	backend: IBackend;
	// for `url` fields, e.g. https://prunplanner.org
	appUrl: string;
}

export interface IToolResult {
	text: string;
	data: Record<string, unknown>;
}

export interface ITool<S extends z.ZodObject = z.ZodObject> {
	name: string;
	title: string;
	description: string;
	inputSchema: S;
	/** changes the user's data: "save" (undoable or additive) or "delete" */
	write?: "save" | "delete";
	/** a save that can overwrite what's there (clients may ask first) */
	overwrites?: boolean;
	/** an entry tool: clients that load tools on demand load it at once */
	alwaysLoad?: boolean;
	run(args: z.infer<S>, env: IToolEnv): Promise<IToolResult>;
}

/** keeps a tool's argument types without widening them in the list */
export const defineTool = <S extends z.ZodObject>(tool: ITool<S>): ITool<S> =>
	tool;

/** money and amounts for an assistant: 2 decimals, amounts 4 */
export const money = (v: number): number => Math.round(v * 100) / 100 || 0;
export const amount = (v: number): number => Math.round(v * 10000) / 10000 || 0;

export const planUrl = (appUrl: string, plan: Plan): string =>
	`${appUrl}/plan/${plan.planet_natural_id}/${plan.uuid}`;
export const empireUrl = (appUrl: string, uuid: string): string =>
	`${appUrl}/empire/${uuid}`;

/**
 * Where a price comes from, in words
 * @author jplacht
 */
export function priceSourceText(
	source: IPriceSource,
	basis: PriceBasis = "plan"
): string {
	// a price_basis is built as a temporary preference: say which basis
	if (basis !== "plan" && source.level === "empire_exchange")
		return `${source.exchange} ${source.key === "vwap_7d" ? "VWAP 7D" : source.key === "vwap_30d" ? "VWAP 30D" : source.key} (price_basis ${basis})`;
	if (basis !== "plan" && source.level === "fallback")
		return `no ${basis} price: Universe VWAP 30D (price_basis ${basis})`;
	const where: Record<IPriceSource["level"], string> = {
		planet_ticker: "fixed price, planet material preference",
		empire_ticker: "fixed price, empire material preference",
		planet_exchange: "planet exchange preference",
		empire_exchange: "empire exchange preference",
		fallback: "no preference: Universe VWAP 30D",
		unresolved: "no price found (0)",
	};
	const key: Record<string, string> = {
		vwap_7d: "VWAP 7D",
		vwap_30d: "VWAP 30D",
		ask: "ask",
		bid: "bid",
	};
	return source.exchange && source.key && source.level !== "fallback"
		? `${source.exchange} ${key[source.key]} (${where[source.level]})`
		: where[source.level];
}

const priceType = (delta: number): PriceType => (delta > 0 ? "SELL" : "BUY");

/**
 * Material i/o per day with unit price, value and price source
 * @author jplacht
 */
export function materialLines(
	materialio: IMaterialIO[],
	book: IPriceBook,
	basis: PriceBasis = "plan"
) {
	return materialio.map((m) => ({
		ticker: m.ticker,
		input: amount(m.input),
		output: amount(m.output),
		delta: amount(m.delta),
		unit_price: money(m.delta ? Math.abs(m.price / m.delta) : 0),
		value: money(m.price),
		price_source: priceSourceText(
			book.getPriceSource(m.ticker, priceType(m.delta)),
			basis
		),
	}));
}

/**
 * Construction materials of every building (production and
 * infrastructure, core module included) summed per material, priced at
 * the BUY price the construction cost uses
 * @author jplacht
 */
export function constructionMaterials(
	calc: IPlanCalculation,
	book: IPriceBook,
	basis: PriceBasis = "plan"
) {
	const totals = new Map<string, number>();
	for (const building of calc.result.constructionMaterials)
		for (const m of building.materials)
			totals.set(
				m.ticker,
				(totals.get(m.ticker) ?? 0) + m.input * building.amount
			);
	return [...totals.entries()]
		.map(([ticker, total]) => {
			const unit = book.getPrice(ticker, "BUY");
			return {
				ticker,
				amount: amount(total),
				unit_price: money(unit),
				value: money(unit * total),
				price_source: priceSourceText(
					book.getPriceSource(ticker, "BUY"),
					basis
				),
			};
		})
		.sort((a, b) => a.ticker.localeCompare(b.ticker));
}

/**
 * What the base ships per day and how long its storage holds it, as the
 * Visitation frequency tool shows
 * @author jplacht
 */
export function shipping(calc: IPlanCalculation) {
	const v = calculateVisitation(calc.result);
	const weight = getWeightOfAllStorages(calc.result.storage);
	const volume = getVolumeOfAllStorages(calc.result.storage);
	return {
		import_weight_t: amount(v.dailyWeightImport),
		import_volume_m3: amount(v.dailyVolumeImport),
		export_weight_t: amount(v.dailyWeightExport),
		export_volume_m3: amount(v.dailyVolumeExport),
		storage_days: Number.isFinite(v.storageFilled)
			? amount(v.storageFilled)
			: null,
		storage_capacity_t: weight,
		storage_capacity_m3: volume,
		// the Visitation frequency tool's ships: a visit both brings the
		// imports and takes the exports, so the side that fills first counts
		trips_per_week: Object.fromEntries(
			SHIP_SIZES.map((ship) => {
				const d = shipDays(ship, v);
				const days = Math.min(d.exportDays, d.importDays);
				return [
					`${ship.weight}t_${ship.volume}m3`,
					Number.isFinite(days) && days > 0 ? money(7 / days) : 0,
				];
			})
		),
		// the side that fills first
		storage_limited_by:
			v.dailyWeight > 0 || v.dailyVolume > 0
				? weight / v.dailyWeight <= volume / v.dailyVolume
					? "weight"
					: "volume"
				: null,
	};
}

/** the plan's key figures per day, as the plan page shows them */
export function figures(calc: IPlanCalculation) {
	const { result, overview } = calc;
	return {
		revenue: money(result.revenue),
		cost: money(result.cost),
		profit: money(result.profit),
		production_fees: money(overview.dailyProductionFeeCost),
		degradation: money(overview.dailyDegradationCost),
		construction_cost: money(overview.totalConstructionCost),
		roi_days: Number.isFinite(overview.roi) ? money(overview.roi) : null,
	};
}

/** workforce per type with any requirement or capacity */
export function workforce(calc: IPlanCalculation) {
	return Object.values(calc.result.workforce)
		.filter((w) => w.required || w.capacity)
		.map((w) => ({
			type: w.name,
			required: amount(w.required),
			capacity: amount(w.capacity),
			left: amount(w.left),
			// what the plan page shows per tier: beds and luxuries together
			efficiency_pct: money(w.efficiency * 100),
		}));
}

/**
 * A calculation's details, shared by saved and unsaved plans: empire,
 * price basis, money per day, buildings, workforce, area, material i/o,
 * construction materials and shipping
 * @author jplacht
 */
export function calculationDetails(
	calc: IPlanCalculation,
	prices: IPriceBook,
	cx: CX | undefined,
	resolved: IResolvedEmpire,
	basis: PriceBasis = "plan",
	planet?: Planet,
	buildings?: ReadonlyMap<string, Building>,
	// exchange data by ticker id, for the fixed-price drift warning
	exchanges?: ReadonlyMap<string, Exchange>
) {
	return {
		empire: resolved.empire
			? {
					uuid: resolved.empire.uuid,
					name: resolved.empire.empire_name,
					faction: resolved.empire.empire_faction,
				}
			: null,
		note: resolved.note ?? null,
		price_basis: basisText(basis, cx),
		per_day: figures(calc),
		buildings: calc.result.production.buildings.map((b) => ({
			ticker: b.name,
			amount: b.amount,
			efficiency: amount(b.totalEfficiency),
			efficiency_factors: Object.fromEntries(
				b.efficiencyElements.map((e) => [
					e.efficiencyType,
					amount(e.value),
				])
			),
			recipes: b.activeRecipes.map((r) => ({
				recipe_id: r.recipeId,
				amount: r.amount,
				daily_share: amount(r.dailyShare),
				...runTime(r),
				...orderEconomics(b.amount, r),
			})),
			daily_production_fee: money(b.dailyProductionFee),
			// the plan page's per-building ȼ/day: output value minus inputs,
			// workforce, wear and fees; negative for an idle building
			per_day_profit: money(b.dailyRevenue),
		})),
		infrastructure: Object.fromEntries(
			Object.entries(calc.result.infrastructure).filter(([, n]) => n > 0)
		),
		workforce: workforce(calc),
		area: calc.result.area,
		material_io: materialLines(calc.result.materialio, prices, basis),
		construction_materials: constructionMaterials(calc, prices, basis),
		shipping: shipping(calc),
		cx_matched: cxMatch(calc.result.materialio, prices, cx, basis),
		cogc:
			planet && buildings
				? {
						plan_assumes: calc.result.cogc,
						planet_runs: cogcBoost(
							mapPlanetToPlanType(
								planet.active_cogc_program_type
							),
							buildings
						),
					}
				: undefined,
		warnings: [
			...warnings(calc),
			...(planet && buildings
				? cogcWarnings(calc, planet, buildings)
				: []),
			...[
				cxMatch(calc.result.materialio, prices, cx, basis)?.warning,
			].filter((w): w is string => !!w),
			...(exchanges
				? fixedPriceDriftWarning(
						fixedPriceDrift(
							calc.result.materialio,
							prices,
							exchanges
						)
					)
				: []),
		],
	};
}

/**
 * An argument that takes another tool's arguments: listed as a plain object
 * (its description names the tool), checked with that tool's schema here.
 * Clients load every tool definition, so a schema embedded twice costs
 * twice; validation and the run's types stay the same
 * @author jplacht
 */
export const argsOf = <S extends z.ZodObject>(schema: S) =>
	z.looseObject({}).pipe(schema);

/** the detail argument of the tools that return a plan or a planet */
export const detailArg = (full: string) =>
	z
		.enum(["summary", "full"])
		.optional()
		.describe(`"full" adds ${full}; default "summary"`);

export const PLAN_FULL_DETAIL =
	"per-order economics, material input/output with prices and sources, construction materials";

/**
 * A plan result's key figures (detail "summary"): money, buildings with
 * their recipes, net material flows, workforce, area, shipping, COGC and
 * warnings; per-order economics, prices per material and construction
 * materials stay in detail "full" (the result as calculationDetails builds it)
 * @author jplacht
 */
export function summarizeDetails<
	T extends ReturnType<typeof calculationDetails>,
>(details: T) {
	const { construction_materials, ...rest } = details;
	return {
		...rest,
		buildings: details.buildings.map((b) => ({
			ticker: b.ticker,
			amount: b.amount,
			efficiency: b.efficiency,
			efficiency_factors: b.efficiency_factors,
			recipes: b.recipes.map((r) => ({
				recipe_id: r.recipe_id,
				amount: r.amount,
				hours_per_run: r.hours_per_run,
				profit_per_hour: r.profit_per_hour,
			})),
			per_day_profit: b.per_day_profit,
		})),
		material_io: details.material_io.map((m) => ({
			ticker: m.ticker,
			delta: m.delta,
			value: m.value,
		})),
		construction_materials_count: construction_materials.length,
		detail: `summary; detail "full" adds ${PLAN_FULL_DETAIL}`,
	};
}

/**
 * The full plan result for get_plan
 * @author jplacht
 */
export function planDetails(
	setup: IPlanSetup,
	calc: IPlanCalculation,
	appUrl: string
) {
	const { plan, planet, resolved, cx, ctx } = setup;
	return {
		plan: {
			uuid: plan.uuid,
			name: plan.plan_name,
			planet: plan.planet_natural_id,
			planet_name: planet.planet_name,
			cogc: plan.plan_cogc,
			corphq: plan.plan_corphq,
			url: planUrl(appUrl, plan),
		},
		...calculationDetails(
			calc,
			ctx.prices,
			cx,
			resolved,
			setup.basis,
			planet,
			setup.gameData.buildings,
			setup.gameData.exchanges
		),
	};
}

/**
 * How long one run of an order takes in its building (the recipe's time
 * after the building's efficiency, as the COGM tool uses it) and what one
 * building earns per hour running it, so orders compare per building-hour
 * @author jplacht
 */
export function runTime(order: IProductionBuildingRecipe): {
	hours_per_run: number | null;
	profit_per_hour: number | null;
} {
	const c = order.cogm;
	if (!c || !Number.isFinite(c.runtime) || c.runtime <= 0)
		return { hours_per_run: null, profit_per_hour: null };
	const hours = c.runtime / 3_600_000;
	return {
		hours_per_run: amount(hours),
		profit_per_hour: money(c.totalProfit / hours),
	};
}

/**
 * An order's money as the app's COGM tool calculates it, per run of one
 * building and per day for all of them
 * @author jplacht
 */
export function orderEconomics(
	buildingAmount: number,
	order: IProductionBuildingRecipe
) {
	const c = order.cogm;
	if (!c) return {};
	const runsPerDay =
		c.runtimeShare > 0
			? (buildingAmount * order.dailyShare) / c.runtimeShare
			: 0;
	return {
		runs_per_day: amount(runsPerDay),
		per_run: {
			revenue: money(c.outputRevenue),
			inputs: money(c.inputTotal),
			workforce: money(c.workforceCost),
			degradation: money(c.degradationShare),
			production_fee: money(c.productionFee),
			cost: money(c.totalCost),
			profit: money(c.totalProfit),
		},
		per_day: {
			revenue: money(c.outputRevenue * runsPerDay),
			cost: money(c.totalCost * runsPerDay),
			profit: money(c.totalProfit * runsPerDay),
		},
		cogm: c.outputCOGM.map((o) => ({
			ticker: o.ticker,
			cost_per_unit: money(o.costTotal),
		})),
	};
}

/**
 * The planet's most recent COGC program when none runs now (programs are
 * voted weekly; a gap or old data leaves none active)
 * @author jplacht
 */
export function lastProgram(planet: Planet) {
	const last = [...planet.cogc_programs]
		.filter((c) => c.end_epochms <= Date.now())
		.sort((a, b) => b.end_epochms - a.end_epochms)[0];
	const program = last ? mapPlanetToPlanType(last.program_type) : "---";
	if (!last || program === "---") return null;
	return {
		program,
		ended_days_ago:
			Math.round(((Date.now() - last.end_epochms) / 86_400_000) * 10) /
			10,
	};
}

/**
 * COGC problems: the plan assumes another program than the planet runs, or
 * the planet's program lifts none of the plan's buildings
 * @author jplacht
 */
export function cogcWarnings(
	calc: IPlanCalculation,
	planet: Planet,
	buildings: ReadonlyMap<string, Building>
): string[] {
	const out: string[] = [];
	const running = mapPlanetToPlanType(planet.active_cogc_program_type);
	const name = planet.planet_name || planet.planet_natural_id;
	if (running !== calc.result.cogc)
		out.push(
			`The plan assumes COGC ${calc.result.cogc}, but ${name} runs ${running} now (programs are voted weekly).`
		);
	const boost = cogcBoost(running, buildings);
	const lifted = calc.result.production.buildings.some((b) =>
		b.efficiencyElements.some((e) => e.efficiencyType === "COGC")
	);
	if (
		boost &&
		running === calc.result.cogc &&
		!lifted &&
		calc.result.production.buildings.length
	)
		out.push(
			`${name} runs ${running} (+${boost.bonus_pct} % for ${boost.lifts}), but none of the plan's buildings get it. Bases usually line up with the planet's COGC program.`
		);
	// no program now: say what it ran last, often the next one too
	const last = running === "---" ? lastProgram(planet) : null;
	if (last && calc.result.production.buildings.length) {
		const lastBoost = cogcBoost(last.program, buildings)!;
		const wouldGet = lastBoost.buildings
			? calc.result.production.buildings.some((b) =>
					lastBoost.buildings!.includes(b.name)
				)
			: true;
		out.push(
			`${name} runs no COGC program now; its last one was ${last.program} (ended ${last.ended_days_ago} days ago, +${lastBoost.bonus_pct} % for ${lastBoost.lifts}). ${wouldGet ? "Some of the plan's buildings would get it." : "None of the plan's buildings would get it."} Pass cogc to calculate with it.`
		);
	}
	return out;
}

/**
 * Plan problems an assistant should mention first
 * @author jplacht
 */
/**
 * What the base permits a change takes cost: an empire's free permits
 * (Permits Total − Permits Used, as set on the Empire page) first, then one
 * HQ upgrade per permit, priced like Base ROI (permit N takes HQ level
 * N − 1). A plan's area permits count against the same pool, as the Empire
 * page adds them up. Null without an empire or when no permit is needed
 * @author jplacht
 */
export function permitCost(
	empire:
		| Pick<
				PlanEmpireElement,
				"empire_permits_used" | "empire_permits_total"
		  >
		| undefined,
	needed: number,
	prices: IPriceBook,
	profitPerDay: number,
	constructionCost: number
) {
	if (!empire || needed <= 0) return null;
	const free = Math.max(
		0,
		empire.empire_permits_total - empire.empire_permits_used
	);
	const upgrades = Math.max(0, needed - free);
	let cost = 0;
	for (let i = 1; i <= upgrades; i++)
		cost += hqStepCost(empire.empire_permits_total + i, (t) =>
			prices.getPrice(t, "BUY")
		);
	const total = constructionCost + cost;
	return {
		permits_needed: needed,
		free_permits: free,
		hq_upgrades: upgrades,
		hq_upgrade_cost: money(cost),
		payback_days_with_permits:
			total <= 0
				? 0
				: profitPerDay > 0
					? money(total / profitPerDay)
					: null,
		note: `From the empire's Permits Used/Total (${empire.empire_permits_used} of ${empire.empire_permits_total}); each further permit is an HQ upgrade, priced at its materials' buy prices.`,
	};
}

/** what a market block in a what-if result means */
export const MARKET_NOTE = `share_of_daily_volume_pct: the plan's daily amount against the exchange's average daily traded volume over 30 days (as Plan check; 1 % and up, biggest first, at most 10). ${PLANNED_NOTE}`;

/**
 * The plan's market footprint for what-if results: each traded material's
 * share of its exchange's average daily traded volume (30 days, as Plan
 * check measures it) and what PRUNplanner players' empires plan of it per
 * day, the biggest shares first (1 % and up, at most 10)
 * @author jplacht
 */
export function marketFootprint(
	materialio: IMaterialIO[],
	prices: IPriceBook,
	getExchange: (tickerId: string) => Exchange,
	planned: ReadonlyMap<string, IPlannedMaterial> | undefined
) {
	return marketCheck(materialio, prices, getExchange)
		.filter((c) => c.sharePct !== null && c.sharePct >= 1)
		.sort((a, b) => b.sharePct! - a.sharePct!)
		.slice(0, 10)
		.map((c) => {
			const p = planned?.get(c.ticker);
			return {
				ticker: c.ticker,
				side: c.delta > 0 ? ("sell" as const) : ("buy" as const),
				amount_per_day: amount(Math.abs(c.delta)),
				exchange: c.exchange,
				share_of_daily_volume_pct: money(c.sharePct!),
				planned_by_players_per_day: p
					? {
							production: amount(p.production),
							consumption: amount(p.consumption),
						}
					: null,
			};
		});
}

// a fixed price this far (%) on the flattering side of the market is flagged
export const FIXED_DRIFT_PCT = 10;

/**
 * Fixed prices (a CX preference's material values) that make the plan look
 * better than its exchange: buying more than FIXED_DRIFT_PCT under the ask,
 * or selling more than that over the bid, with what it adds to the daily
 * profit. Prices checked against the Universe (no single ask/bid) are left
 * out
 * @author jplacht
 */
export function fixedPriceDrift(
	materialio: IMaterialIO[],
	prices: IPriceBook,
	exchanges: ReadonlyMap<string, Exchange>
) {
	return materialio.flatMap((m) => {
		if (!m.delta) return [];
		const type = priceType(m.delta);
		const source = prices.getPriceSource(m.ticker, type);
		if (
			(source.level !== "planet_ticker" &&
				source.level !== "empire_ticker") ||
			source.volume === "UNIVERSE"
		)
			return [];
		const data = exchanges.get(`${m.ticker}.${source.volume}`);
		const market = type === "BUY" ? data?.ask : data?.bid;
		const fixed = prices.getPrice(m.ticker, type);
		if (!market || !fixed) return [];
		// > 0: the fixed price flatters the profit
		const gap = type === "BUY" ? market - fixed : fixed - market;
		if ((gap / market) * 100 <= FIXED_DRIFT_PCT) return [];
		return [
			{
				ticker: m.ticker,
				side: type === "BUY" ? ("buy" as const) : ("sell" as const),
				fixed_price: money(fixed),
				market: `${source.volume} ${type === "BUY" ? "ask" : "bid"}`,
				market_price: money(market),
				profit_overstated_per_day: money(gap * Math.abs(m.delta)),
			},
		];
	});
}

/** the drift rows in one warning, or nothing */
export function fixedPriceDriftWarning(
	rows: ReturnType<typeof fixedPriceDrift>
): string[] {
	if (!rows.length) return [];
	const total = rows.reduce((s, r) => s + r.profit_overstated_per_day, 0);
	return [
		`Fixed prices more than ${FIXED_DRIFT_PCT} % off the market in the plan's favour: ${rows.map((r) => `${r.ticker} ${r.side} at ${r.fixed_price} vs ${r.market} ${r.market_price}`).join(", ")}. At market prices profit is about ${money(total)} per day lower. Update the CX preference's fixed prices, or see check_plan_market.`,
	];
}

export function warnings(calc: IPlanCalculation): string[] {
	const out: string[] = [];
	const { area, workforce, production } = calc.result;
	if (area.areaLeft < 0) {
		const production_ = production.buildings.reduce(
			(s, b) => s + b.areaUsed,
			0
		);
		const biggest = [...production.buildings]
			.sort((a, b) => b.areaUsed - a.areaUsed)
			.slice(0, 3)
			.map((b) => `${b.amount} ${b.name} ${amount(b.areaUsed)}`);
		out.push(
			`Area over the limit: ${amount(area.areaUsed)} used of ${amount(area.areaTotal)} (${amount(-area.areaLeft)} too much). Biggest users: ${biggest.join(", ")}; habs, storage and core module ${amount(area.areaUsed - production_)}. Try habs "least_area" in calculate_plan_variant, fewer buildings or more permits.`
		);
	}
	// the engine gives no bonus outside 0–5 per type (calculateExpertBonus)
	const experts = Object.values(calc.result.experts).filter(
		(e) => e.amount > 0
	);
	const expertTotal = experts.reduce((n, e) => n + e.amount, 0);
	const overType = experts.filter((e) => e.amount > MAX_EXPERTS_PER_TYPE);
	if (overType.length || expertTotal > MAX_EXPERTS_TOTAL)
		out.push(
			`Experts over the game's limits (${MAX_EXPERTS_PER_TYPE} per type, ${MAX_EXPERTS_TOTAL} per base): ${experts.map((e) => `${e.amount} ${e.name.replaceAll("_", " ")}`).join(", ")}.${overType.length ? ` More than ${MAX_EXPERTS_PER_TYPE} of a type gives that type no bonus at all.` : ""} Set experts in calculate_plan_variant, or "auto".`
		);
	for (const w of Object.values(workforce))
		if (w.left < 0)
			out.push(
				`${amount(-w.left)} ${w.name}s without housing (${amount(w.required)} needed, ${amount(w.capacity)} housed); buildings run slower.`
			);
	for (const b of production.buildings) {
		if (b.amount > 0 && b.totalEfficiency === 0)
			out.push(
				`${b.amount} ${b.name} at 0 % efficiency: they produce nothing but cost upkeep and degrade.`
			);
		if (b.amount > 0 && b.activeRecipes.length === 0)
			out.push(`${b.amount} ${b.name} without a recipe: idle.`);
		for (const r of b.activeRecipes) {
			const e = orderEconomics(b.amount, r);
			if (e.per_day && e.per_day.profit < 0)
				out.push(
					`${b.name} order ${r.recipeId} loses ${money(-e.per_day.profit)} per day (costs more than its outputs sell for).`
				);
		}
	}
	return out;
}

/**
 * How many traded materials a CX preference priced, as opposed to the
 * Universe VWAP 30D fallback; a warning when it priced none
 * @author jplacht
 */
export function cxMatch(
	materialio: IMaterialIO[],
	book: IPriceBook,
	cx: CX | undefined,
	basis: PriceBasis
): { matched: number; of: number; warning?: string } | undefined {
	if (!cx || basis !== "plan") return undefined;
	const traded = materialio.filter((m) => m.delta !== 0);
	const matched = traded.filter(
		(m) =>
			!["fallback", "unresolved"].includes(
				book.getPriceSource(m.ticker, priceType(m.delta)).level
			)
	).length;
	return {
		matched,
		of: traded.length,
		warning:
			traded.length && matched === 0
				? `CX preference "${cx.cx_name}" matched 0 of ${traded.length} traded materials: every price is the Universe VWAP 30D fallback. Set exchange preferences in the app or pass price_basis.`
				: undefined,
	};
}

const WORKFORCE_PROGRAMS: Record<string, keyof Building> = {
	PIONEERS: "pioneers",
	SETTLERS: "settlers",
	TECHNICIANS: "technicians",
	ENGINEERS: "engineers",
	SCIENTISTS: "scientists",
};

/**
 * What a COGC program lifts, as the engine applies it (efficiency.ts): an
 * expertise program +25 % for buildings of that expertise, a workforce
 * program +10 % for buildings employing that tier
 * @author jplacht
 */
export function cogcBoost(
	program: string | null | undefined,
	buildings: ReadonlyMap<string, Building>
) {
	if (!program || program === "---") return null;
	const tier = WORKFORCE_PROGRAMS[program];
	const lifted = [...buildings.values()]
		.filter((b) =>
			tier ? (b[tier] as number) > 0 : b.expertise === program
		)
		.map((b) => b.building_ticker)
		.sort();
	return {
		program,
		bonus_pct: tier ? 10 : 25,
		lifts: tier
			? `every building employing ${tier} (${lifted.length} buildings)`
			: `${program} buildings: ${lifted.join(", ")}`,
		buildings: tier ? undefined : lifted,
	};
}

export const EXCHANGE_SYSTEMS = (() => {
	const pf = pathfinder();
	return {
		AI1: pf.systemidAI1,
		CI1: pf.systemidCI1,
		IC1: pf.systemidIC1,
		NC1: pf.systemidNC1,
	};
})();

/**
 * Jumps from an exchange's system to every system (the app's pathfinder)
 * @author jplacht
 */
export const exchangeJumps = (code: keyof typeof EXCHANGE_SYSTEMS) =>
	pathfinder().getJumpsFrom(EXCHANGE_SYSTEMS[code]);

/**
 * The four exchanges by jumps from a planet's system, nearest first, as
 * Planet Search's exchange distance (the app's pathfinder)
 * @author jplacht
 */
export function nearestExchanges(systemId: string) {
	const pf = pathfinder();
	return Object.entries(EXCHANGE_SYSTEMS)
		.map(([exchange, system]) => ({
			exchange,
			jumps: pf.getJumpsFrom(system).get(systemId) ?? null,
		}))
		.sort((a, b) => (a.jumps ?? Infinity) - (b.jumps ?? Infinity));
}

/** "1 plan", "2 plans" */
export const plural = (n: number, word: string): string =>
	`${n} ${word}${n === 1 ? "" : "s"}`;

export const UUID =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A uuid argument: checked here, but listed to the client as format
 * "uuid" only. z.uuid() adds a 178-character pattern to every uuid field,
 * about 2,000 tokens over the tool list that clients load each conversation
 */
export const uuidArg = () =>
	z
		.string()
		.refine((v) => UUID.test(v), "Must be a uuid")
		.meta({ format: "uuid" });
