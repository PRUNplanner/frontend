import { ref } from "vue";
import { beforeAll, describe, expect, it } from "vitest";

// Stores
import { usePlanningStore } from "@/stores/planningStore";
import { createPinia, setActivePinia } from "pinia";

import fio_storage from "@/tests/test_data/api_data_fio_storage.json";
import { useFIORepair } from "@/features/fio/useFIORepair";

describe("useFIORepair", async () => {
	let planningStore: ReturnType<typeof usePlanningStore>;

	const test_planets = ref(fio_storage.sites_data);

	beforeAll(() => {
		setActivePinia(createPinia());
		planningStore = usePlanningStore();
	});

	it("isInfrastructureBuilding", async () => {
		const { isInfrastructureBuilding } = useFIORepair(
			// @ts-expect-error mock data
			test_planets
		);

		expect(isInfrastructureBuilding("POL")).toBeFalsy();
		expect(isInfrastructureBuilding("HB1")).toBeTruthy();
		expect(isInfrastructureBuilding("HBL")).toBeTruthy();
		expect(isInfrastructureBuilding("STO")).toBeTruthy();
		expect(isInfrastructureBuilding("CM")).toBeTruthy();
	});

	it("planetRepairTable", async () => {
		const { planetRepairTable } = useFIORepair(
			// @ts-expect-error mock data
			test_planets
		);

		const result = planetRepairTable.value;

		expect(result.length).toBe(18);
		expect(result[0].amountBuildings).toBe(29);
		expect(result[0].amountProductionBuildings).toBe(17);
		expect(result[0].minCondition).toBe(0.9824314117431641);
		expect(result[0].averageCondition).toBe(0.9824314117431641);
		expect(result[0].maxLastRepairDays).toBe(49);
	});
});
