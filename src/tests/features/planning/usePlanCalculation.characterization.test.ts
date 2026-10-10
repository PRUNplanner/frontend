import { effectScope, ref } from "vue";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { useBuildingData } from "@/database/services/useBuildingData";
import { useBonusCalculation } from "@/features/planning/calculations/bonusCalculations";
import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
import { usePlanContext } from "@/features/planning/usePlanContext";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { calculateVisitation } from "@/features/planning/engine/visitation";
import { WORKFORCE_CONSUMPTION_MAP } from "@/features/planning/engine/workforce";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { Building } from "@/features/api/schemas/gameData.schemas";
import type {
	IExpertRecord,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import cx_definition from "@/tests/test_data/api_data_cx_definition.json";
import empire_list from "@/tests/test_data/api_data_empire_list.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import {
	emptyPlan,
	etherwindPlan,
	largePlan,
	setupPlanningTestData,
	smallPlan,
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

/**
 * Safety net of the planning engine: freezes its numbers, known bugs
 * included. See docs/planning-engine.md (Tests and benchmarks).
 */

// round finite numbers to 10 significant digits, NaN/Infinity as strings
function normalize(value: unknown): unknown {
	if (typeof value === "number")
		return Number.isFinite(value)
			? Number(value.toPrecision(10))
			: String(value);
	if (Array.isArray(value)) return value.map(normalize);
	if (value && typeof value === "object")
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [k, normalize(v)])
		);
	return value;
}

interface ICase {
	empireUuid?: string;
	empireOptions?: PlanEmpireElement[];
	cxUuid?: string;
}

async function runCase(
	plan: Plan,
	options: ICase = {},
	withRecipeOptions = true
) {
	const scope = effectScope();
	const calc = scope.run(() =>
		usePlanCalculation(
			ref(plan),
			ref(options.empireUuid),
			ref(options.empireOptions),
			ref(options.cxUuid)
		)
	)!;

	try {
		const result = await calc.calculate();
		// COGM lands asynchronously (REVIEW S1), let it settle
		await flushPromises();
		// visitationData derives from the watcher's result
		await vi.waitFor(() => expect(calc.result.value.done).toBe(true));
		await flushPromises();

		if (!withRecipeOptions)
			for (const b of result.production.buildings)
				delete (b as Partial<typeof b>).recipeOptions;

		return normalize({
			result,
			overviewData: calc.overviewData.value,
			visitationData: calc.visitationData.value,
		});
	} finally {
		scope.stop();
	}
}

// the same plans straight through the engine, without the Vue adapter
async function runEngine(
	plan: Plan,
	options: ICase = {},
	withRecipeOptions = true
) {
	const { loadGameData, createContext } = usePlanContext();
	const ctx = await createContext(
		await loadGameData(),
		plan.planet_natural_id,
		options.cxUuid
	);
	const { result, overview } = calculatePlan(
		{
			plan,
			empire: options.empireOptions?.find(
				(e) => e.uuid === options.empireUuid
			),
			cxUuid: options.cxUuid,
		},
		ctx
	);

	if (!withRecipeOptions)
		for (const b of result.production.buildings)
			delete (b as Partial<typeof b>).recipeOptions;

	return normalize({
		result,
		overviewData: overview,
		visitationData: calculateVisitation(result),
	});
}

function withPlan(mutate: (plan: Plan) => void): Plan {
	const plan = etherwindPlan();
	mutate(plan);
	return plan;
}

const snapshotPath = (name: string) =>
	`./__snapshots__/usePlanCalculation.characterization/${name}.snap`;

