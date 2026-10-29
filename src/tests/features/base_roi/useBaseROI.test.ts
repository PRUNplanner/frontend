import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ref, watch } from "vue";

// Composables
import { useBaseROI } from "@/features/base_roi/useBaseROI";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";
import { usePathfinder } from "@/features/pathfinding/usePathfinder";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { usePlanningStore } from "@/stores/planningStore";

// Test Data
import { setupPlanningTestData } from "@/tests/features/planning/usePlanCalculation.fixtures";
import planetIndex from "@/tests/test_data/api_data_planet_search_index.json";
import planetTemplate from "@/tests/test_data/api_data_planet_etherwind.json";
import cxList from "@/tests/test_data/api_data_cx_list.json";

// empire preference AI1 7D
const CX_AI1 = "4907f10d-982e-4f6c-b068-221bd0fb8b86";

// Types & Interfaces
import type {
	Planet,
	PlanetSearchIndexEntry,
} from "@/features/api/schemas/gameData.schemas";
import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

const calls = vi.hoisted(() => ({
	byName: {} as Record<string, unknown[]>,
	sparklines: "ok" as "ok" | "fail",
	index: "ok" as "ok" | "fail",
	// a query waits for this before it answers
	hold: {} as Record<string, Promise<void> | undefined>,
	// planets GetMultiplePlanets leaves out
	drop: new Set<string>(),
}));

const { getJumpsFrom, systemidAI1 } = usePathfinder();
const fromAI1 = getJumpsFrom(systemidAI1);
const index = (planetIndex as unknown as PlanetSearchIndexEntry[]).filter(
	(p) => (fromAI1.get(p.system_id) ?? 99) <= 3
);
const asPlanet = (e: PlanetSearchIndexEntry): Planet => ({
	...(planetTemplate as Planet),
	...e,
	gravity: 1,
	pressure: 1,
	temperature: 25,
	resources: e.resources.map((r) => ({ ...r, factor: 0 })),
});
const planets = new Map(index.map((e) => [e.planet_natural_id, asPlanet(e)]));

vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params?: Record<string, unknown>) => ({
		execute: async () => {
			(calls.byName[name] ??= []).push(params);
			await calls.hold[name];
			switch (name) {
				case "GetPlanetSearchIndex":
					if (calls.index === "fail") throw new Error("down");
					return index;
				case "PostPlanetSearch":
					return [...planets.values()].filter((p) => p.fertility !== -1);
				case "GetMultiplePlanets":
					return (params!.planetNaturalIds as string[])
						.filter((id) => !calls.drop.has(id))
						.map((id) => planets.get(id)!);
				case "GetPlanet":
					return planets.get(params!.planetNaturalId as string)!;
				case "GetCXSparklines":
					if (calls.sparklines === "fail") throw new Error("down");
					return { exchange: params!.exchange, days: 30, series: {} };
				default:
					throw new Error(`unexpected query ${name}`);
			}
		},
	}),
}));

