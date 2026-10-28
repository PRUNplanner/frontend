import { setActivePinia, createPinia } from "pinia";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { useQueryStore } from "@/lib/query_cache/queryStore";
import { queryRepository } from "@/lib/query_cache/queryRepository";
import { batchRefresh } from "@/lib/query_cache/queryBatches";
import { planetsStore } from "@/database/stores";

import { callDataMultiplePlanets } from "@/features/api/gameData.api";
import { callGetEmpirePlans } from "@/features/api/empireData.api";
import {
	callClonePlan,
	callDeletePlan,
	callGetPlanlist,
	callSavePlan,
} from "@/features/api/planData.api";
import { callCreateSharing } from "@/features/api/sharingData.api";

vi.mock("@/features/api/gameData.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/features/api/gameData.api")>()),
	callDataMultiplePlanets: vi.fn(),
}));
vi.mock("@/features/api/empireData.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/features/api/empireData.api")>()),
	callGetEmpirePlans: vi.fn(),
}));
vi.mock("@/features/api/planData.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/features/api/planData.api")>()),
	callGetPlanlist: vi.fn(),
	callClonePlan: vi.fn(),
	callDeletePlan: vi.fn(),
	callSavePlan: vi.fn(),
}));
vi.mock("@/features/api/sharingData.api", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@/features/api/sharingData.api")
	>()),
	callCreateSharing: vi.fn(),
}));

const planet = { planet_natural_id: "OT-580b", planet_name: "Montem" };
const plan = { uuid: "plan-1", planet_natural_id: "OT-580b" };

describe("queryRepository", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(callDataMultiplePlanets).mockReset();
		vi.mocked(callGetEmpirePlans).mockReset();
		vi.mocked(callGetPlanlist).mockReset();
		vi.mocked(callClonePlan).mockReset();
		vi.mocked(callDeletePlan).mockReset();
		vi.mocked(callCreateSharing).mockReset();
		vi.mocked(callSavePlan).mockReset();
	});

	it("mutations have no key, batch links name existing definitions", () => {
		const definitions = Object.values(queryRepository) as object[];
		for (const definition of definitions) {
			expect(definition).not.toHaveProperty("persist");
			if ("mutation" in definition)
				expect(Object.keys(definition).sort()).toEqual([
					"fetchFn",
					"mutation",
				]);
		}
		expect(
			definitions.filter((d) => "mutation" in d).length
		).toBeGreaterThan(0);

		for (const link of batchRefresh) {
			expect(queryRepository).toHaveProperty(link.single);
			expect(queryRepository).toHaveProperty(link.multiple);
			expect(queryRepository[link.single]).toHaveProperty("autoRefetch", true);
		}
	});

	it("PatchPlan in flight: a forced planningdata refetch sends no second PATCH", async () => {
		const queryStore = useQueryStore();
		let resolveSave: (value: unknown) => void = () => {};
		vi.mocked(callSavePlan).mockImplementation(
			// @ts-expect-error mock data
			() => new Promise((resolve) => (resolveSave = resolve))
		);

		const pending = queryStore.execute("PatchPlan", {
			planUuid: "plan-1",
			// @ts-expect-error mock data
			data: {},
		});
		await queryStore.invalidateKey(["planningdata"], {
			exact: false,
			forceRefetch: true,
		});
		resolveSave({ uuid: "plan-1" });
		await pending;

		expect(callSavePlan).toHaveBeenCalledOnce();
	});

	it("GetMultiplePlanets: stores planets in IndexedDB", async () => {
		// @ts-expect-error mock data
		vi.mocked(callDataMultiplePlanets).mockResolvedValue([planet]);

		const data = await useQueryStore().execute("GetMultiplePlanets", {
			planetNaturalIds: ["OT-580b"],
		});

		expect(data).toStrictEqual([planet]);
		expect(await planetsStore.get("OT-580b")).toStrictEqual(planet);
	});

	// a swallowed error would be cached as a fresh empty list
	describe.each([
		{
			name: "GetMultiplePlanets" as const,
			params: { planetNaturalIds: ["OT-580b"] },
			api: callDataMultiplePlanets,
			data: [planet],
		},
		{
			name: "GetEmpirePlans" as const,
			params: { empireUuid: "empire-1" },
			api: callGetEmpirePlans,
			data: [plan],
		},
		{
			name: "GetAllPlans" as const,
			params: undefined,
			api: callGetPlanlist,
			data: [plan],
		},
	])("$name", ({ name, params, api, data }) => {
		it("rejects on failure and refetches instead of caching []", async () => {
			const queryStore = useQueryStore();

			vi.mocked(api).mockRejectedValueOnce(new Error("network"));
			await expect(queryStore.execute(name, params)).rejects.toThrow(
				"network"
			);

			// @ts-expect-error mock data
			vi.mocked(api).mockResolvedValueOnce(data);
			expect(await queryStore.execute(name, params)).toStrictEqual(data);
			expect(api).toHaveBeenCalledTimes(2);
		});
	});

	// an empire's list leaves out each plan's empires: opening such a plan
	// from the cache would calculate with the first empire
	it("seeds GetPlan only from plans that carry their empires", async () => {
		const queryStore = useQueryStore();
		const full = { ...plan, uuid: "plan-2", empires: [] };
		// @ts-expect-error mock data
		vi.mocked(callGetEmpirePlans).mockResolvedValue([plan, full]);

		await queryStore.execute("GetEmpirePlans", { empireUuid: "empire-1" });

		expect(
			queryStore.peekQueryState(["planningdata", "plan", "plan-1"])
		).toBeUndefined();
		expect(
			queryStore.peekQueryState(["planningdata", "plan", "plan-2"])?.data
		).toStrictEqual(full);
	});

	it("ClonePlan and DeletePlan: return the API response", async () => {
		const queryStore = useQueryStore();
		// @ts-expect-error mock data
		vi.mocked(callClonePlan).mockResolvedValue(plan);
		vi.mocked(callDeletePlan).mockResolvedValue(true);

		expect(
			await queryStore.execute("ClonePlan", {
				planUuid: "plan-1",
				cloneName: "Clone",
			})
		).toStrictEqual(plan);
		expect(
			await queryStore.execute("DeletePlan", { planUuid: "plan-1" })
		).toBe(true);
	});

	it("CreateSharedPlan: drops the shared list after the call", async () => {
		const queryStore = useQueryStore();
		queryStore.addCacheState("GetAllShared", undefined, []);

		let listDuringCall: unknown;
		vi.mocked(callCreateSharing).mockImplementation(async () => {
			listDuringCall = queryStore.peekQueryState([
				"planningdata",
				"shared",
				"list",
			]);
			return { uuid: "shared-1", view_count: 0, created_at: new Date() };
		});

		await queryStore.execute("CreateSharedPlan", { planUuid: "plan-1" });

		// a refetch in between would read the list without the new share
		expect(listDuringCall).toBeDefined();
		expect(
			queryStore.peekQueryState(["planningdata", "shared", "list"])
		).toBeUndefined();
	});
});
