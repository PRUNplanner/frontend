import { z } from "zod";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { empireSurplus } from "@/features/production_chain/engine/chainHave";
import { encodeChain } from "@/features/production_chain/engine/chainUrl";

// Util
import {
	calculate,
	createPlanContext,
	findEmpireCX,
	getCXs,
	getEmpirePlans,
	getEmpires,
	loadEmpireCX,
	loadPlanSetup,
} from "@/mcp/context";
import { getPlanet, loadGameData, resolvePlanetId } from "@/mcp/gameData";
import { basisText, PriceBasisSchema } from "@/mcp/priceBasis";
import { ToolError } from "@/mcp/backend";
import { chainCost, checkPlan } from "@/mcp/chainCost";
import {
	amount,
	defineTool,
	empireUrl,
	money,
	planUrl,
	uuidArg,
} from "@/mcp/tools/shared";

// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { ICheckPlan } from "@/features/production_chain/engine/chainCheck.types";
import type {
	ChainRowSource,
	IChainRow,
} from "@/features/production_chain/engine/chainSolver.types";

const SOURCE_TEXT: Record<ChainRowSource, string> = {
	make: "made",
	buy: "bought",
	extract: "extracted",
	have: "own production",
};

/** what a row costs per day: the rest at its unit cost, own production at CX */
const rowValue = (r: IChainRow) => r.perDay * r.unitCost + r.have * r.price;

