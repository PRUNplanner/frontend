import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Composables
import { useFIOStorage } from "@/features/fio/useFIOStorage";

// test data
import fio_storage from "@/tests/test_data/api_data_fio_storage.json";

// stores
import { usePlanningStore } from "@/stores/planningStore";

describe("useFIOStorage", async () => {
	let planningStore: ReturnType<typeof usePlanningStore>;

	beforeEach(() => {
		setActivePinia(createPinia());

		planningStore = usePlanningStore();
		planningStore.$reset();
	});

	describe("hasStorage", async () => {
		it("hasStorage - none", async () => {
			const { hasStorage } = useFIOStorage();

			expect(hasStorage.value).toBeFalsy();
		});

		it("hasStorage - yes", async () => {
			// @ts-expect-error test data
			planningStore.setFIOStorageData(fio_storage);

			const { hasStorage } = useFIOStorage();
			expect(hasStorage.value).toBeTruthy();
		});
	});

	describe("findStorageValueFromOptions", async () => {
		it("not available, default to 0", async () => {
			const { findStorageValueFromOptions } = useFIOStorage();

			expect(findStorageValueFromOptions(undefined, "RAT")).toBe(0);
			expect(findStorageValueFromOptions("PLANET#FOO", "RAT")).toBe(0);
			expect(findStorageValueFromOptions("WAR#FOO", "RAT")).toBe(0);
			expect(findStorageValueFromOptions("SHIP#FOO", "RAT")).toBe(0);
		});

		it("available and valid data", async () => {
			// @ts-expect-error test data
			planningStore.setFIOStorageData(fio_storage);

			const { findStorageValueFromOptions } = useFIOStorage();

			expect(findStorageValueFromOptions("PLANET#ZV-307c", "PWO")).toBe(
				63
			);
			expect(findStorageValueFromOptions("WAR#ANT", "PWO")).toBe(618);
			expect(findStorageValueFromOptions("SHIP#AVI-04WD9", "H2O")).toBe(
				1250
			);
		});
	});

	it("storageOptions", async () => {
		// @ts-expect-error test data
		planningStore.setFIOStorageData(fio_storage);

		const { storageOptions } = useFIOStorage();

		expect(storageOptions.value[0]).toBeDefined();
		expect(storageOptions.value[0].value).toBeUndefined();
		expect(storageOptions.value[1].children).toBeDefined();
		expect(storageOptions.value[2].children).toBeDefined();
		expect(storageOptions.value[3].children).toBeDefined();
	});

	it("findMaterial", async () => {
		// @ts-expect-error test data
		planningStore.setFIOStorageData(fio_storage);

		const { findMaterial } = useFIOStorage();

		const first = findMaterial("RAT");
		expect(first.amount).toBe(38091);
		expect(first.locations.length).toBe(21);
		const second = findMaterial("FOO");
		expect(second.amount).toBe(0);
		expect(second.locations.length).toBe(0);
	});
});
