import { nextTick, ref } from "vue";
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Stores
import {
	buildingsStore,
	exchangesStore,
	materialsStore,
} from "@/database/stores";
import { useBuildingData } from "@/database/services/useBuildingData";
import { useMaterialData } from "@/database/services/useMaterialData";
import { usePlanningStore } from "@/stores/planningStore";

// test data
import buildingsData from "@/tests/test_data/api_data_buildings.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";

// Composables
import { useRepairAnalysis } from "@/features/repair_analysis/useRepairAnalysis";
import {
	calculateRepairCurve,
	findOptimalRepairDay,
	goodRange,
} from "@/features/repair_analysis/repairAnalysis.util";

// Types & Interfaces
import type { IPlanRepairAnalysisDataProp } from "@/features/planning/components/tools/planRepairAnalysis.types";

// counts the material calculations
const spies = vi.hoisted(() => ({ materialsAt: vi.fn() }));
vi.mock(
	"@/features/repair_analysis/repairAnalysis.util",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/features/repair_analysis/repairAnalysis.util")
			>();
		spies.materialsAt.mockImplementation(actual.repairMaterialsAt);
		return { ...actual, repairMaterialsAt: spies.materialsAt };
	}
);

// lets a test fail the next price book
const priceGate = vi.hoisted(() => ({ failNext: false }));
vi.mock("@/features/cx/usePrice", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/features/cx/usePrice")>();
	return {
		...actual,
		usePrice: (...args: Parameters<typeof actual.usePrice>) => {
			const price = actual.usePrice(...args);
			return {
				...price,
				getPriceBook: async () => {
					if (priceGate.failNext) {
						priceGate.failNext = false;
						throw new Error("prices unavailable");
					}
					return price.getPriceBook();
				},
			};
		},
	};
});

const CX_UUID = "cx-uuid";
// BUY prices of the CX
const PRICES = { BBH: 100, BSE: 50, MCG: 10 };

const mat = (ticker: string, input: number) => ({ ticker, input, output: 0 });
const FRM: IPlanRepairAnalysisDataProp = {
	name: "FRM",
	amount: 2,
	dailyRevenue: 0,
	workforceDailyCost: 0,
	constructionCost: 0,
	constructionMaterials: [mat("BBH", 4), mat("BSE", 4)],
};
const EXT: IPlanRepairAnalysisDataProp = {
	name: "EXT",
	amount: 1,
	dailyRevenue: 0,
	workforceDailyCost: 0,
	constructionCost: 0,
	constructionMaterials: [mat("BSE", 16), mat("MCG", 100)],
};

async function setup(data: IPlanRepairAnalysisDataProp[] = [FRM, EXT]) {
	const dataRef = ref(data);
	const cxUuid = ref<string | undefined>(CX_UUID);
	const analysis = useRepairAnalysis(dataRef, cxUuid, ref("ZV-307c"));
	await vi.waitFor(() =>
		expect(analysis.buildings.value.length).toBeGreaterThan(0)
	);
	return { ...analysis, dataRef, cxUuid };
}

