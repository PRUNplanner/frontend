import { describe, it, expect, beforeAll, vi } from "vitest";
import { effectScope, ref } from "vue";
import { flushPromises } from "@vue/test-utils";

import { useExchangePlanData } from "@/features/exchanges/useExchangePlanData";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { useQuery } from "@/lib/query_cache/useQuery";

// Types & Interfaces
import type { CX, CXData } from "@/features/api/schemas/cxData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import {
	etherwindPlan,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);
	return {
		usePlanetData: vi.fn(() => ({
			// XX-000x never loads
			getPlanet: vi.fn((id: string) =>
				id === "XX-000x"
					? Promise.reject(new Error(`Planet ${id} not available.`))
					: Promise.resolve(planet_etherwind)
			),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});

const { execute } = vi.hoisted(() => ({
	execute: vi.fn(async () => []),
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: vi.fn(() => ({ execute })),
}));

vi.mock("@/features/planning/engine/calculatePlan", async () => {
	const actual: any = await vi.importActual(
		"@/features/planning/engine/calculatePlan"
	);
	return { calculatePlan: vi.fn(actual.calculatePlan) };
});

const linked = etherwindPlan();
const other = {
	...etherwindPlan(),
	uuid: "8b0e6b1c-0000-4000-8000-000000000002",
};

const empires = [
	{ uuid: "E1", empire_name: "Linked", plans: [{ uuid: linked.uuid }] },
	{ uuid: "E2", empire_name: "Other", plans: [{ uuid: other.uuid }] },
] as unknown as PlanEmpireElement[];

const universe: CXData = {
	cx_empire: [],
	cx_planets: [],
	ticker_empire: [],
	ticker_planets: [],
};

const cx = {
	uuid: "cx",
	cx_name: "Home",
	modified_at: "1",
	empires: [empires[0]],
	cx_data: universe,
} as unknown as CX;

const settle = async () => {
	for (let i = 0; i < 20; i++) {
		await flushPromises();
		await new Promise((r) => setTimeout(r, 0));
	}
};

describe("useExchangePlanData", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});

	it("calculates once and re-prices unsaved edits", async () => {
		vi.mocked(calculatePlan).mockClear();
		const cxData = ref<CXData>(structuredClone(universe));
		const includeOthers = ref(false);

		const scope = effectScope();
		const data = scope.run(() =>
			useExchangePlanData({
				plans: () => [linked, other],
				empires: () => empires,
				cx: () => cx,
				cxData: () => cxData.value,
				includeOthers: () => includeOthers.value,
			})
		)!;
		await settle();

		expect(data.isCalculating.value).toBe(false);
		expect(data.bases.value.map((b) => b.planUuid)).toEqual([linked.uuid]);
		expect(calculatePlan).toHaveBeenCalledTimes(1);

		const row = data.materialRows.value.find((r) => r.buy)!;
		expect(row.buy!.planets[0].source.level).toBe("fallback");

		// fix the price: shows after the debounce, no plan recalculated
		cxData.value.ticker_empire.push({
			type: "BUY",
			ticker: row.ticker,
			value: 4242,
		});
		await new Promise((r) => setTimeout(r, 300));
		const after = data.materialRows.value.find(
			(r) => r.ticker === row.ticker
		)!;
		expect(after.buy!.planets[0]).toMatchObject({
			price: 4242,
			source: { level: "empire_ticker" },
		});
		expect(calculatePlan).toHaveBeenCalledTimes(1);

		// other empires' plans on request, the linked one from the cache
		includeOthers.value = true;
		await settle();
		expect(data.bases.value.map((b) => [b.planUuid, b.linked])).toEqual([
			[linked.uuid, true],
			[other.uuid, false],
		]);
		expect(calculatePlan).toHaveBeenCalledTimes(2);

		// COGM from linked plans only
		for (const c of data.materialCOGMs.value.values())
			expect(c.entries.every((e) => e.planUuid === linked.uuid)).toBe(
				true
			);

		scope.stop();
	});

	it("loads the plans' planets and skips only a plan that fails", async () => {
		vi.mocked(useQuery).mockClear();
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const broken = {
			...etherwindPlan(),
			uuid: "8b0e6b1c-0000-4000-8000-000000000003",
			planet_natural_id: "XX-000x",
		};
		const both = {
			...cx,
			empires: [
				{
					...empires[0],
					plans: [{ uuid: linked.uuid }, { uuid: broken.uuid }],
				},
			],
		} as unknown as CX;

		const scope = effectScope();
		const data = scope.run(() =>
			useExchangePlanData({
				plans: () => [linked, broken],
				empires: () => empires,
				cx: () => both,
				cxData: () => universe,
				includeOthers: () => false,
			})
		)!;
		await settle();

		expect(useQuery).toHaveBeenCalledWith("GetMaterials");
		expect(useQuery).toHaveBeenCalledWith("GetExchanges");
		expect(useQuery).toHaveBeenCalledWith("GetBuildings");
		expect(useQuery).toHaveBeenCalledWith("GetRecipes");
		expect(useQuery).toHaveBeenCalledWith("GetMultiplePlanets", {
			planetNaturalIds: [linked.planet_natural_id, "XX-000x"].sort(),
		});
		expect(data.bases.value.map((b) => b.planUuid)).toEqual([linked.uuid]);
		expect(data.isCalculating.value).toBe(false);

		error.mockRestore();
		scope.stop();
	});

	it("waits for game data still loading before calculating", async () => {
		vi.mocked(calculatePlan).mockClear();
		let release!: () => void;
		const slow = new Promise<never[]>((r) => (release = () => r([])));
		// materials arrive late, e.g. after a token refresh
		vi.mocked(useQuery).mockImplementation(((name: string) => ({
			execute: name === "GetMaterials" ? () => slow : execute,
		})) as never);

		const scope = effectScope();
		const data = scope.run(() =>
			useExchangePlanData({
				plans: () => [linked],
				empires: () => empires,
				cx: () => cx,
				cxData: () => universe,
				includeOthers: () => false,
			})
		)!;
		await settle();
		expect(calculatePlan).not.toHaveBeenCalled();
		expect(data.isCalculating.value).toBe(true);

		release();
		await settle();
		expect(calculatePlan).toHaveBeenCalledTimes(1);
		expect(data.bases.value.map((b) => b.planUuid)).toEqual([linked.uuid]);

		vi.mocked(useQuery).mockImplementation((() => ({ execute })) as never);
		scope.stop();
	});

	describe("edge cases", () => {
		const source = (
			over: Partial<Parameters<typeof useExchangePlanData>[0]> = {}
		) => ({
			plans: () => [linked],
			empires: () => empires,
			cx: () => cx,
			cxData: () => universe,
			includeOthers: () => false,
			...over,
		});

		function start(src: Parameters<typeof useExchangePlanData>[0]) {
			const scope = effectScope();
			const data = scope.run(() => useExchangePlanData(src))!;
			return { scope, data };
		}

		it("prices a plan listed in several empires once", async () => {
			vi.mocked(calculatePlan).mockClear();
			const twice = {
				...cx,
				empires: [empires[0], { ...empires[0], uuid: "E3" }],
			} as unknown as CX;
			const { scope, data } = start(source({ cx: () => twice }));
			await settle();

			expect(data.bases.value.map((b) => b.planUuid)).toEqual([
				linked.uuid,
			]);
			expect(calculatePlan).toHaveBeenCalledTimes(1);
			scope.stop();
		});

		it("lists an unnamed plan with an empty name", async () => {
			const unnamed = { ...etherwindPlan(), plan_name: undefined };
			const { scope, data } = start(
				source({ plans: () => [unnamed as never] })
			);
			await settle();

			expect(data.bases.value.map((b) => b.planName)).toEqual([""]);
			scope.stop();
		});

		it("asks for no planets when nothing is to be priced", async () => {
			vi.mocked(useQuery).mockClear();
			const { scope, data } = start(
				source({ plans: () => [], cx: () => undefined })
			);
			await settle();

			expect(useQuery).toHaveBeenCalledWith("GetMaterials");
			expect(useQuery).not.toHaveBeenCalledWith(
				"GetMultiplePlanets",
				expect.anything()
			);
			expect(data.bases.value).toEqual([]);
			expect(data.isCalculating.value).toBe(false);
			scope.stop();
		});

		it("prices at Universe without CX data", async () => {
			const { scope, data } = start(source({ cxData: () => undefined }));
			await settle();

			expect(data.pricedData.value).toBeUndefined();
			const row = data.materialRows.value.find((r) => r.buy)!;
			expect(row.buy!.planets[0].source.level).toBe("fallback");
			expect(
				data.priceBookFor(linked.planet_natural_id, undefined)
			).toBeDefined();
			scope.stop();
		});

		it("lists the materials of one planet's plans", async () => {
			const { scope, data } = start(source());
			await settle();

			const rows = data.planetMaterialRows(linked.planet_natural_id);

			expect(rows.length).toBeGreaterThan(0);
			expect(rows.map((r) => r.ticker)).toEqual(
				data.materialRows.value.map((r) => r.ticker)
			);
			expect(data.planetMaterialRows("XX-nothing")).toEqual([]);
			scope.stop();
		});

		it("lets a newer calculation replace one still running", async () => {
			vi.mocked(calculatePlan).mockClear();
			let release!: () => void;
			const slow = new Promise<never[]>((r) => (release = () => r([])));
			vi.mocked(useQuery).mockImplementation(((name: string) => ({
				execute: name === "GetMaterials" ? () => slow : execute,
			})) as never);
			const includeOthers = ref(false);
			const { scope, data } = start(
				source({
					plans: () => [linked, other],
					includeOthers: () => includeOthers.value,
				})
			);
			await settle();

			// the list changes while the first run waits for its game data
			includeOthers.value = true;
			await settle();
			release();
			await settle();

			expect(data.bases.value.map((b) => b.planUuid)).toEqual([
				linked.uuid,
				other.uuid,
			]);
			expect(data.progress.value).toEqual({ current: 2, total: 2 });
			expect(data.isCalculating.value).toBe(false);

			vi.mocked(useQuery).mockImplementation((() => ({
				execute,
			})) as never);
			scope.stop();
		});

		it("drops the result of a run stopped before it finished", async () => {
			const actual = await vi.importActual<
				typeof import("@/features/planning/engine/calculatePlan")
			>("@/features/planning/engine/calculatePlan");
			const { scope, data } = start(source());
			vi.mocked(calculatePlan).mockImplementationOnce((...args) => {
				// the page is left while the last plan is calculated
				scope.stop();
				return actual.calculatePlan(...args);
			});
			await settle();

			expect(data.bases.value).toEqual([]);
		});
	});
});
