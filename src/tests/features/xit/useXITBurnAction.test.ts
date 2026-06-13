import { Ref, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { describe, it, expect, beforeAll } from "vitest";
import { flushPromises } from "@vue/test-utils";

// Stores
import { materialsStore, exchangesStore } from "@/database/stores";
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
		// @ts-expect-error mock data date as string
		await exchangesStore.setMany(exchanges);

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
		const { materialTable } = await useBurnXITAction(
			ref("simple"),
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
		const { totalWeightVolume } = await useBurnXITAction(
			ref("simple"),
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

		const { fit } = await useBurnXITAction(
			ref("simple"),
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

	it("solverMode uses ship capacity instead of uniform day scaling", async () => {
		const { materialTable, totalWeightVolume } = await useBurnXITAction(
			ref("solver"),
			ref(elements),
			ref(14), // resupply days
			ref(false),
			ref({}),
			ref(new Set<string>()),
			ref(undefined),
			ref(undefined),
			ref(20), // ship weight capacity
			ref(20), // ship volume capacity
			ref(1.0)
		);

		const loaded = materialTable.value.filter(
			(m) => m.active && m.total > 0 && m.delta < 0
		);

		// Assert that the loaded materials are within the ship capacity
		expect(loaded.length).toBeGreaterThan(0);
		expect(totalWeightVolume.value.totalWeight).toBeLessThanOrEqual(20);
		expect(totalWeightVolume.value.totalVolume).toBeLessThanOrEqual(20);

		// Assert that the simple totals are less than the uniform need
		const simpleTotals = loaded.reduce(
			(sum, m) => sum + m.total,
			0
		);
		const uniformNeed = loaded.reduce((sum, m) => {
			const need = Math.max(
				0,
				Math.ceil(m.delta * -1 * 14 - m.stock)
			);
			return sum + need;
		}, 0);
		expect(simpleTotals).toBeLessThan(uniformNeed);
	});

	it("solverMode keeps total within ship capacity when overrides pre-load cargo", async () => {
		const shipWeightCapacity = 2000;
		const shipVolumeCapacity = 2000;

		// LST weighs 2.73t / 1m3 per unit, so an override of 200 units
		// pre-loads 546t / 200m3 of cargo before the solver runs.
		const solverElements: IXITActionElement[] = [
			{ ticker: "LST", stock: 0, delta: -5 },
			// High burn so the solver wants to fill the entire ship on its own.
			{ ticker: "RAT", stock: 0, delta: -300 },
			{ ticker: "DW", stock: 0, delta: -300 },
		];

		const { totalWeightVolume } = await useBurnXITAction(
			ref("solver"),
			ref(solverElements),
			ref(45), // target days
			ref(false),
			ref({ LST: 200 }), // static override / pre-loaded cargo
			ref(new Set<string>()),
			ref(undefined),
			ref(undefined),
			ref(shipWeightCapacity),
			ref(shipVolumeCapacity),
			ref(1.0)
		);

		expect(totalWeightVolume.value.totalWeight).toBeLessThanOrEqual(
			shipWeightCapacity
		);
		expect(totalWeightVolume.value.totalVolume).toBeLessThanOrEqual(
			shipVolumeCapacity
		);
	});

	it("solverMode loads nothing when overrides already fill the ship", async () => {
		const shipWeightCapacity = 100;
		const shipVolumeCapacity = 2000;

		const solverElements: IXITActionElement[] = [
			// LST override: 100 units * 2.73t = 273t > 100t capacity.
			{ ticker: "LST", stock: 0, delta: -5 },
			{ ticker: "RAT", stock: 0, delta: -300 },
			{ ticker: "DW", stock: 0, delta: -300 },
		];

		const { materialTable, totalWeightVolume } = await useBurnXITAction(
			ref("solver"),
			ref(solverElements),
			ref(45),
			ref(false),
			ref({ LST: 100 }),
			ref(new Set<string>()),
			ref(undefined),
			ref(undefined),
			ref(shipWeightCapacity),
			ref(shipVolumeCapacity),
			ref(1.0)
		);

		const solverLoaded = materialTable.value.filter(
			(m) => m.ticker !== "LST" && m.total > 0
		);
		expect(solverLoaded.length).toBe(0);
		expect(totalWeightVolume.value.totalVolume).toBe(100);
	});

	it("solverMode excludes inactive materials from solver demand", async () => {
		const { materialTable } = await useBurnXITAction(
			ref("solver"),
			ref(elements),
			ref(14),
			ref(false),
			ref({}),
			ref(new Set<string>(["LST"])),
			ref(undefined),
			ref(undefined),
			ref(1000),
			ref(1000),
			ref(1.0)
		);

		const inactiveMaterial = materialTable.value.find(
			(m) => m.ticker === "LST"
		);

		expect(inactiveMaterial?.active).toBe(false);
		expect(inactiveMaterial?.total).toBe(0);
	});
});
