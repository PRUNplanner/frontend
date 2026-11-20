import { z } from "zod";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { combineEmpireMaterialIO } from "@/features/empire/util/empireMaterialIO.util";
import { empireSurplus } from "@/features/production_chain/engine/chainHave";
import {
	defaultFilter,
	defaultSort,
	filterPlanets,
	sortPlanets,
} from "@/features/planet_search/planetSearch.engine";

// Util
import {
	createPlanContext,
	findEmpireCX,
	getCXs,
	getEmpirePlans,
	getEmpires,
} from "@/mcp/context";
import {
	getPlanet,
	getPlanetSearchIndex,
	loadGameData,
	preloadPlanets,
} from "@/mcp/gameData";
import { ToolError } from "@/mcp/backend";
import { basisText, PriceBasisSchema } from "@/mcp/priceBasis";
import { chainCost, checkPlan, RESOURCES } from "@/mcp/chainCost";
import {
	amount,
	defineTool,
	empireUrl,
	money,
	uuidArg,
} from "@/mcp/tools/shared";

const SOURCE: Record<string, string> = {
	make: "made",
	buy: "bought",
	extract: "extracted",
	have: "own production",
};

export const checkMakeOrBuy = defineTool({
	name: "check_make_or_buy",
	title: "Make or buy for an empire",
	description:
		"For an empire's biggest net inputs (what it buys most, by value per day): what each would cost to make with the Production Chains solver (its own production counted) against the buy price, the rough daily saving, the market's traded volume and, for raw materials, the planets with the most of it. ROUGH: the chain uses the Production Chains page defaults (one base, 100 % efficiency, no planet fees or COGC), not a real plan; check a candidate with calculate_new_plan before deciding.",
	inputSchema: z.object({
		empire_uuid: uuidArg(),
		top: z.number().int().min(1).max(25).optional().describe("Default 10"),
		price_basis: PriceBasisSchema.optional(),
	}),
	async run(args, { backend, appUrl }) {
		const [empires, cxs, plans, gameData] = await Promise.all([
			getEmpires(backend),
			getCXs(backend),
			getEmpirePlans(backend, args.empire_uuid),
			loadGameData(backend),
		]);
		const empire = empires.find((e) => e.uuid === args.empire_uuid);
		if (!empire) throw new ToolError(`Unknown empire ${args.empire_uuid}.`);
		const cx = findEmpireCX(cxs, empire.uuid);
		const basis = args.price_basis ?? "plan";

		await preloadPlanets(
			backend,
			plans.map((p) => p.planet_natural_id)
		);
		const calculated = await Promise.all(
			plans.map(async (plan) => {
				const planet = await getPlanet(backend, plan.planet_natural_id);
				const calc = calculatePlan(
					{ plan, empire, cxUuid: cx?.uuid, recipeOptions: false },
					createPlanContext(gameData, planet, cx, basis)
				);
				return { plan, calc };
			})
		);
		const combined = combineEmpireMaterialIO(
			calculated.map(({ plan, calc }) => ({
				planetId: plan.planet_natural_id,
				planUuid: plan.uuid,
				planName: plan.plan_name,
				planCOGC: plan.plan_cogc,
				materialIO: calc.result.materialio,
			}))
		);
		const surplus = empireSurplus(
			calculated.map(({ plan, calc }) => checkPlan(plan, calc))
		);
		const inputs = combined
			.filter((m) => m.delta < 0)
			.sort((a, b) => a.deltaPrice - b.deltaPrice)
			.slice(0, args.top ?? 10);

		const rows = [];
		for (const m of inputs) {
			const need = -m.delta;
			const { result, ctx } = await chainCost(backend, gameData, {
				ticker: m.ticker,
				perDay: need,
				cx,
				basis,
				have: surplus,
			});
			const row = result.rows[m.ticker];
			const price = ctx.prices.getPrice(m.ticker, "BUY");
			const buying = need * price;
			const making = need * row.unitCost;
			const universe = gameData.exchanges.get(`${m.ticker}.UNIVERSE`);
			const traded = universe ? universe.sum_traded_30d / 30 : 0;

			let planets:
				| {
						planet_natural_id: string;
						name: string;
						daily_extraction: number;
				  }[]
				| undefined;
			if (RESOURCES.has(m.ticker)) {
				const index = await getPlanetSearchIndex(backend);
				const filter = {
					...defaultFilter(),
					materialGroups: [
						{ op: "all" as const, materials: [m.ticker] },
					],
					surface: ["rocky", "gaseous"] as ("rocky" | "gaseous")[],
				};
				const pctx = { now: Date.now(), refJumps: () => undefined };
				planets = sortPlanets(
					filterPlanets(index, filter, pctx),
					[defaultSort(filter)],
					pctx
				)
					.slice(0, 3)
					.map((p) => ({
						planet_natural_id: p.planet_natural_id,
						name: p.planet_name,
						daily_extraction: amount(
							p.resources.find(
								(r) => r.material_ticker === m.ticker
							)?.daily_extraction ?? 0
						),
					}));
			}

			rows.push({
				ticker: m.ticker,
				needed_per_day: amount(need),
				buying_per_day: money(buying),
				buy_price: money(price),
				cost_to_make_per_unit: money(row.unitCost),
				source_when_making: SOURCE[row.source] ?? row.source,
				recipe_id: row.recipe?.recipe_id ?? null,
				building: row.buildingTicker,
				buildings_needed: amount(row.buildings),
				rough_saving_per_day: money(buying - making),
				rough_margin_pct:
					buying > 0
						? money(((buying - making) / buying) * 100)
						: null,
				construction_cost_of_chain: money(result.totals.construction),
				traded_per_day_universe_30d: amount(traded),
				need_share_of_traded_pct:
					traded > 0 ? money((need / traded) * 100) : null,
				verdict:
					row.source === "buy"
						? "can only be bought"
						: making < buying
							? "cheaper to make (rough)"
							: "cheaper to buy (rough)",
				planets_with_it: planets,
			});
		}

		const data = {
			empire: {
				uuid: empire.uuid,
				name: empire.empire_name,
				url: empireUrl(appUrl, empire.uuid),
			},
			price_basis: basisText(basis, cx),
			note: "Rough numbers: each chain is solved at the Production Chains page defaults (one base, 100 % efficiency, no planet fees or COGC), for the empire's daily need, with its own production counted. Check a candidate with calculate_new_plan on a real planet before deciding.",
			inputs: rows,
		};
		const make = rows.filter((r) =>
			r.verdict.startsWith("cheaper to make")
		);
		return {
			text: `${empire.empire_name}: ${rows.length} biggest inputs; ${make.length} look cheaper to make (rough)${make.length ? `: ${make.map((r) => `${r.ticker} (~${r.rough_saving_per_day}/day)`).join(", ")}` : ""}.`,
			data,
		};
	},
});
