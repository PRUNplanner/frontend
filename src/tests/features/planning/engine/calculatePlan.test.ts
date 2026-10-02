import { describe, it, expect, beforeAll, vi } from "vitest";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { calculateFinance } from "@/features/planning/engine/finance";
import { calculateArea } from "@/features/planning/engine/area";
import {
	calculateConstructionMaterials,
	calculateTotalConstructionCost,
} from "@/features/planning/engine/construction";
import { calculateVisitation } from "@/features/planning/engine/visitation";
import {
	getBuilding,
	getBuildingRecipes,
	groupRecipesByBuilding,
} from "@/features/planning/engine/buildings";
import { usePlanContext } from "@/features/planning/usePlanContext";

// Types & Interfaces
import type { IPlanContext } from "@/features/planning/engine/engine.types";
import type {
	IMaterialIO,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import recipes from "@/tests/test_data/api_data_recipes.json";
import {
	emptyPlan,
	etherwindPlan,
	findRecipeSwap,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);

	return {
		usePlanetData: vi.fn(() => ({
			getPlanet: vi.fn().mockResolvedValue(planet_etherwind),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});

function deepFreeze<T>(value: T): T {
	if (value && typeof value === "object") {
		Object.values(value).forEach(deepFreeze);
		Object.freeze(value);
	}
	return value;
}

describe("planning engine", () => {
	let ctx: IPlanContext;

	beforeAll(async () => {
		await setupPlanningTestData();
		const { loadGameData, createContext } = usePlanContext();
		ctx = await createContext(await loadGameData(), "KW-688c", undefined);
	});

	describe("calculatePlan", () => {
		it("never mutates its input", () => {
			const plan = deepFreeze(etherwindPlan());
			const before = JSON.stringify(plan);

			expect(() =>
				calculatePlan(
					{ plan, empire: undefined, cxUuid: undefined },
					ctx
				)
			).not.toThrow();
			expect(JSON.stringify(plan)).toBe(before);
		});

		it("is deterministic and returns fresh objects", () => {
			const input = {
				plan: etherwindPlan(),
				empire: undefined,
				cxUuid: undefined,
			};
			const a = calculatePlan(input, ctx);
			const b = calculatePlan(input, ctx);

			expect(a).toStrictEqual(b);
			expect(a.result).not.toBe(b.result);
		});

		it("recipeOptions: false only leaves out recipe options", () => {
			const plan = etherwindPlan();
			const full = calculatePlan(
				{ plan, empire: undefined, cxUuid: undefined },
				ctx
			);
			const lean = calculatePlan(
				{
					plan,
					empire: undefined,
					cxUuid: undefined,
					recipeOptions: false,
				},
				ctx
			);

			expect(
				full.result.production.buildings[1].recipeOptions.length
			).toBe(21);
			for (const b of full.result.production.buildings)
				b.recipeOptions = [];
			expect(lean).toStrictEqual(full);
		});

		it("builds construction once for the result and the overview (S5)", () => {
			const { result, overview } = calculatePlan(
				{ plan: etherwindPlan(), empire: undefined, cxUuid: undefined },
				ctx
			);

			expect(overview.totalConstructionCost).toBe(
				calculateTotalConstructionCost(
					result.constructionMaterials,
					ctx.prices
				)
			);
			expect(overview.dailyProfit).toBe(result.revenue);
		});

		it("0% efficiency gives finite material I/O, also with an amount-0 recipe (#547)", () => {
			// no housing: workforce satisfaction and so efficiency are 0
			const plan = etherwindPlan();
			plan.plan_data.infrastructure = [];
			const run = () =>
				calculatePlan(
					{ plan, empire: undefined, cxUuid: undefined },
					ctx
				).result;

			const expectFinite = (result: ReturnType<typeof run>) => {
				for (const b of result.production.buildings) {
					expect(b.totalEfficiency).toBe(0);
					for (const ar of b.activeRecipes)
						expect(ar.dailyShare).toBe(0);
				}
				for (const m of result.production.materialio) {
					expect(m.input).toBe(0);
					expect(m.output).toBe(0);
				}
				for (const m of result.materialio)
					expect(Number.isFinite(m.delta)).toBe(true);
			};

			expectFinite(run());

			const { index, recipeid } = findRecipeSwap(plan);
			plan.plan_data.buildings[index].active_recipes.push({
				recipeid,
				amount: 0,
			});
			expectFinite(run());
		});

		it("shows COGM when a CX is given", () => {
			const cogm = (cxUuid: string | undefined) =>
				calculatePlan(
					{ plan: etherwindPlan(), empire: undefined, cxUuid },
					ctx
				).result.production.buildings[0].activeRecipes[0].cogm!.visible;

			expect(cogm(undefined)).toBe(false);
			expect(cogm("some-cx")).toBe(true);
		});
	});

	describe("calculateFinance", () => {
		const io = (delta: number, price: number) =>
			({ delta, price }) as IMaterialIO;
		const building = (constructionCost: number, amount: number) =>
			({ constructionCost, amount }) as IProductionBuilding;

		it("reports the same money in the result and the overview", () => {
			const finance = calculateFinance(
				[io(-2, -100), io(3, 300), io(0, 0)],
				[building(-1800, 2)],
				9000
			);

			expect(finance.revenue).toBe(300);
			expect(finance.cost).toBe(100 + 20);
			expect(finance.profit).toBe(300 - 100 - 20);
			expect(finance.overview).toStrictEqual({
				dailyCost: 100,
				dailyProfit: 300,
				totalConstructionCost: 9000,
				dailyDegradationCost: 20,
				profit: 180,
				roi: 50,
			});
		});

		it("keeps the sign of zero for an empty plan", () => {
			const { profit, cost, overview } = calculateFinance([], [], 0);

			expect(Object.is(profit, 0)).toBe(true);
			expect(Object.is(cost, 0)).toBe(true);
			expect(Object.is(overview.dailyCost, -0)).toBe(true);
			expect(Object.is(overview.dailyDegradationCost, -0)).toBe(true);
		});
	});

	describe("area, construction and visitation", () => {
		it("area counts the core module, infrastructure and buildings", () => {
			expect(
				calculateArea(emptyPlan().plan_data, 1, ctx.buildings)
			).toEqual({
				permits: 1,
				areaUsed: 25,
				areaTotal: 500,
				areaLeft: 475,
			});
		});

		it("construction always has the core module, only used infrastructure", () => {
			const infrastructure = { HB1: 2, HB2: 0 } as any;
			const list = calculateConstructionMaterials(
				infrastructure,
				[],
				ctx.planet,
				ctx.buildings
			);

			expect(list.map((c) => [c.ticker, c.amount])).toEqual([
				["CM", 1],
				["HB1", 2],
			]);
			expect(infrastructure).toEqual({ HB1: 2, HB2: 0 });
		});

		it("visitation of an empty plan", () => {
			const { storageFilled, dailyWeight } = calculateVisitation({
				materialio: [],
				storage: { STO: 0, STA: 0, STE: 0, STV: 0, STW: 0 },
			});

			expect(dailyWeight).toBe(0);
			expect(storageFilled).toBe(Infinity);
		});
	});

	describe("game data helpers", () => {
		it("getBuilding throws for unknown tickers", () => {
			expect(getBuilding(ctx.buildings, "FP").building_ticker).toBe("FP");
			expect(() => getBuilding(ctx.buildings, "FOO")).toThrowError(
				"Building FOO not available."
			);
		});

		it("groups recipes by building in their order", () => {
			const grouped = groupRecipesByBuilding(recipes as any);
			expect(grouped.FP.map((r) => r.recipe_id)).toEqual(
				recipes
					.filter((r) => r.building_ticker === "FP")
					.map((r) => r.recipe_id)
			);
		});

		it("extraction recipes come from planet resources", () => {
			expect(
				getBuildingRecipes(ctx.recipesByBuilding, "EXT", [])
			).toEqual([]);
			expect(
				getBuildingRecipes(
					ctx.recipesByBuilding,
					"RIG",
					planet_etherwind.resources as any
				).map((r) => r.recipe_id)
			).toEqual(["RIG#H2O"]);
			expect(() =>
				getBuildingRecipes(ctx.recipesByBuilding, "FOO")
			).toThrowError("No recipe data");
		});
	});
});
