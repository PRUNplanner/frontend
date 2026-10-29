import { ref } from "vue";
import { beforeAll, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";
import axiosSetup from "@/util/axiosSetup";

// Services
import { apiService } from "@/lib/apiService";

// Stores
import {
	buildingsStore,
	exchangesStore,
	materialsStore,
	recipesStore,
} from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { useBuildingData } from "@/database/services/useBuildingData";
import { useExchangeData } from "@/database/services/useExchangeData";

// Composables
import { usePlan } from "@/features/planning_data/usePlan";
import { usePlanContext } from "@/features/planning/usePlanContext";
import { useROIOverview } from "@/features/roi_overview/useROIOverview";
import { useResourceROIOverview } from "@/features/resource_roi_overview/useResourceROIOverview";

// Unit
import {
	basePlan,
	calculateBase,
	planetCandidates,
	recipeCandidates,
	toRowInput,
} from "@/features/base_roi/baseROIRows";
import { calculateMetrics } from "@/features/base_roi/baseROIMetrics";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";
import { STANDARD_PLANET } from "@/features/base_roi/baseROI.constants";
import { optimalProduction } from "@/features/roi_overview/assets/optimalProduction";

// Test Data
import recipes from "@/tests/test_data/api_data_recipes.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import planetIndex from "@/tests/test_data/api_data_planet_search_index.json";

// Types & Interfaces
import type {
	IGameData,
	IPlanContext,
} from "@/features/planning/engine/engine.types";
import type {
	Planet,
	PlanetSearchIndexEntry,
} from "@/features/api/schemas/gameData.schemas";
import type { IBaseROICandidate } from "@/features/base_roi/baseROI.types";
import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";

const mock = new AxiosMockAdapter(apiService.client);

describe("baseROIRows", () => {
	let gameData: IGameData;
	let getExchange: (id: string) => ReturnType<
		ReturnType<typeof useExchangeData>["getExchangeTickerLoaded"]
	>;
	const ctxOn = (planet: Planet): IPlanContext => ({
		...gameData,
		planet,
		prices: usePlanContext().createPrices(planet.planet_natural_id, undefined),
	});

	// criterion 5 settings
	const plain: BaseROISettings = {
		...defaultBaseROISettings(),
		bufferDays: 0,
		experts: 5,
		cogc: "matching",
	};

	beforeAll(async () => {
		setActivePinia(createPinia());
		axiosSetup();
		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);
		await materialsStore.setMany(materials);
		//@ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await useMaterialData().preload();
		await useBuildingData().preloadBuildings();
		await useBuildingData().preloadRecipes();
		await flushPromises();
		gameData = await usePlanContext().loadGameData();
		getExchange = useExchangeData().getExchangeTickerLoaded;
	});

	const row = (
		candidate: IBaseROICandidate,
		ctx: IPlanContext,
		settings = plain
	) => {
		const input = toRowInput(
			candidate,
			calculateBase(candidate, ctx, settings, undefined),
			ctx,
			getExchange
		);
		return { input, metrics: calculateMetrics(input, settings, 0) };
	};

	it("recipe rows: every recipe of every non-extraction, non-farming layout", () => {
		const candidates = recipeCandidates(gameData);
		const tickers = new Set(candidates.map((c) => c.building));
		expect(tickers.has("TNP")).toBe(true);
		for (const b of ["RIG", "EXT", "COL", "FRM", "ORC"])
			expect(tickers.has(b)).toBe(false);
		expect(candidates.every((c) => c.kind === "recipe")).toBe(true);
	});

	it("a recipe row equals Recipe ROI for the same recipe (criterion 5)", async () => {
		const ctx = ctxOn(STANDARD_PLANET);
		const tnp = optimalProduction.find((o) => o.ticker === "TNP")!;
		const definition = ref(usePlan().createBlankDefinition("OT-580b", null));
		definition.value.plan_data.experts.forEach((e) => (e.amount = 5));
		const recipeROI = await useROIOverview(
			definition,
			ref(undefined)
		).calculateItem(tnp, ctx);

		const candidate = recipeCandidates(gameData).find(
			(c) => c.recipeId === recipeROI[0].recipeId
		)!;
		const { input, metrics } = row(candidate, ctx);

		expect(metrics.dailyProfit).toBeCloseTo(recipeROI[0].dailyProfit, 6);
		expect(metrics.buildingCost).toBeCloseTo(recipeROI[0].planCost, 6);
		expect(input.storageAdded).toEqual({ STO: 0, STA: 0 });
	});

	it("a resource row equals Resource ROI for the same planet (criterion 5)", async () => {
		mock.onPost("/data/planets/search/").reply(200, [planet_etherwind]);
		const [resourceROI] = await useResourceROIOverview(
			ref(undefined)
		).calculate("H2O");
		mock.resetHandlers();

		const planet = planet_etherwind as Planet;
		const candidate: IBaseROICandidate = {
			key: "h2o",
			kind: "resource",
			building: "RIG",
			expertise: "RESOURCE_EXTRACTION",
			recipeId: "RIG#H2O",
			planetNaturalId: planet.planet_natural_id,
			planetName: planet.planet_name,
			jumps: 3,
		};
		const { input, metrics } = row(candidate, ctxOn(planet));

		expect(metrics.dailyProfit).toBeCloseTo(resourceROI.dailyProfit, 6);
		expect(metrics.buildingCost).toBeCloseTo(resourceROI.planCost, 6);
		// a real planet's environment materials are in the construction
		expect(input.environment).toBeGreaterThan(0);
	});

	it("buffer 28 days adds storage and never exceeds the area (criterion 6)", () => {
		const ctx = ctxOn(STANDARD_PLANET);
		const candidates = recipeCandidates(gameData).filter((c) =>
			["TNP", "PP1", "SME", "FP", "REF"].includes(c.building)
		);
		const buffered: BaseROISettings = { ...plain, bufferDays: 28 };
		let added = 0;
		for (const c of candidates) {
			const { input } = row(c, ctx, buffered);
			expect(input.areaUsed).toBeLessThanOrEqual(input.areaTotal);
			const cargo = Math.max(
				input.weightIn,
				input.weightOut,
				input.volumeIn,
				input.volumeOut
			);
			expect(
				Math.min(input.storageWeight, input.storageVolume)
			).toBeGreaterThanOrEqual(cargo * 28 - 1e-6);
			added += input.storageAdded.STO + input.storageAdded.STA;
		}
		expect(added).toBeGreaterThan(0);
	});

	it("COGC none and fixed experts change the numbers (criterion 8)", () => {
		const ctx = ctxOn(STANDARD_PLANET);
		const candidate = recipeCandidates(gameData).find(
			(c) => c.building === "TNP"
		)!;
		const matching = row(candidate, ctx).metrics.dailyProfit;
		const none = row(candidate, ctx, { ...plain, cogc: "none" }).metrics
			.dailyProfit;
		const zero = row(candidate, ctx, { ...plain, experts: 0 }).metrics;
		expect(none).toBeLessThan(matching);
		expect(zero.dailyProfit).toBeLessThan(matching);
		expect(zero.breakEven).toBeCloseTo(zero.buildingCost / zero.dailyProfit);
	});

	it("workforce matches the engine's required workforce (criterion 15)", () => {
		const ctx = ctxOn(STANDARD_PLANET);
		const candidate = recipeCandidates(gameData).find(
			(c) => c.building === "TNP"
		)!;
		const { input } = row(candidate, ctx);
		expect(input.workforce.length).toBeGreaterThan(0);
		for (const w of input.workforce)
			expect(w.required).toBe(input.result.workforce[w.tier].required);
	});

	it("prices come from the context's CX preference (criterion 21)", () => {
		const candidate = recipeCandidates(gameData).find(
			(c) => c.building === "TNP"
		)!;
		const universe = row(candidate, ctxOn(STANDARD_PLANET));
		const doubled: IPlanContext = {
			...ctxOn(STANDARD_PLANET),
			prices: {
				getPrice: (t, type) =>
					2 * ctxOn(STANDARD_PLANET).prices.getPrice(t, type),
				getPriceSource: (t, type) =>
					ctxOn(STANDARD_PLANET).prices.getPriceSource(t, type),
			},
		};
		const repriced = row(candidate, doubled);
		expect(repriced.metrics.dailyProfit).toBeCloseTo(
			2 * universe.metrics.dailyProfit,
			4
		);
	});

	it("a building without expertise: no COGC, no experts", () => {
		const plan = basePlan(
			{ building: "TNP", recipeId: "x", expertise: null },
			3,
			{} as Parameters<typeof basePlan>[2],
			{ cogc: "matching", experts: "ramp" }
		);
		expect(plan.plan_cogc).toBe("---");
		expect(plan.plan_data.experts.every((e) => e.amount === 0)).toBe(true);
	});

	it("missing exchange data: no bid, ask or traded volume", () => {
		const ctx = ctxOn(STANDARD_PLANET);
		const candidate = recipeCandidates(gameData).find((c) => c.building === "TNP")!;
		const input = toRowInput(
			candidate,
			calculateBase(candidate, ctx, plain, undefined),
			ctx,
			() => {
				throw new Error("no data");
			}
		);
		expect(input.materials.every((m) => m.bid === 0 && m.ask === 0)).toBe(true);
		expect(input.outputs.every((o) => o.traded === 0)).toBe(true);
	});

	it("an unknown building has no layout", () => {
		expect(() =>
			calculateBase(
				{ ...recipeCandidates(gameData)[0], building: "XXX" },
				ctxOn(STANDARD_PLANET),
				plain,
				undefined
			)
		).toThrow("No layout for XXX");
	});

	describe("planet rows (criterion 7)", () => {
		const index = planetIndex as unknown as PlanetSearchIndexEntry[];
		const fertile = index.find((p) => p.fertility !== -1)!;
		const barren = index.find(
			(p) => p.fertility === -1 && p.resources.length > 0
		)!;

		it("one row per resource, one per farming recipe on fertile planets", () => {
			const { within } = planetCandidates(
				[fertile, barren],
				gameData,
				() => 1,
				7
			);
			const of = (id: string) =>
				within.filter((c) => c.planetNaturalId === id);

			expect(of(barren.planet_natural_id).map((c) => c.kind)).toEqual(
				barren.resources
					.filter((r) => r.daily_extraction > 0)
					.map(() => "resource")
			);
			const farming = of(fertile.planet_natural_id).filter(
				(c) => c.kind === "farming"
			);
			expect(farming.length).toBe(
				(gameData.recipesByBuilding.FRM?.length ?? 0) +
					(gameData.recipesByBuilding.ORC?.length ?? 0)
			);
		});

		it("planets beyond max jumps or without a route are left out", () => {
			const { within, beyond } = planetCandidates(
				[fertile, barren],
				gameData,
				(system) => (system === fertile.system_id ? 8 : -1),
				7
			);
			expect(within).toEqual([]);
			expect(beyond.length).toBeGreaterThan(0);
		});

		it("a farming row uses the planet's fertility", () => {
			const planet = {
				...(planet_etherwind as Planet),
				fertility: 0.3,
			};
			const lower = { ...planet, fertility: -0.3 };
			const candidate = planetCandidates(
				[{ ...fertile, fertility: 0.3 }],
				gameData,
				() => 1,
				7
			).within.find((c) => c.kind === "farming")!;
			const high = row(candidate, ctxOn(planet)).input.revenue;
			const low = row(candidate, ctxOn(lower)).input.revenue;
			expect(high).toBeGreaterThan(low);
		});
	});
});
