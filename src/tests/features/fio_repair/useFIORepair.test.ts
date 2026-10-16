import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import fio_storage from "@/tests/test_data/api_data_fio_storage.json";
import buildings from "@/tests/test_data/api_data_buildings.json";

// Stores
import { usePlanningStore } from "@/stores/planningStore";
import { useUserStore } from "@/stores/userStore";

// Composables
import { useFIORepair } from "@/features/fio_repair/useFIORepair";

// Schemas
import { FIOStorageSchema } from "@/features/api/schemas/gameData.schemas";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IMaterialIOMinimal } from "@/features/planning/usePlanCalculation.types";

const { calculatePlan, getPriceBook, getPlanet, loadGameData, priced } =
	vi.hoisted(() => ({
		calculatePlan: vi.fn(),
		loadGameData: vi.fn(),
		getPriceBook: vi.fn(),
		getPlanet: vi.fn(),
		priced: { cx: [] as (string | undefined)[] },
	}));

vi.mock("@/database/services/useBuildingData", async () => {
	const { ref: vueRef } = await import("vue");
	const data = (await import("@/tests/test_data/api_data_buildings.json"))
		.default;
	return {
		useBuildingData: () => ({
			buildingsMap: vueRef(
				Object.fromEntries(data.map((b) => [b.building_ticker, b]))
			),
		}),
	};
});
vi.mock("@/database/services/usePlanetData", () => ({
	usePlanetData: () => ({ getPlanet }),
}));
vi.mock("@/features/cx/usePrice", () => ({
	usePrice: (cx: { value: string | undefined }) => ({
		getPriceBook: () => {
			priced.cx.push(cx.value);
			return getPriceBook();
		},
	}),
}));
vi.mock("@/features/planning/util/materialIO.util", () => ({
	useMaterialIOUtil: () => ({
		enhanceMaterialIOMinimal: (data: IMaterialIOMinimal[]) =>
			data.map((d) => ({
				...d,
				delta: d.output - d.input,
				individualWeight: 1,
				individualVolume: 2,
				totalWeight: d.output - d.input,
				totalVolume: (d.output - d.input) * 2,
			})),
	}),
}));
vi.mock("@/features/planning/engine/calculatePlan", () => ({ calculatePlan }));
vi.mock("@/features/planning/usePlanContext", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@/features/planning/usePlanContext")
	>()),
	usePlanContext: () => ({
		loadGameData,
		createContext: async () => ({ prices: { getPrice: () => 10 } }),
	}),
}));

const storage = FIOStorageSchema.parse(fio_storage);
const NOW = storage.last_modified.getTime();

const BOBER_SITE = "a".repeat(32);

function plan(uuid: string, planet: string, counts: Record<string, number>) {
	return {
		uuid,
		plan_name: uuid,
		planet_natural_id: planet,
		plan_data: {
			buildings: Object.entries(counts).map(([name, amount]) => ({
				name,
				amount,
				active_recipes: [],
			})),
		},
	} as unknown as Plan;
}

const pol = buildings.find((b) => b.building_ticker === "POL")!;
const productionOf = (ticker: string, amount: number) => ({
	name: ticker,
	amount,
	dailyRevenue: 20000 * amount,
	workforceDailyCost: -1500,
	constructionCost: 18000,
	constructionMaterials: pol.costs.map((c) => ({
		ticker: c.material_ticker,
		input: c.material_amount,
		output: 0,
	})),
});

