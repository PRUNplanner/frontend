import { describe, it, expect, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { usePlan } from "@/features/planning_data/usePlan";

import {
	callCreatePlan,
	callGetPlan,
	callSavePlan,
} from "@/features/api/planData.api";

vi.mock("@/features/api/planData.api", async () => {
	return {
		...(await vi.importActual("@/features/api/planData.api")),
		callGetShared: vi.fn(),
		callCreatePlan: vi.fn(),
		callSavePlan: vi.fn(),
		callGetPlan: vi.fn(),
		callPatchPlanMaterialIO: vi.fn(),
	};
});

vi.mock("@/features/api/gameData.api", async () => {
	return {
		...(await vi.importActual("@/features/api/gameData.api")),
		callDataMaterials: vi.fn(),
		callDataExchanges: vi.fn(),
		callDataRecipes: vi.fn(),
		callDataBuildings: vi.fn(),
		callDataPlanet: vi.fn(),
		callDataMultiplePlanets: vi.fn(),
	};
});

describe("usePlan", async () => {
	setActivePinia(createPinia());
	const planningStore = usePlanningStore();

	it("mapPlanetToPlanType", async () => {
		const { mapPlanetToPlanType } = usePlan();

		expect(mapPlanetToPlanType("ADVERTISING_AGRICULTURE")).toBe(
			"AGRICULTURE"
		);
		expect(mapPlanetToPlanType(null)).toBe("---");
		expect(mapPlanetToPlanType("Invalid")).toBe("---");
		// @ts-expect-error fake data
		expect(mapPlanetToPlanType("On_Strike")).toBe("---");
	});

	it("createBlankDefinition", async () => {
		const { createBlankDefinition } = usePlan();

		const result = createBlankDefinition("OT-580b", null);

		expect(result.planet_natural_id).toBe("OT-580b");
		expect(result.plan_data.experts.length).toBe(9);
		expect(result.plan_data.workforce.length).toBe(5);
		expect(result.plan_data.infrastructure.length).toBe(0);
		expect(result.plan_data.buildings.length).toBe(0);
		expect(result.empires?.length).toBe(0);
	});

	describe("createNewPlan", async () => {
		const fakeUuid: string = "41094cb6-c4bc-429f-b8c8-b81d02b3811c";

		it("success, uuid return", async () => {
			const { createNewPlan } = usePlan();
			vi.mocked(callCreatePlan).mockResolvedValueOnce({
				uuid: fakeUuid,
				modified_at: "v1",
			});
			// @ts-expect-error mock data
			vi.mocked(callGetPlan).mockResolvedValueOnce({ uuid: fakeUuid });

			// @ts-expect-error mock data
			const result = await createNewPlan({});

			expect(result).toStrictEqual({ uuid: fakeUuid, modifiedAt: "v1" });
			expect(callGetPlan).toHaveBeenCalledWith(fakeUuid);
		});

		it("failure, undefined return", async () => {
			const { createNewPlan } = usePlan();
			vi.mocked(callCreatePlan).mockRejectedValueOnce(new Error());

			// @ts-expect-error mock data
			await expect(createNewPlan({})).resolves.toBe(undefined);
		});
	});

	describe("saveExistingPlan", async () => {
		const fakeUuid: string = "41094cb6-c4bc-429f-b8c8-b81d02b3811c";

		it("success, uuid and new version", async () => {
			const { saveExistingPlan } = usePlan();
			vi.mocked(callSavePlan).mockResolvedValueOnce({
				uuid: fakeUuid,
				modified_at: "v2",
			});
			// @ts-expect-error mock data
			vi.mocked(callGetPlan).mockResolvedValueOnce({ uuid: fakeUuid });

			// @ts-expect-error mock data
			const result = await saveExistingPlan(fakeUuid, {}, "v1");

			expect(result).toStrictEqual({ uuid: fakeUuid, modifiedAt: "v2" });
			expect(callSavePlan).toHaveBeenLastCalledWith(fakeUuid, {
				uuid: fakeUuid,
				base_modified_at: "v1",
			});
		});

		it.each([
			[Object.assign(new Error(), { status: 500 }), "failed"],
			[
				Object.assign(new Error(), {
					status: 409,
					responseData: { code: "conflict" },
				}),
				"conflict",
			],
			[Object.assign(new Error(), { status: 404 }), "deleted"],
		])("failure %#, error kind", async (err, error) => {
			const { saveExistingPlan } = usePlan();
			vi.mocked(callSavePlan).mockRejectedValueOnce(err);

			// @ts-expect-error mock data
			await expect(saveExistingPlan(fakeUuid, {})).resolves.toStrictEqual(
				{
					error,
				}
			);
		});
	});

	it("reloadExistingPlan", async () => {
		const fakeUuid: string = "41094cb6-c4bc-429f-b8c8-b81d02b3811c";
		const { reloadExistingPlan } = usePlan();
		planningStore.getPlan = vi.fn().mockResolvedValue({});

		const result = await reloadExistingPlan(fakeUuid);

		expect(result).toStrictEqual({});
	});

	describe("getPlanNamePlanet", async () => {
		it("unknown plan throws error", async () => {
			const { getPlanNamePlanet } = usePlan();

			expect(() => getPlanNamePlanet("moo")).toThrowError();
		});

		it("known plan returns planetId and planName", async () => {
			// @ts-expect-error mock data
			planningStore.plans["foo"] = {
				planet_natural_id: "1",
				plan_name: "2",
			};

			const { getPlanNamePlanet } = usePlan();

			const { planetId, planName } = getPlanNamePlanet("foo");

			expect(planetId).toBe("1");
			expect(planName).toBe("2");
		});

		it("known plan returns planetId and default planName", async () => {
			// @ts-expect-error mock data
			planningStore.plans["foo"] = {
				planet_natural_id: "1",
			};

			const { getPlanNamePlanet } = usePlan();

			const { planetId, planName } = getPlanNamePlanet("foo");

			expect(planetId).toBe("1");
			expect(planName).toBe("Unnamed");
		});
	});
});
