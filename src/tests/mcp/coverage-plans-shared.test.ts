// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// Engine
import { calculatePlan } from "@prunplanner/engine";

// MCP
import { createBackend } from "@/mcp/backend";
import { calculate, loadPlanSetup, type IPlanSetup } from "@/mcp/context";
import { PROMPTS } from "@/mcp/prompts";
import { applyPlanFields, emptyPlanData, fitHabs } from "@/mcp/tools/planEdit";
import {
	calculationDetails,
	cogcBoost,
	cogcWarnings,
	figures,
	lastProgram,
	materialLines,
	orderEconomics,
	priceSourceText,
	shipping,
	warnings,
} from "@/mcp/tools/shared";
import { API_KEY, PLAN_UUID, fakeBackend } from "@/tests/mcp/fakeBackend";

// Types & Interfaces
import type {
	IPriceBook,
	IPriceSource,
	IPlanCalculation,
	IProductionBuildingRecipe,
} from "@prunplanner/engine";
import type { Planet } from "@prunplanner/engine/schemas";

const DAY = 86_400_000;
let setup: IPlanSetup;
let calc: IPlanCalculation;

beforeEach(async () => {
	const backend = createBackend({
		apiUrl: "http://backend",
		apiKey: API_KEY,
		userAgent: "test",
		fetch: fakeBackend().fetch,
	});
	setup = await loadPlanSetup(backend, PLAN_UUID, undefined);
	calc = calculate(setup);
});

/** the plan calculated with other plan data */
const withData = (data: IPlanSetup["plan"]["plan_data"], cogc = "---") =>
	calculatePlan(
		{
			...setup.input,
			plan: {
				...setup.input.plan,
				plan_cogc: cogc as never,
				plan_data: data,
			},
		},
		setup.ctx
	);

const source = (s: Partial<IPriceSource>): IPriceSource => ({
	level: "empire_exchange",
	exchange: "NC1",
	key: "vwap_7d",
	zero: false,
	volume: "NC1",
	...s,
});

describe("shared: price sources", () => {
	it("names the price_basis key and its fallback", () => {
		expect(priceSourceText(source({ key: "vwap_7d" }), "NC1_7D")).toBe(
			"NC1 VWAP 7D (price_basis NC1_7D)"
		);
		expect(priceSourceText(source({ key: "vwap_30d" }), "NC1_30D")).toBe(
			"NC1 VWAP 30D (price_basis NC1_30D)"
		);
		expect(priceSourceText(source({ key: "ask" }), "NC1_ASKBID")).toBe(
			"NC1 ask (price_basis NC1_ASKBID)"
		);
		expect(
			priceSourceText(
				source({ level: "fallback", exchange: null, key: null }),
				"AI1_7D"
			)
		).toBe("no AI1_7D price: Universe VWAP 30D (price_basis AI1_7D)");
		// the plan's own preference: where it comes from, in words
		expect(priceSourceText(source({ level: "planet_exchange" }))).toBe(
			"NC1 VWAP 7D (planet exchange preference)"
		);
	});

	it("a material line without a daily delta has no unit price", () => {
		const book = {
			getPriceSource: () => source({}),
		} as unknown as IPriceBook;
		const [line] = materialLines(
			[
				{ ticker: "RAT", input: 2, output: 2, delta: 0, price: 0 },
			] as never,
			book
		);
		expect(line).toMatchObject({ ticker: "RAT", delta: 0, unit_price: 0 });
	});
});

describe("shared: figures, shipping and orders", () => {
	it("an empty base: no cargo, no payback", () => {
		const empty = withData(emptyPlanData());
		expect(shipping(empty)).toMatchObject({
			import_weight_t: 0,
			export_weight_t: 0,
			storage_days: null,
			storage_limited_by: null,
		});
		// no profit: never pays back
		expect(figures(empty).roi_days).toBeNull();
		expect(warnings(empty)).toEqual([]);
	});

	it("order economics: none without cogm, no runs without runtime", () => {
		const order = calc.result.production.buildings[0].activeRecipes[0];
		expect(
			orderEconomics(1, { ...order, cogm: undefined } as never)
		).toEqual({});
		const idle = orderEconomics(2, {
			...order,
			cogm: { ...order.cogm!, runtimeShare: 0 },
		} as IProductionBuildingRecipe);
		expect(idle.runs_per_day).toBe(0);
		expect(idle.per_day).toEqual({ revenue: 0, cost: 0, profit: 0 });
	});

	it("warns about buildings at 0 % efficiency", () => {
		const [b, ...rest] = calc.result.production.buildings;
		const broken = {
			...calc,
			result: {
				...calc.result,
				production: {
					...calc.result.production,
					buildings: [{ ...b, totalEfficiency: 0 }, ...rest],
				},
			},
		} as IPlanCalculation;
		expect(warnings(broken)).toContain(
			`${b.amount} ${b.name} at 0 % efficiency: they produce nothing but cost upkeep and degrade.`
		);
	});

	it("details without a planet: no COGC block or COGC warnings", () => {
		const details = calculationDetails(calc, setup.ctx.prices, undefined, {
			empire: undefined,
		});
		expect(details.cogc).toBeUndefined();
		expect(details.empire).toBeNull();
		expect(details.note).toBeNull();
		expect(details.cx_matched).toBeUndefined();
		expect(details.warnings.join(" ")).not.toContain("COGC");
	});
});

