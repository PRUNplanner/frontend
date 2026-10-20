import { ref } from "vue";
import { beforeAll, describe, expect, it } from "vitest";

// Stores
import { usePlanningStore } from "@/stores/planningStore";
import { createPinia, setActivePinia } from "pinia";

import { useFIOBurn } from "@/features/fio/useFIOBurn";

const plan_A = {
	uuid: "A",
	plan_name: "test plan A",
	planet_natural_id: "A",
};
const plan_B = {
	uuid: "B",
	planet_natural_id: "B",
};

const result_A = {
	materialio: [
		{
			ticker: "Foo",
			input: 2,
			output: 1,
			delta: -1,
		},
		{
			ticker: "Moo",
			input: 5,
			output: 0,
			delta: -5,
		},
	],
};

const result_B = {
	materialio: [],
};

const fakePlans = [plan_A, plan_B];
const fakeData = {
	A: result_A,
	B: result_B,
};

describe("useFIOBurn", async () => {
	let planningStore: ReturnType<typeof usePlanningStore>;

	beforeAll(() => {
		setActivePinia(createPinia());
		planningStore = usePlanningStore();

		// @ts-expect-error mock data
		planningStore.fio_storage_planets["A"] = {
			StorageItems: [
				{
					MaterialTicker: "Foo",
					MaterialAmount: 2,
				},
				{
					MaterialTicker: "Moo",
					MaterialAmount: 100,
				},
			],
		};
	});

	it("planRecord", async () => {
		// @ts-expect-error mock data
		const { planRecord } = useFIOBurn(ref(fakePlans), ref(fakeData));

		expect(Object.keys(planRecord.value).length).toBe(2);
		expect(planRecord.value["A"]).toStrictEqual(plan_A);
		expect(planRecord.value["B"]).toStrictEqual(plan_B);
	});

	it("burnTable", async () => {
		// @ts-expect-error mock data
		const { burnTable } = useFIOBurn(ref(fakePlans), ref(fakeData));

		const result = burnTable.value;

		expect(result.length).toBe(2);
		expect(result[0]).toStrictEqual({
			burnMaterials: [],
			hasStorage: false,
			key: "B",
			minDays: 0,
			planName: "Unnamed",
			planUuid: "B",
			planetId: "B",
		});
		expect(result[1]).toStrictEqual({
			burnMaterials: [
				{
					delta: -1,
					exhaustion: 2,
					input: 2,
					output: 1,
					stock: 2,
					ticker: "Foo",
				},
				{
					delta: -5,
					exhaustion: 20,
					input: 5,
					output: 0,
					stock: 100,
					ticker: "Moo",
				},
			],
			hasStorage: true,
			key: "A",
			minDays: 2,
			planName: "test plan A",
			planUuid: "A",
			planetId: "A",
		});
	});

	it("planTable", async () => {
		// @ts-expect-error mock data
		const { planTable } = useFIOBurn(ref(fakePlans), ref(fakeData));

		const result = planTable.value;

		expect(result[0]).toStrictEqual({
			minDays: 0,
			burnMaterials: [],
			planName: "Unnamed",
			planUuid: "B",
			planetId: "B",
		});
	});

	it("burnTable: reacts to FIO storage refresh", async () => {
		// @ts-expect-error mock data
		const { burnTable } = useFIOBurn(ref(fakePlans), ref(fakeData));

		expect(burnTable.value[0].hasStorage).toBe(false);

		// store replaces the whole object on refresh
		planningStore.fio_storage_planets = {
			...planningStore.fio_storage_planets,
			// @ts-expect-error mock data
			B: { StorageItems: [] },
		};

		expect(burnTable.value[0].hasStorage).toBe(true);
	});

	it("leaves out a result whose plan is gone", () => {
		// deleted or moved in another tab, not recalculated yet
		const { burnTable, planTable } = useFIOBurn(
			// @ts-expect-error mock data
			ref([plan_A]),
			ref({ ...fakeData, GONE: result_A })
		);

		expect(burnTable.value.map((p) => p.planUuid)).toStrictEqual(["A"]);
		expect(planTable.value.map((p) => p.planUuid)).toStrictEqual(["A"]);
	});

	describe("with several plans", () => {
		const mat = (ticker: string, delta: number) => ({
			ticker,
			input: delta < 0 ? -delta : 0,
			output: delta > 0 ? delta : 0,
			delta,
		});
		const plans = [
			{ uuid: "Z", plan_name: "Zeta", planet_natural_id: "A" },
			{ uuid: "M", plan_name: "Mid", planet_natural_id: "A" },
			{ uuid: "F", plan_name: "Alpha", planet_natural_id: "A" },
			{ uuid: "N", plan_name: "Nomad", planet_natural_id: "NoStorage" },
		];
		const data = {
			F: { materialio: [] },
			Z: { materialio: [mat("Foo", -4), mat("Moo", -1)] },
			M: { materialio: [mat("Foo", 3), mat("Unstocked", -2)] },
			N: { materialio: [mat("Foo", -2)] },
		};

		it("sorts plans and tables by plan name", () => {
			// @ts-expect-error mock data
			const { burnTable, planTable } = useFIOBurn(ref(plans), ref(data));

			expect(burnTable.value.map((p) => p.planName)).toStrictEqual([
				"Alpha",
				"Mid",
				"Nomad",
				"Zeta",
			]);
			expect(planTable.value.map((p) => p.planUuid)).toStrictEqual([
				"F",
				"M",
				"N",
				"Z",
			]);
		});

		it("takes the shortest exhaustion as the plan's minimum", () => {
			// @ts-expect-error mock data
			const { burnTable } = useFIOBurn(ref(plans), ref(data));

			const zeta = burnTable.value.find((p) => p.planUuid === "Z")!;

			// Foo: 2 in stock / 4 per day, Moo: 100 / 1 per day
			expect(zeta.burnMaterials.map((m) => m.exhaustion)).toStrictEqual([
				0.5, 100,
			]);
			expect(zeta.minDays).toBe(0.5);
		});

		it("treats a planet without FIO storage as empty", () => {
			// @ts-expect-error mock data
			const { burnTable } = useFIOBurn(ref(plans), ref(data));

			const nomad = burnTable.value.find((p) => p.planUuid === "N")!;

			expect(nomad.hasStorage).toBe(false);
			expect(nomad.burnMaterials[0]).toMatchObject({
				stock: 0,
				exhaustion: 0,
			});
		});

		it("never exhausts a producing material or one missing in storage", () => {
			// @ts-expect-error mock data
			const { burnTable } = useFIOBurn(ref(plans), ref(data));

			const mid = burnTable.value.find((p) => p.planUuid === "M")!;

			expect(mid.burnMaterials[0]).toMatchObject({
				stock: 2,
				exhaustion: Infinity,
			});
			// no stock of it in the planet's storage: empty on day 0
			expect(mid.burnMaterials[1]).toMatchObject({
				stock: 0,
				exhaustion: 0,
			});
			expect(mid.minDays).toBe(0);
		});
	});
});
