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
		console.log(result);

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
			planName: "Unnamed",
			planUuid: "B",
			planetId: "B",
		});
	});
});