describe("shared: COGC", () => {
	it("a workforce program lifts every building employing the tier", () => {
		const boost = cogcBoost("PIONEERS", setup.gameData.buildings)!;
		expect(boost.bonus_pct).toBe(10);
		expect(boost.buildings).toBeUndefined();
		const employing = [...setup.gameData.buildings.values()].filter(
			(b) => b.pioneers > 0
		).length;
		expect(boost.lifts).toBe(
			`every building employing pioneers (${employing} buildings)`
		);
		expect(cogcBoost("---", setup.gameData.buildings)).toBeNull();
		expect(cogcBoost(null, setup.gameData.buildings)).toBeNull();
	});

	it("no past program: no last program", () => {
		const future = {
			...setup.planet,
			cogc_programs: [
				{
					program_type: "ADVERTISING_METALLURGY",
					start_epochms: Date.now() + DAY,
					end_epochms: Date.now() + 8 * DAY,
				},
			],
		} as Planet;
		expect(lastProgram(future)).toBeNull();
		expect(lastProgram({ ...setup.planet, cogc_programs: [] })).toBeNull();
	});

	it("last program: a workforce one, and one none of the buildings get", () => {
		const ended = (type: string) =>
			({
				...setup.planet,
				planet_name: "",
				active_cogc_program_type: null,
				cogc_programs: [
					{
						program_type: type,
						start_epochms: Date.now() - 9 * DAY,
						end_epochms: Date.now() - 2 * DAY,
					},
				],
			}) as Planet;
		const workforce = cogcWarnings(
			calc,
			ended("WORKFORCE_PIONEERS"),
			setup.gameData.buildings
		).join(" ");
		// an unnamed planet goes by its id
		expect(workforce).toContain(
			`${setup.planet.planet_natural_id} runs no COGC program now; its last one was PIONEERS (ended 2 days ago, +10 %`
		);
		expect(workforce).toContain(
			"Some of the plan's buildings would get it."
		);
		const metallurgy = cogcWarnings(
			calc,
			ended("ADVERTISING_METALLURGY"),
			setup.gameData.buildings
		).join(" ");
		expect(metallurgy).toContain("its last one was METALLURGY");
		expect(metallurgy).toContain(
			"None of the plan's buildings would get it."
		);
	});
});

describe("planEdit: plan fields", () => {
	it("adds missing experts and keeps a luxury not given", () => {
		const data = {
			...emptyPlanData(),
			experts: [],
			workforce: [{ type: "pioneer", lux1: false, lux2: true }],
		} as never;
		const plan = applyPlanFields(
			{ ...setup.input.plan, plan_data: data },
			{
				experts: [{ type: "Metallurgy", amount: 2 }],
				luxuries: [
					{ type: "pioneer", lux2: false },
					// not in the plan's workforce: skipped
					{ type: "scientist", lux1: true },
				],
			},
			setup.gameData,
			setup.planet
		);
		expect(plan.plan_data.experts).toEqual([
			{ type: "Metallurgy", amount: 2 },
		]);
		expect(plan.plan_data.workforce).toEqual([
			{ type: "pioneer", lux1: false, lux2: false },
		]);
	});

	it("names no recipes where a building has none", () => {
		const barren = { ...setup.planet, resources: [] } as Planet;
		expect(() =>
			applyPlanFields(
				setup.input.plan,
				{
					buildings: [
						{ ticker: "EXT", amount: 1, recipe_id: "EXT#SIO" },
					],
				},
				setup.gameData,
				barren
			)
		).toThrow(`EXT has no recipe EXT#SIO on KW-688c. Recipes there: none.`);
	});

	it("habs the optimiser can't solve: no plan data", () => {
		// habs that pay to build: "cheapest" has no minimum (unbounded)
		const costs = calc.result.infrastructureCosts;
		const impossible = {
			...calc,
			result: {
				...calc.result,
				infrastructureCosts: Object.fromEntries(
					Object.keys(costs).map((k) => [k, -1])
				),
			},
		} as unknown as IPlanCalculation;
		expect(
			fitHabs(setup.input.plan.plan_data, impossible, "cheapest")
		).toBeUndefined();
		// the real costs: sized
		expect(
			fitHabs(setup.input.plan.plan_data, calc, "cheapest")
		).toBeDefined();
	});
});

describe("prompts", () => {
	const text = (name: string, args: Record<string, string | undefined>) =>
		PROMPTS.find((p) => p.name === name)!.text(args);

	it("review_empire: a named empire, else the default", () => {
		expect(text("review_empire", { empire: "Sky" })).toContain(
			'Review my PRUNplanner empire "Sky" like'
		);
		expect(text("review_empire", {})).toContain(
			"(my default empire, else ask which)"
		);
	});

	it("vertical_chain: 100 per day and no exchange by default", () => {
		const t = text("vertical_chain", { material: "FE" });
		expect(t).toContain("chain for FE at 100 per day.");
		expect(t).not.toContain("near_exchange");
		expect(t).toContain("find_planets with the resource;");
	});

	it("load_lists: the given bases, else the default empire's", () => {
		expect(text("load_lists", { bases: "A, B" })).toContain(
			"for these bases: A, B."
		);
		expect(text("load_lists", {})).toContain(
			"the bases of my default empire (else ask which)"
		);
	});
});