export const getProductionCost = defineTool({
	name: "get_production_cost",
	title: "Cost to make a material",
	description:
		"What it costs to make a material, from the Production Chains solver as the Production Chains page computes it (one base, 100 % efficiency, auto experts, both luxuries, byproducts cover demand). Returns the unit cost and its parts (inputs at their own unit cost or the CX buy price, upkeep, wear = construction ÷ 180 per day, fees; a multi-output recipe's cost split by output value), the market price under the same basis and the make-vs-buy difference, the chain's steps (recipe, building, buildings, amount per day for per_day, source: made / bought / extracted / own production) and totals (construction, area, buildings, workforce). With empire_uuid (or plan_uuid) what its plans make beyond their use counts as own production; without either, pricing follows the server instructions' empire rule (pricing_note). raw_source \"extract\" extracts planet resources (O, HE3, SIO only when cheaper than making them) on a typical planet, or on planet (or plan_uuid's planet when extracting), where what can't be extracted is made, or bought without a recipe. Byproducts show their market share.",
	inputSchema: z.object({
		ticker: z.string().describe("Material to make, e.g. RAT"),
		per_day: z
			.number()
			.positive()
			.optional()
			.describe("Units per day, default 1"),
		empire_uuid: uuidArg()
			.optional()
			.describe(
				"Empire whose CX prices and plans' surplus (own production) count"
			),
		plan_uuid: uuidArg()
			.optional()
			.describe(
				"Only this plan's surplus counts as own production (priced in its empire)"
			),
		raw_source: z
			.enum(["buy", "extract"])
			.optional()
			.describe(
				'Raw materials: "buy" (default, as the app) or "extract": on a typical planet, or on planet'
			),
		planet: z
			.string()
			.optional()
			.describe(
				"Planet id or name for the chain's base (default: plan_uuid's planet when extracting, else none)"
			),
		price_basis: PriceBasisSchema.optional(),
	}),
	async run(args, { backend, appUrl }) {
		const ticker = args.ticker.toUpperCase();
		const basis = args.price_basis ?? "plan";
		const gameData = await loadGameData(backend);
		if (!gameData.materials.has(ticker))
			throw new ToolError(`Unknown material ${ticker}.`);

		// own production: one plan's or the empire's surplus
		let cx: CX | undefined;
		let plans: ICheckPlan[] = [];
		let own: Record<string, unknown> | null = null;
		let planetOfPlan: string | null = null;
		if (args.plan_uuid) {
			const setup = await loadPlanSetup(
				backend,
				args.plan_uuid,
				args.empire_uuid
			);
			cx = setup.cx;
			planetOfPlan = setup.plan.planet_natural_id;
			plans = [checkPlan(setup.plan, calculate(setup))];
			own = {
				plan: {
					uuid: setup.plan.uuid,
					name: setup.plan.plan_name,
					url: planUrl(appUrl, setup.plan),
				},
				empire: setup.resolved.empire?.empire_name ?? null,
				note: setup.resolved.note ?? null,
			};
		} else if (args.empire_uuid) {
			const [empires, cxs, list] = await Promise.all([
				getEmpires(backend),
				getCXs(backend),
				getEmpirePlans(backend, args.empire_uuid),
			]);
			const empire = empires.find((e) => e.uuid === args.empire_uuid);
			if (!empire)
				throw new ToolError(`Unknown empire ${args.empire_uuid}.`);
			cx = findEmpireCX(cxs, empire.uuid);
			plans = await Promise.all(
				list.map(async (plan) =>
					checkPlan(
						plan,
						calculatePlan(
							{
								plan,
								empire,
								cxUuid: cx?.uuid,
								recipeOptions: false,
							},
							createPlanContext(
								gameData,
								await getPlanet(
									backend,
									plan.planet_natural_id
								),
								cx
							)
						)
					)
				)
			);
			own = {
				empire: {
					uuid: empire.uuid,
					name: empire.empire_name,
					url: empireUrl(appUrl, empire.uuid),
				},
				plans: plans.length,
			};
		}
		// no plan or empire: priced as calculate_new_plan picks one, no own production
		const pricing =
			args.plan_uuid || args.empire_uuid
				? undefined
				: await loadEmpireCX(backend, undefined);
		if (pricing) cx = pricing.cx;
		const surplus = empireSurplus(plans);
		const planetId = args.planet
			? await resolvePlanetId(backend, args.planet)
			: args.raw_source === "extract"
				? (planetOfPlan ?? undefined)
				: undefined;

		const { input, ctx, result } = await chainCost(backend, gameData, {
			ticker,
			perDay: args.per_day ?? 1,
			cx,
			basis,
			have: surplus,
			rawSource: args.raw_source,
			planetId,
		});

		const target = result.rows[ticker];
		const { totals } = result;
		const parts = target.costParts;
		let note: string | null = null;
		if (target.pending)
			note = `${ticker} is extracted, but no planet in the planet index has it: no cost.`;
		else if (target.source === "extract")
			note = `${ticker} ${ctx.recipesByOutput.get(ticker)?.length ? "is cheaper to extract than to make" : "has no recipe"}: it is extracted on ${target.site!.planetName}${target.typicalSite ? " (a typical planet, 90th percentile)" : ""}, so its cost is the extractor's upkeep, wear and fees.`;
		else if (target.source === "buy")
			note = `${ticker} can neither be made nor extracted: its cost is the market price.`;
		const verb = target.source === "extract" ? "extract" : "make";

		const used = Object.fromEntries(
			Object.entries(input.have ?? {}).filter(
				([t]) => (result.rows[t]?.have ?? 0) > 1e-9
			)
		);
		const query = encodeChain({
			input: { ...input, have: used },
			cx: basis === "plan" ? cx?.uuid : undefined,
		});

		const data = {
			ticker,
			per_day: amount(target.targetPerDay),
			source: SOURCE_TEXT[target.source],
			note,
			price_basis: basisText(basis, cx),
			own_production: own,
			pricing_note: pricing?.note ?? null,
			empire_choices: pricing?.choices,
			unit_cost: money(target.unitCost),
			unit_cost_parts: parts
				? {
						inputs: money(parts.inputs),
						upkeep_and_wear: money(parts.upkeepWear),
						fees: money(parts.fees),
						output_share: amount(parts.share),
					}
				: null,
			market_price: money(target.price),
			market_sell_price: money(target.sellPrice),
			difference: money(target.unitCost - target.price),
			cheaper:
				target.price > 0
					? target.unitCost < target.price
						? "make"
						: "buy"
					: null,
			chain: result.order.map((t) => {
				const r = result.rows[t];
				return {
					ticker: t,
					target: r.target,
					source: SOURCE_TEXT[r.source],
					recipe_id: r.recipe?.recipe_id ?? null,
					building: r.buildingTicker,
					buildings: amount(r.buildings),
					per_day: amount(r.perDay),
					own_production_per_day: amount(r.have),
					byproduct_covered_per_day: amount(r.covered),
					extraction_planet: r.site
						? r.typicalSite
							? `typical: ${r.site.planetName}`
							: r.site.planetName
						: null,
					unit_cost: money(r.unitCost),
					market_price: money(r.price),
					value: money(rowValue(r)),
				};
			}),
			byproducts: result.byproducts.map((b) => ({
				ticker: b.ticker,
				produced: amount(b.produced),
				used: amount(b.used),
				sold: amount(b.sold),
				sell_price: money(b.sellPrice),
				market: b.market
					? {
							exchange: b.market.exchange,
							share_of_daily_volume_pct:
								b.market.sharePct === null
									? null
									: money(b.market.sharePct),
							level: b.market.level,
						}
					: null,
			})),
			totals: {
				construction_cost: money(totals.construction),
				area: amount(totals.area),
				buildings_built: totals.built,
				workforce: Object.fromEntries(
					Object.entries(totals.workforce)
						.filter(([, n]) => n > 0)
						.map(([k, n]) => [k, amount(n)])
				),
				per_day: {
					bought: money(totals.bought),
					own_production: money(totals.own),
					upkeep: money(totals.upkeep),
					wear: money(totals.wear),
					fees: money(totals.fees),
				},
			},
			warnings: {
				cheaper_to_buy: result.warnings.cheaper,
				thin_market: result.warnings.thin,
				cycles: result.warnings.cycles,
			},
			url: `${appUrl}/production-chain?${new URLSearchParams(query)}`,
		};
		return {
			text:
				target.source === "buy"
					? `${ticker} can't be made or extracted; priced ${data.market_price}.`
					: `${ticker}: costs ${data.unit_cost} per unit to ${verb}, priced ${data.market_price} (difference ${data.difference}); ${result.order.length} steps.`,
			data,
		};
	},
});