describe("useRepairAnalysis", () => {
	beforeAll(async () => {
		await materialsStore.setMany(materials);
		// @ts-expect-error mock data date as string
		await exchangesStore.setMany(exchanges);
		// @ts-expect-error mock data
		await buildingsStore.setMany(buildingsData);
		await useMaterialData().preload();
		await useBuildingData().preloadBuildings();
	});

	beforeEach(() => {
		const pinia = createPinia();
		setActivePinia(pinia);
		usePlanningStore(pinia).setCXs([
			// @ts-expect-error mock data
			{
				uuid: CX_UUID,
				cx_name: "CX",
				cx_data: {
					cx_empire: [],
					cx_planets: [],
					ticker_empire: Object.entries(PRICES).map(
						([ticker, value]) => ({ ticker, type: "BUY", value })
					),
					ticker_planets: [],
				},
			},
		]);
		spies.materialsAt.mockClear();
	});

	it("starts each type at the best day of its curve", async () => {
		const { buildings } = await setup();

		for (const b of buildings.value) {
			expect(b.best).toBe(Math.max(1, findOptimalRepairDay(b.curve).day));
			expect(b.range).toEqual(goodRange(b.curve, b.best));
			expect(b.split).toHaveLength(181);
		}
		// single FRM, no revenue: 1 BBH + 1 BSE = 150 up to day 45
		const frm = buildings.value.find((b) => b.ticker === "FRM")!;
		expect(frm.best).toBe(45);
		expect(frm.curve[45].profit).toBe(-150 / 46);
	});

	it("starts at day 1, not 0, when repairing daily is best", async () => {
		// no repair cost: output only falls, day 0 copies day 1's profit and
		// findOptimalRepairDay picks day 0
		const { buildings } = await setup([
			{ ...FRM, amount: 1, dailyRevenue: 1000, constructionMaterials: [] },
		]);

		expect(findOptimalRepairDay(buildings.value[0].curve).day).toBe(0);
		expect(buildings.value[0].best).toBe(1);
	});

	it("names the types and lists the most expensive repair first", async () => {
		const { buildings } = await setup();

		// at their best day: FRM 2 * 150 = 300, EXT larger
		expect(buildings.value.map((b) => [b.ticker, b.name])).toEqual([
			["EXT", "Extractor"],
			["FRM", "Farm"],
		]);
	});

	it("charges wear once, as repair cost, and workforce in full", async () => {
		// FRM x2 as the engine reports it: production 500, workforce 100,
		// construction 4 BBH + 4 BSE = 600, 1/180 of it per day as wear
		const perBuilding = 500 - 100 - 600 / 180;
		const { buildings } = await setup([
			{
				...FRM,
				dailyRevenue: 2 * perBuilding,
				workforceDailyCost: -100,
				constructionCost: -600,
			},
		]);

		const expected = calculateRepairCurve(
			500,
			100,
			FRM.constructionMaterials,
			PRICES
		);
		const [frm] = buildings.value;
		expect(frm.productionValue).toBeCloseTo(500, 8);
		expect(frm.workforceCost).toBe(100);
		frm.curve.forEach((e, day) =>
			expect(e.profit).toBeCloseTo(expected[day].profit, 8)
		);
	});

	it("leaves out types without buildings", async () => {
		const { buildings } = await setup([{ ...EXT, amount: 0 }, FRM]);

		expect(buildings.value.map((b) => b.ticker)).toEqual(["FRM"]);
	});

	it("computes no materials until asked", async () => {
		await setup();

		expect(spies.materialsAt).not.toHaveBeenCalled();
	});

	it("prices one repair of all buildings of a type at its interval", async () => {
		const { buildings, materialsFor } = await setup();
		const frm = buildings.value.find((b) => b.ticker === "FRM")!;

		// day 90 halves the construction materials, times 2 buildings
		const list = materialsFor(frm, 90);
		expect(list.materials.map((m) => [m.ticker, m.amount, m.cost])).toEqual([
			["BBH", 4, 400],
			["BSE", 4, 200],
		]);
		expect(list.cost).toBe(600);
		expect(list.weight).toBeGreaterThan(0);
		expect(list.volume).toBeGreaterThan(0);
		// day 1 needs nothing of a 4-unit material: 4 - floor(4 * 179 / 180)
		expect(materialsFor(frm, 1).materials.map((m) => m.amount)).toEqual([
			2, 2,
		]);
	});

	it("recomputes only the type whose interval changed", async () => {
		const { buildings, materialsFor, materialsForAll } = await setup();
		const intervals: Record<string, number> = { FRM: 90, EXT: 90 };
		const all = () => materialsForAll((t) => intervals[t]);

		all();
		expect(spies.materialsAt).toHaveBeenCalledTimes(2);

		// the same intervals come from the memo
		all();
		materialsFor(buildings.value.find((b) => b.ticker === "FRM")!, 90);
		expect(spies.materialsAt).toHaveBeenCalledTimes(2);

		intervals.FRM = 30;
		all();
		expect(spies.materialsAt).toHaveBeenCalledTimes(3);
		expect(spies.materialsAt.mock.calls[2][1]).toBe(30);
	});

	it("sums every type at its own interval", async () => {
		const { materialsForAll } = await setup();

		// FRM every 90 d: BBH 4, BSE 4; EXT every 180 d: BSE 16, MCG 100;
		// most expensive first: BSE 1,000, MCG 1,000, BBH 400
		const list = materialsForAll((t) => (t === "FRM" ? 90 : 180));
		expect(list.materials.map((m) => [m.ticker, m.amount])).toEqual(
			expect.arrayContaining([
				["BSE", 20],
				["MCG", 100],
				["BBH", 4],
			])
		);
		expect(list.materials.at(-1)!.ticker).toBe("BBH");
		expect(list.cost).toBe(20 * 50 + 100 * 10 + 4 * 100);

		// FRM every 180 d: BSE 16 + 8 = 24 now leads, BBH 8
		expect(
			materialsForAll(() => 180).materials.map((m) => [m.ticker, m.amount])
		).toEqual([
			["BSE", 24],
			["MCG", 100],
			["BBH", 8],
		]);
	});

	it("recalculates when the plan's buildings change", async () => {
		const { buildings, dataRef } = await setup();
		const before = buildings.value;

		dataRef.value = [{ ...FRM, amount: 5 }];
		await vi.waitFor(() => expect(buildings.value).not.toBe(before));

		expect(buildings.value.map((b) => [b.ticker, b.amount])).toEqual([
			["FRM", 5],
		]);
	});

	it("keeps the newest prices when an older load finishes last", async () => {
		const { buildings, cxUuid } = await setup();

		// two changes in a row: only the last one's book is used
		cxUuid.value = undefined;
		cxUuid.value = CX_UUID;
		await nextTick();
		await vi.waitFor(() =>
			expect(
				buildings.value.find((b) => b.ticker === "FRM")!.curve[45]
					.dailyRepair
			).toBe(150)
		);
	});

	it("logs a failed price load and recovers on the next change", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		priceGate.failNext = true;

		const dataRef = ref([FRM]);
		const { buildings } = useRepairAnalysis(
			dataRef,
			ref(CX_UUID),
			ref("ZV-307c")
		);
		await vi.waitFor(() =>
			expect(error).toHaveBeenCalledWith(new Error("prices unavailable"))
		);
		expect(buildings.value).toEqual([]);
		error.mockRestore();

		dataRef.value = [EXT];
		await vi.waitFor(() => expect(buildings.value).toHaveLength(1));
	});
});
