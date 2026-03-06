import { beforeAll, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";

// Composables
import { useHQUpgradeCalculator } from "@/features/hq_upgrade_calculator/useHQUpgradeCalculator";

// stores
import { materialsStore, exchangesStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";

// test data
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";

describe("useHQUpgradeCalculator", async () => {
	const refStart = ref(1);
	const refTo = ref(3);
	const refOverride = ref({});
	const refCXUuid = ref(undefined);

	beforeAll(async () => {
		setActivePinia(createPinia());

		await materialsStore.setMany(materials);
		// @ts-expect-error mock data with string as date
		await exchangesStore.setMany(exchanges);

		const { preload } = useMaterialData();

		await preload();
		await flushPromises();
	});

	it("levelOptions", async () => {
		const { levelOptions, levelOptionsTo } = await useHQUpgradeCalculator(
			refStart,
			refTo,
			refOverride,
			refCXUuid
		);

		expect(levelOptions.length).toBeGreaterThan(1);
		expect(levelOptionsTo.value.length).toBe(levelOptions.length);
	});

	it("materialData", async () => {
		const { materialData, calculateMaterialData } =
			await useHQUpgradeCalculator(
				refStart,
				refTo,
				refOverride,
				refCXUuid
			);

		await calculateMaterialData();

		expect(materialData.value).toBeDefined();
		expect(materialData.value.length).toBeGreaterThan(1);
	});

	it("totalCost", async () => {
		const { totalCost } = await useHQUpgradeCalculator(
			refStart,
			refTo,
			refOverride,
			refCXUuid
		);

		expect(totalCost.value).toBeDefined();
	});

	it("totalWeightVolume", async () => {
		const { totalWeightVolume, calculateMaterialData } =
			await useHQUpgradeCalculator(
				refStart,
				refTo,
				refOverride,
				refCXUuid
			);

		await calculateMaterialData();

		expect(Object.keys(totalWeightVolume.value).length).toBe(2);
		expect(totalWeightVolume.value.totalVolume).toBe(85.60000044107437);
		expect(totalWeightVolume.value.totalWeight).toBe(33.32000006735325);
	});
});