describe("usePlanCalculation characterization", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});

	afterEach(() => {
		usePlanningStore().cxs = {};
	});

	const cases: [string, () => Plan, () => ICase][] = [
		["etherwind", etherwindPlan, () => ({})],
		["empty", emptyPlan, () => ({})],
		["small", smallPlan, () => ({})],
		["large", largePlan, () => ({})],
		[
			"etherwind_cx",
			etherwindPlan,
			() => {
				// @ts-expect-error mock data
				usePlanningStore().cxs[cx_definition.uuid] = cx_definition;
				return { cxUuid: cx_definition.uuid };
			},
		],
		[
			"etherwind_empire",
			etherwindPlan,
			// OUTSIDEREGION: faction bonus on RESOURCE_EXTRACTION (EXT, INC, RIG)
			() => ({
				empireUuid: "a208d74e-d07f-4722-8192-9b55d4140f58",
				empireOptions: empire_list as unknown as PlanEmpireElement[],
			}),
		],
		[
			"etherwind_luxuries_off",
			() =>
				withPlan((p) =>
					p.plan_data.workforce.forEach((w) => {
						w.lux1 = false;
						w.lux2 = false;
					})
				),
			() => ({}),
		],
		[
			"etherwind_experts_5",
			() =>
				withPlan((p) =>
					p.plan_data.experts.forEach((e) => (e.amount = 5))
				),
			() => ({}),
		],
		[
			"etherwind_corphq",
			() => withPlan((p) => (p.plan_corphq = true)),
			() => ({}),
		],
		[
			// FP buildings are FOOD_INDUSTRIES
			"etherwind_cogc_food_industries",
			() => withPlan((p) => (p.plan_cogc = "FOOD_INDUSTRIES")),
			() => ({}),
		],
		[
			"etherwind_cogc_pioneers",
			() => withPlan((p) => (p.plan_cogc = "PIONEERS")),
			() => ({}),
		],
	];

	it.each(cases)("snapshot: %s", async (name, plan, options) => {
		// large: recipe options are already covered by the etherwind snapshots
		await expect(
			await runCase(plan(), options(), name !== "large")
		).toMatchFileSnapshot(snapshotPath(name));
	});

	it.each(cases)("engine snapshot: %s", async (name, plan, options) => {
		await expect(
			await runEngine(plan(), options(), name !== "large")
		).toMatchFileSnapshot(snapshotPath(name));
	});

	// what the starter card builds from a planet's insights: median building
	// amounts, the top mix with median slots, experts in half of the plans
	it("starter setup: added to an empty plan as typical amounts", async () => {
		const scope = effectScope();
		const plan = ref(emptyPlan());
		const calc = scope.run(() =>
			usePlanCalculation(plan, ref(undefined), ref(undefined), ref(undefined))
		)!;

		try {
			await calc.calculate();
			await calc.handleApplyStarterSetup({
				buildings: [
					{
						ticker: "HYF",
						amount: 4,
						recipes: [
							{ recipeid: "HYF#22xH2O 3xNS=>2xCAF", amount: 3 },
							{ recipeid: "HYF#4xNS=>12xMUS", amount: 1 },
						],
					},
					{
						ticker: "RIG",
						amount: 6,
						recipes: [{ recipeid: "RIG#H2O", amount: 1 }],
					},
					{ ticker: "INC", amount: 2, recipes: [] },
				],
				experts: [{ type: "Agriculture", amount: 2 }],
			});
			await flushPromises();

			const result = await calc.calculate();
			expect(
				result.production.buildings.map((b) => [
					b.name,
					b.amount,
					b.activeRecipes.map((r) => [r.recipeId, r.amount]),
				])
			).toStrictEqual([
				[
					"HYF",
					4,
					[
						["HYF#22xH2O 3xNS=>2xCAF", 3],
						["HYF#4xNS=>12xMUS", 1],
					],
				],
				["RIG", 6, [["RIG#H2O", 1]]],
				["INC", 2, []],
			]);
			expect(result.experts.Agriculture.amount).toBe(2);
			await expect(
				await runEngine(plan.value, {}, false)
			).toMatchFileSnapshot(snapshotPath("starter_setup"));
		} finally {
			scope.stop();
		}
	});

	it("large plan has 30+ buildings with several active recipes", () => {
		const plan = largePlan();
		expect(plan.plan_data.buildings.length).toBeGreaterThanOrEqual(30);
		for (const b of plan.plan_data.buildings)
			expect(b.active_recipes.length).toBe(3);
	});

	it("COGM is set when calculate() resolves (S1)", async () => {
		const scope = effectScope();
		const calc = scope.run(() => usePlanCalculation(ref(etherwindPlan())))!;
		const result = await calc.calculate();
		scope.stop();

		const cogm = result.production.buildings.flatMap((b) =>
			b.activeRecipes.map((ar) => ar.cogm)
		);
		// calculate() awaits COGM (S1), so it is always set
		expect(cogm.every((c) => c !== undefined)).toBe(true);
	});

	describe("suspected bugs (REVIEW B1-B3)", () => {
		const fp = buildings.find(
			(b) => b.building_ticker === "FP"
		) as unknown as Building;

		async function efficiencyInputs() {
			const scope = effectScope();
			const calc = scope.run(() =>
				usePlanCalculation(ref(etherwindPlan()))
			)!;
			const result = await calc.calculate();
			scope.stop();
			return {
				workforce: result.workforce as IWorkforceRecord,
				experts: result.experts as IExpertRecord,
			};
		}

		function efficiencyWithoutExpertise(
			workforce: IWorkforceRecord,
			experts: IExpertRecord
		) {
			return useBonusCalculation().calculateBuildingEfficiency(
				{ ...fp, expertise: null } as unknown as Building,
				// @ts-expect-error mock data
				planet_etherwind,
				false,
				"FOOD_INDUSTRIES",
				workforce,
				experts,
				undefined
			);
		}

		it("B1: a building without expertise gets no COGC or expert bonus", async () => {
			const { workforce, experts } = await efficiencyInputs();
			const { elements } = efficiencyWithoutExpertise(workforce, experts);
			expect(
				elements.filter((e) =>
					["COGC", "EXPERT"].includes(e.efficiencyType)
				)
			).toStrictEqual([]);
		});

		// single building plan: its production material io is the plan's
		async function singleBuilding(amount: number) {
			const plan = withPlan((p) => {
				p.plan_data.buildings = p.plan_data.buildings
					.filter((b) => b.name === "FP")
					.map((b) => ({ ...b, amount }));
			});
			const scope = effectScope();
			const calc = scope.run(() => usePlanCalculation(ref(plan)))!;
			const result = await calc.calculate();
			scope.stop();

			const productionRevenue = result.productionMaterialIO.reduce(
				(sum, m) => sum + m.price,
				0
			);
			return {
				building: result.production.buildings[0],
				productionRevenue,
			};
		}

		it("B2: degradation scales with building amount (#520)", async () => {
			const { building, productionRevenue } = await singleBuilding(19);
			expect(building.dailyRevenue).toBeCloseTo(
				productionRevenue +
					building.amount *
						(building.workforceDailyCost +
							building.constructionCost / 180),
				6
			);
		});

		async function luxuriesOffBuildings() {
			const plan = withPlan((p) =>
				p.plan_data.workforce.forEach((w) => {
					w.lux1 = false;
					w.lux2 = false;
				})
			);
			const scope = effectScope();
			const calc = scope.run(() => usePlanCalculation(ref(plan)))!;
			const result = await calc.calculate();
			scope.stop();
			return result.production.buildings;
		}

		it("B3: building workforce materials follow the plan's luxuries", async () => {
			// etherwind houses everyone, so only the luxuries drop out
			const luxuries = new Set(
				Object.values(WORKFORCE_CONSUMPTION_MAP)
					.flat()
					.filter((m) => m.lux1 || m.lux2)
					.map((m) => m.ticker)
			);
			const { getBuilding, getBuildingWorkforceMaterials } =
				useBuildingData();
			for (const b of await luxuriesOffBuildings())
				expect(b.workforceMaterials).toStrictEqual(
					getBuildingWorkforceMaterials(
						await getBuilding(b.name)
					).filter((m) => !luxuries.has(m.ticker))
				);
		});
	});
});