describe("useFIORepair", () => {
	let planningStore: ReturnType<typeof usePlanningStore>;
	let userStore: ReturnType<typeof useUserStore>;

	beforeEach(() => {
		vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
		setActivePinia(createPinia());
		planningStore = usePlanningStore();
		userStore = useUserStore();

		const sites = structuredClone(storage.sites_data);
		sites["ZV-307b"].SiteId = BOBER_SITE;
		planningStore.fio_sites_planets = sites;
		planningStore.fio_storage_planets = structuredClone(
			storage.storage_data.planets
		);
		planningStore.fio_storage_planets["ZV-307b"].StorageItems = [
			{ MaterialTicker: "BSE", MaterialAmount: 5 },
		];

		priced.cx = [];
		getPriceBook.mockResolvedValue({ getPrice: () => 100 });
		getPlanet.mockImplementation(async (id: string) => {
			if (id === "ZV-307b")
				return { planet_natural_id: id, planet_name: "Bober" };
			throw new Error("not loaded");
		});
		calculatePlan.mockReset();
		loadGameData.mockReset();
		loadGameData.mockResolvedValue({});
		calculatePlan.mockImplementation(() => ({
			result: {
				production: {
					buildings: [
						productionOf("POL", 10),
						productionOf("LAB", 7),
					],
				},
			},
		}));
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	async function setup(
		plans: Plan[] = [],
		empires: PlanEmpireElement[] = []
	) {
		const usePlans = ref(true);
		const scope = effectScope();
		const repair = scope.run(() =>
			useFIORepair(ref(plans), ref(empires), usePlans)
		)!;
		expect(repair.bases.value).toStrictEqual([]);
		await repair.load();
		return { ...repair, usePlans, scope };
	}

	it("builds every base with production buildings, most urgent first", async () => {
		const { bases } = await setup();

		expect(bases.value).toHaveLength(18);
		const bober = bases.value.find((b) => b.planet === "ZV-307b")!;
		expect(bober).toMatchObject({
			name: "Bober",
			siteId: BOBER_SITE,
			since: 49,
			wasRepaired: true,
			status: "later",
			due: 11,
		});
		expect(
			bober.types.map((t) => [t.ticker, t.count, t.target])
		).toStrictEqual([
			["LAB", 7, 60],
			["POL", 10, 60],
		]);
		// unknown planets keep their natural id as name
		expect(bases.value.find((b) => b.planet === "KW-688c")!.name).toBe(
			"Etherwind"
		);
		expect(bober.bill.cost).toBeGreaterThan(0);
		expect(bober.waiting).toBeGreaterThan(0);

		const dues = bases.value.map((b) => b.due ?? -Infinity);
		expect(dues).toStrictEqual([...dues].sort((a, b) => a - b));
	});

	it("targets come from the matched plan's best days", async () => {
		const { bases, usePlans } = await setup([
			plan("p1", "ZV-307b", { POL: 10, LAB: 7 }),
		]);
		expect(calculatePlan).toHaveBeenCalledTimes(1);

		const bober = () => bases.value.find((b) => b.planet === "ZV-307b")!;
		expect(bober().match.confidence).toBe("match");
		const targets = bober().types.map((t) => t.target);
		expect(targets.every((t) => t !== 60)).toBe(true);

		usePlans.value = false;
		expect(bober().types.map((t) => t.target)).toStrictEqual([60, 60]);
	});

	it("a picked plan is calculated on demand, a failing one is skipped", async () => {
		const { bases } = await setup([
			plan("p1", "ZV-307b", { POL: 10, LAB: 7 }),
			plan("p2", "ZV-307b", { POL: 2 }),
		]);
		expect(calculatePlan).toHaveBeenCalledTimes(1);

		calculatePlan.mockImplementationOnce(() => {
			throw new Error("broken plan");
		});
		userStore.preferences.fioRepairPlanLinks = {
			[BOBER_SITE]: { planUuid: "p2" },
		};
		await nextTick();
		await vi.waitFor(() => expect(calculatePlan).toHaveBeenCalledTimes(2));
		await flushPromises();

		const bober = bases.value.find((b) => b.planet === "ZV-307b")!;
		expect(bober.match.confidence).toBe("picked");
		// no best days: the interval
		expect(bober.types.map((t) => t.target)).toStrictEqual([60, 60]);
		expect(console.error).toHaveBeenCalled();
	});

	it("a failed calculation doesn't block later ones", async () => {
		loadGameData.mockRejectedValueOnce(new Error("no game data"));
		const usePlans = ref(true);
		const scope = effectScope();
		const repair = scope.run(() =>
			useFIORepair(
				ref([
					plan("p1", "ZV-307b", { POL: 10, LAB: 7 }),
					plan("p2", "ZV-307b", { POL: 2 }),
				]),
				ref([]),
				usePlans
			)
		)!;
		await expect(repair.load()).rejects.toThrow("no game data");
		expect(calculatePlan).not.toHaveBeenCalled();

		userStore.preferences.fioRepairPlanLinks = {
			[BOBER_SITE]: { planUuid: "p2" },
		};
		await vi.waitFor(() => expect(calculatePlan).toHaveBeenCalledTimes(1));
	});

	it("flight: arrival days, base store, extra cost", async () => {
		const { bases, flight } = await setup();
		const bober = bases.value.find((b) => b.planet === "ZV-307b")!;

		const today = flight(bober, 0, false);
		expect(today.extra).toBe(0);
		expect(today.load.cost).toBe(bober.bill.cost);
		expect(today.fromStore).toStrictEqual([]);

		const later = flight(bober, 60, true);
		expect(later.extra).toBeGreaterThan(0);
		expect(later.fromStore).toStrictEqual([
			{ ticker: "BSE", input: 5, output: 0 },
		]);
		const bse = (f: typeof today) =>
			f.load.materials.find((m) => m.ticker === "BSE")?.amount ?? 0;
		expect(bse(later)).toBe(bse(flight(bober, 60, false)) - 5);

		// a base without store data
		const other = bases.value.find((b) => b.planet === "KW-688c")!;
		expect(flight(other, 0, true).fromStore).toStrictEqual([]);
	});

	it("prices follow the default Exchange Preference", async () => {
		planningStore.cxs = {
			CX1: { uuid: "CX1", cx_name: "Home" },
		} as unknown as typeof planningStore.cxs;
		await setup();
		expect(priced.cx).toStrictEqual([undefined]);

		userStore.preferences.defaultCXUuid = "CX1";
		await vi.waitFor(() =>
			expect(priced.cx).toStrictEqual([undefined, "CX1"])
		);

		// a deleted preference prices without one
		userStore.preferences.defaultCXUuid = "gone";
		await vi.waitFor(() =>
			expect(priced.cx).toStrictEqual([undefined, "CX1", undefined])
		);
	});
});
