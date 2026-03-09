import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// stores
import { usePlanningStore } from "@/stores/planningStore";

// test data
import plan_etherwind from "@/tests/test_data/api_data_plan_etherwind.json";
import empire_list from "@/tests/test_data/api_data_empire_list.json";
import cx_list from "@/tests/test_data/api_data_cx_list.json";
import shared_list from "@/tests/test_data/api_data_shared_list.json";
import fio_storage from "@/tests/test_data/api_data_fio_storage.json";

const etherwindUuid: string = "41094cb6-c4bc-429f-b8c8-b81d02b3811c";

describe("Planning Store", async () => {
	let planningStore: ReturnType<typeof usePlanningStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		planningStore = usePlanningStore();

		vi.resetAllMocks();
	});

	describe("setters and getters", async () => {
		it("setEmpires", async () => {
			planningStore.setEmpires(empire_list);
			expect(Object.keys(planningStore.empires).length).toBe(7);
		});

		it("setPlan", async () => {
			// @ts-expect-error mock data
			planningStore.setPlan(plan_etherwind);
			const ewUuid: string = plan_etherwind.uuid;
			expect(planningStore.plans[ewUuid]).toBeDefined();
		});

		it("setPlan, no uuid", async () => {
			// @ts-expect-error mock data
			expect(() => planningStore.setPlan({ name: "foo" })).toThrowError();
		});

		it("setPlans", async () => {
			// @ts-expect-error mock data
			planningStore.setPlans([plan_etherwind, plan_etherwind]);
			// same uuid, one entry
			expect(Object.keys(planningStore.plans).length).toBe(1);
		});

		it("deletePlan", async () => {
			// @ts-expect-error mock data
			planningStore.setPlan(plan_etherwind);
			const ewUuid: string = plan_etherwind.uuid;
			expect(planningStore.plans[ewUuid]).toBeDefined();
			planningStore.deletePlan(ewUuid);
			expect(planningStore.plans[ewUuid]).toBeUndefined();
		});

		it("setCXs", async () => {
			// @ts-expect-error mock data
			planningStore.setCXs(cx_list);
			expect(Object.keys(planningStore.cxs).length).toBe(5);
		});

		it("setCXs", async () => {
			// @ts-expect-error mock data
			planningStore.setCXs(cx_list);
			const result = planningStore.getAllCX();
			expect(result.length).toBe(cx_list.length);
		});

		it("setCX", async () => {
			planningStore.$reset();

			// can't set as not existis
			// @ts-expect-error mock data
			planningStore.setCX(cx_list[0].uuid, cx_list[0].cx_data);
			expect(Object.keys(planningStore.cxs).length).toBe(0);

			// @ts-expect-error mock data
			planningStore.setCXs([cx_list[0]]);
			expect(Object.keys(planningStore.cxs).length).toBe(1);

			// @ts-expect-error mock data
			planningStore.setCX(cx_list[0].uuid, cx_list[0].cx_data);
			expect(Object.keys(planningStore.cxs).length).toBe(1);
		});

		it("getCX", async () => {
			// @ts-expect-error mock data
			planningStore.setCXs(cx_list);
			expect(
				planningStore.getCX("8eec58c8-7fcb-4bc6-bfc9-56879d297a18")
			).toBeDefined();
			expect(() => planningStore.getCX("foo")).toThrowError();
		});

		it("setSharedList", async () => {
			// @ts-expect-error mock date
			planningStore.setSharedList(shared_list);
			expect(Object.keys(planningStore.shared).length).toBe(3);
		});

		it("getSharedList", async () => {
			// @ts-expect-error mock date
			planningStore.setSharedList(shared_list);
			const result = planningStore.getSharedList();

			expect(result).toStrictEqual(shared_list);
		});

		it("deleteShared", async () => {
			// @ts-expect-error mock date
			planningStore.setSharedList(shared_list);
			const sharedPlanUuid: string =
				"0fa56f16-a1cc-496a-9a39-bb93f172b9f4";
			planningStore.deleteShared(sharedPlanUuid);
			expect(Object.keys(planningStore.shared).length).toBe(2);
		});

		describe("getPlan", async () => {
			it("plan uuid already fetched", async () => {
				// @ts-expect-error mock data
				planningStore.plans[etherwindUuid] = plan_etherwind;

				const result = await planningStore.getPlan(etherwindUuid);
				expect(result.uuid).toBe(etherwindUuid);
			});

			it("fetch non existing plan", async () => {
				await expect(() =>
					planningStore.getPlan("foo")
				).rejects.toThrowError();
			});
		});
	});

	it("$reset", async () => {
		// @ts-expect-error mock data
		planningStore.plans = true;
		// @ts-expect-error mock data
		planningStore.empires = true;
		// @ts-expect-error mock data
		planningStore.cxs = true;
		// @ts-expect-error mock data
		planningStore.shared = true;

		planningStore.$reset();

		expect(planningStore.plans).toStrictEqual({});
		expect(planningStore.empires).toStrictEqual({});
		expect(planningStore.cxs).toStrictEqual({});
		expect(planningStore.shared).toStrictEqual({});
	});
});

describe("FIO Data", async () => {
	let planningStore: ReturnType<typeof usePlanningStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		planningStore = usePlanningStore();

		vi.resetAllMocks();
	});

	describe("Functions", () => {
		it("$reset", async () => {
			planningStore.fio_storage_planets = {};
			planningStore.fio_storage_ships = {};
			planningStore.fio_storage_warehouses = {};
			planningStore.fio_sites_planets = {};

			planningStore.$reset();

			expect(Object.keys(planningStore.fio_storage_planets).length).toBe(
				0
			);
			expect(Object.keys(planningStore.fio_storage_ships).length).toBe(0);
			expect(
				Object.keys(planningStore.fio_storage_warehouses).length
			).toBe(0);
			expect(Object.keys(planningStore.fio_sites_planets).length).toBe(0);
		});

		it("getStoreSize", async () => {
			const results = await planningStore.getStoreSize();

			expect(results.length).toBe(8);
		});
	});
});