describe("useBaseROI", { timeout: 60_000 }, () => {
	beforeAll(async () => {
		await setupPlanningTestData();
		// @ts-expect-error mock data
		usePlanningStore().setCXs(cxList);
	});
	beforeEach(() => {
		calls.byName = {};
		calls.sparklines = "ok";
		calls.index = "ok";
		calls.hold = {};
		calls.drop = new Set();
		vi.mocked(trackEvent).mockClear();
	});

	function setup(
		overrides: Partial<BaseROISettings> = {},
		cxUuid: string | undefined = undefined
	) {
		const settings = ref({
			...defaultBaseROISettings(),
			maxJumps: 3,
			...overrides,
		});
		// without a CX preference every price is the Universe fallback
		const roi = useBaseROI(settings, ref(cxUuid));
		return { settings, roi };
	}

	it("shows recipe rows first, then merges planet rows once (criterion 24)", async () => {
		const { roi } = setup();
		const sizes: { planets: number; total: number }[] = [];
		watch(roi.rows, (rows) =>
			sizes.push({
				planets: rows.filter((r) => r.planetNaturalId).length,
				total: rows.length,
			})
		);

		expect(await roi.calculate()).toBe(true);
		await Promise.resolve();

		expect(sizes).toHaveLength(2);
		expect(sizes[0].planets).toBe(0);
		expect(sizes[0].total).toBeGreaterThan(0);
		expect(sizes[1].planets).toBeGreaterThan(0);
		expect(roi.planetRowsPending.value).toBe(false);
		expect(roi.step.value).toBe("done");
	});

	it("sends one tool:use per finished run, none for a stopped one (criterion 20)", async () => {
		const { roi } = setup();
		const first = roi.calculate();
		const second = roi.calculate();
		expect(await first).toBe(false);
		expect(await second).toBe(true);
		expect(trackEvent).toHaveBeenCalledTimes(1);
		expect(trackEvent).toHaveBeenCalledWith("tool:use", {
			tool_name: "base_roi",
		});
	});

	it("fetches only planets within max jumps, once per page (criterion 7)", async () => {
		const { settings, roi } = setup();
		await roi.calculate();

		const fetched = (calls.byName.GetMultiplePlanets ?? []).flatMap(
			(p) => (p as { planetNaturalIds: string[] }).planetNaturalIds
		);
		for (const id of fetched)
			expect(
				fromAI1.get(planets.get(id)!.system_id)
			).toBeLessThanOrEqual(3);

		// another setting: the same planets, nothing fetched
		const before = JSON.stringify(calls.byName.GetMultiplePlanets ?? []);
		const posts = calls.byName.PostPlanetSearch?.length ?? 0;
		settings.value = { ...settings.value, bufferDays: 0, experts: 2 };
		await roi.calculate();
		expect(JSON.stringify(calls.byName.GetMultiplePlanets ?? [])).toBe(
			before
		);
		expect(calls.byName.PostPlanetSearch?.length ?? 0).toBe(posts);
	});

	it("a failed request keeps the recipe rows and ends in an error", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { roi } = setup();
		calls.index = "fail";
		expect(await roi.calculate()).toBe(false);
		expect(roi.step.value).toBe("error");
		expect(roi.planetRowsPending.value).toBe(false);
		expect(roi.rows.value.length).toBeGreaterThan(0);
		expect(trackEvent).not.toHaveBeenCalled();
		error.mockRestore();
	});

	it("counts planet rows beyond max jumps as hidden, unfetched", async () => {
		const { roi } = setup({ maxJumps: 0 });
		await roi.calculate();
		expect(roi.filtered.value.hidden.maxJumps).toBeGreaterThan(0);
	});

	it("filter-only settings change no engine numbers", async () => {
		const { settings, roi } = setup();
		await roi.calculate();
		const shown = roi.filtered.value.rows.length;
		settings.value = { ...settings.value, minMarketCapacity: 0, showNegative: true };
		expect(roi.filtered.value.rows.length).toBeGreaterThanOrEqual(shown);
		expect(roi.step.value).toBe("done");
	});

	it("loads the AI1 price history after the table (criterion 22)", async () => {
		const { roi } = setup({}, CX_AI1);
		await roi.calculate();
		await vi.waitFor(() => expect(roi.series.value).not.toBeNull());
		expect(calls.byName.GetCXSparklines).toEqual([
			{ exchange: "AI1", days: 30, metric: "vwap_daily" },
		]);
		expect(roi.preferenceExchanges()).toEqual(["AI1"]);
	});

	it("a failed history call leaves the column empty, not an error", async () => {
		const { roi } = setup({}, CX_AI1);
		calls.sparklines = "fail";
		await roi.calculate();
		await vi.waitFor(() => expect(roi.historyFailed.value).toBe(true));
		expect(roi.series.value).toBeNull();
	});

	it("tries a recipe row on a planet: one planet, the row stays (criterion 26)", async () => {
		const { roi } = setup();
		await roi.calculate();
		const row = roi.rows.value.find((r) => r.kind === "recipe")!;
		const before = row.metrics.buildingCost;
		const planet = [...planets.values()].find((p) => !p.surface)!;

		calls.byName = {};
		const tried = await roi.tryOnPlanet(row, planet.planet_natural_id);

		expect(calls.byName.GetPlanet).toHaveLength(1);
		expect(Object.keys(calls.byName)).toEqual(["GetPlanet"]);
		expect(tried.planetNaturalId).toBe(planet.planet_natural_id);
		// gaseous: AEF instead of the standard planet's MCG
		expect(tried.environmentMaterials.map((m) => m.ticker)).toContain("AEF");
		expect(row.metrics.buildingCost).toBe(before);
		expect(roi.rows.value.find((r) => r.key === row.key)!.planetNaturalId).toBeNull();
	});

	/** a promise and its resolve, to hold a query open */
	function gate() {
		let open!: () => void;
		const wait = new Promise<void>((r) => (open = r));
		return { wait, open };
	}

	it.each([
		["GetPlanetSearchIndex", "the index"],
		["GetMultiplePlanets", "the planets"],
	])("a newer run stops one waiting for %s", async (query) => {
		const { roi, settings } = setup({ maxJumps: 1 });
		const g = gate();
		calls.hold[query] = g.wait;
		const first = roi.calculate();
		await vi.waitFor(() => expect(calls.byName[query]).toBeDefined());
		delete calls.hold[query];
		settings.value = { ...settings.value };
		const second = roi.calculate();
		g.open();
		expect(await first).toBe(false);
		expect(await second).toBe(true);
		expect(trackEvent).toHaveBeenCalledTimes(1);
	});

	it("a newer run stops one between two chunks of recipe or planet rows", async () => {
		// every yield waits for the test, so a run sits between two chunks
		// until it is let go (polling for the step raced a fast run)
		const waiting: (() => void)[] = [];
		const releaseAll = () => waiting.splice(0).forEach((go) => go());
		vi.stubGlobal("scheduler", {
			yield: () => new Promise<void>((go) => waiting.push(go)),
		});
		try {
			const { roi } = setup();
			const pauseIn = async (step: string): Promise<void> => {
				for (let i = 0; i < 10_000; i++) {
					if (roi.step.value === step && waiting.length) return;
					releaseAll();
					await new Promise((r) => setTimeout(r, 0));
				}
				throw new Error(`never paused in ${step}`);
			};

			const recipes = roi.calculate();
			await pauseIn("recipes");
			const planetsRun = roi.calculate();
			releaseAll();
			expect(await recipes).toBe(false);
			await pauseIn("calculating");
			const last = roi.calculate();
			vi.stubGlobal("scheduler", { yield: () => Promise.resolve() });
			releaseAll();
			expect(await planetsRun).toBe(false);
			expect(await last).toBe(true);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("uses scheduler.yield where the browser has it", async () => {
		const yieldFn = vi.fn(() => Promise.resolve());
		vi.stubGlobal("scheduler", { yield: yieldFn });
		try {
			await setup({ maxJumps: 0 }).roi.calculate();
			expect(yieldFn).toHaveBeenCalled();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("a planet the server doesn't return gives no rows", async () => {
		const { roi } = setup();
		const missing = index.find((p) => p.resources.length)!.planet_natural_id;
		calls.drop.add(missing);
		await roi.calculate();
		expect(roi.rows.value.some((r) => r.planetNaturalId === missing)).toBe(false);
		expect(roi.rows.value.some((r) => r.planetNaturalId)).toBe(true);
	});

	it("a stale history answer is dropped", async () => {
		const { roi } = setup({}, CX_AI1);
		const g = gate();
		calls.hold.GetCXSparklines = g.wait;
		await roi.calculate();
		calls.sparklines = "fail";
		const second = roi.calculate();
		g.open();
		await second;
		await vi.waitFor(() => expect(roi.historyFailed.value).toBe(true));
	});

	it("tries a row before any calculation, and a planet without a route", async () => {
		const { roi } = setup();
		const planet = { ...[...planets.values()][0], system_id: "f".repeat(32) };
		planets.set(planet.planet_natural_id, planet);
		try {
			await roi.calculate();
			const row = roi.rows.value.find((r) => r.kind === "recipe")!;
			const fresh = setup().roi;
			const tried = await fresh.tryOnPlanet(row, planet.planet_natural_id);
			expect(tried.jumps).toBeNull();
		} finally {
			planets.set(planet.planet_natural_id, asPlanet(index.find((e) => e.planet_natural_id === planet.planet_natural_id)!));
		}
	});
});
