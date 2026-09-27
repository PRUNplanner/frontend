import { setActivePinia, createPinia } from "pinia";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { useQueryStore } from "@/lib/query_cache/queryStore";
import { planetsStore } from "@/database/stores";

import { callDataMultiplePlanets } from "@/features/api/gameData.api";
import { callGetEmpirePlans } from "@/features/api/empireData.api";
import { callGetPlanlist } from "@/features/api/planData.api";

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
}));

const planet = { planet_natural_id: "OT-580b", planet_name: "Montem" };
const plan = { uuid: "plan-1", planet_natural_id: "OT-580b" };

describe("queryRepository", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(callDataMultiplePlanets).mockReset();
		vi.mocked(callGetEmpirePlans).mockReset();
		vi.mocked(callGetPlanlist).mockReset();
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
			await expect(
				// @ts-expect-error union of query params
				queryStore.execute(name, params)
			).rejects.toThrow("network");

			// @ts-expect-error mock data
			vi.mocked(api).mockResolvedValueOnce(data);
			// @ts-expect-error union of query params
			expect(await queryStore.execute(name, params)).toStrictEqual(data);
			expect(api).toHaveBeenCalledTimes(2);
		});
	});
});
