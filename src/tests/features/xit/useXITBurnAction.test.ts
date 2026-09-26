import { effectScope, Ref, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

// Stores
import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";

// Composables
import { useBurnXITAction } from "@/features/xit/useBurnXITAction";

// Types & Interfaces
import { IXITActionElement } from "@/features/xit/xitAction.types";

// test data
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";

describe("useBurnXITAction", async () => {
	beforeAll(async () => {
		setActivePinia(createPinia());

		await materialsStore.setMany(materials);

		const { preload } = useMaterialData();

		await preload();
		await flushPromises();
	});

	const elements: IXITActionElement[] = [
		{
			ticker: "ALO",
			stock: 20,
			delta: -2,
		},
		{
			ticker: "FEO",
			stock: 10,
			delta: 1,
		},
		{
			ticker: "LST",
			stock: 25,
			delta: -5.1,
		},
		{
			ticker: "EPO",
			stock: 100,
			delta: -1,
		},
		{
			ticker: "H",
			stock: 30,
			delta: 5,
		},
	];
	const resupplyDays: number = 5;
	const hideInfinite: boolean = true;
	const materialOverrides: Ref<Record<string, number>> = ref({
		ALO: 10,
	});
	const materialInactives: Set<string> = new Set(["FEO"]);

	it("materialTable", async () => {
		const { materialTable } = useBurnXITAction(
			ref(elements),
			ref(resupplyDays),
			ref(hideInfinite),
			ref(materialOverrides),
			ref(materialInactives),
			ref(undefined),
			ref(undefined)
		);

		expect(materialTable.value.length).toBe(3);
		expect(materialTable.value[0].total).toBe(10);
		expect(materialTable.value[1].total).toBe(1);
		expect(materialTable.value[2].total).toBe(0);
	});

	it("totalWeightVolume", async () => {
		const { totalWeightVolume } = useBurnXITAction(
			ref(elements),
			ref(resupplyDays),
			ref(hideInfinite),
			ref(materialOverrides),
			ref(materialInactives),
			ref(undefined),
			ref(undefined)
		);

		expect(totalWeightVolume.value.totalWeight).toBe(16.230000257492065);
		expect(totalWeightVolume.value.totalVolume).toBe(11);
	});

	it("fit", async () => {
		const days = ref(5);

		const { fit } = useBurnXITAction(
			ref(elements),
			days,
			ref(hideInfinite),
			ref(materialOverrides),
			ref(materialInactives),
			ref(undefined),
			ref(undefined)
		);

		fit(50, 50);
		expect(days.value).toBe(7);

		fit(500, 500);
		expect(days.value).toBe(39);

		days.value = 50;
		fit(50, 50);
		expect(days.value).toBe(7);
	});

	it("stops updating totalPrice once its scope is stopped", async () => {
		// @ts-expect-error mock data date as string
		await exchangesStore.setMany(exchanges);

		const days = ref(5);
		const scope = effectScope();
		const { totalPrice } = scope.run(() =>
			useBurnXITAction(
				ref([{ ticker: "RAT", stock: 0, delta: -10 }]),
				days,
				ref(true),
				ref({}),
				ref(new Set<string>()),
				ref(undefined),
				ref(undefined)
			)
		)!;

		// live while the scope is active
		await vi.waitFor(() => expect(totalPrice.value).toBeGreaterThan(0));
		const initial = totalPrice.value;
		days.value = 10;
		await vi.waitFor(() => expect(totalPrice.value).toBe(initial * 2));

		scope.stop();
		days.value = 20;
		await flushPromises();

		expect(totalPrice.value).toBe(initial * 2);
	});
});
