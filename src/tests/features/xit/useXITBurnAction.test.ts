import { effectScope, type Ref, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

// Stores
import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { useExchangeData } from "@/database/services/useExchangeData";

// Composables
import { useBurnXITAction } from "@/features/xit/useBurnXITAction";
import { usePrice } from "@/features/cx/usePrice";

// Types & Interfaces
import type { IXITActionElement } from "@/features/xit/xitAction.types";

// test data
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";

// lets a test hold back price lookups, to finish calculations out of order
const priceGate = vi.hoisted(() => ({
	wait: undefined as Promise<void> | undefined,
}));
vi.mock("@/features/cx/usePrice", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/features/cx/usePrice")>();
	return {
		...actual,
		usePrice: (...args: Parameters<typeof actual.usePrice>) => {
			const price = actual.usePrice(...args);
			return {
				...price,
				getPrice: async (
					...a: Parameters<typeof price.getPrice>
				): Promise<number> => {
					if (priceGate.wait) await priceGate.wait;
					return price.getPrice(...a);
				},
			};
		},
	};
});

describe("useBurnXITAction", async () => {
	beforeAll(async () => {
		setActivePinia(createPinia());

		await materialsStore.setMany(materials);

		const { preload } = useMaterialData();

		await preload();
		// like the GetExchanges query: write, then reload the memory cache
		// @ts-expect-error mock data date as string
		await exchangesStore.setMany(exchanges);
		await useExchangeData().preload(true);
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
		const { materialTable } = useBurnXITAction({
			elements: ref(elements),
			resupplyDays: ref(resupplyDays),
			hideInfinite: ref(hideInfinite),
			materialOverrides: ref(materialOverrides),
			materialInactives: ref(materialInactives),
		});

		expect(materialTable.value.length).toBe(3);
		expect(materialTable.value[0].total).toBe(10);
		expect(materialTable.value[1].total).toBe(1);
		expect(materialTable.value[2].total).toBe(0);
	});

	it("never runs out without consumption, also at delta 0", () => {
		const { materialTable } = useBurnXITAction({
			elements: ref([
				{ ticker: "H2O", stock: 2340, delta: 0 },
				{ ticker: "HCP", stock: 0, delta: 0 },
				{ ticker: "FEO", stock: 10, delta: 1 },
				{ ticker: "ALO", stock: 20, delta: -2 },
			]),
			resupplyDays: ref(5),
			hideInfinite: ref(false),
			materialOverrides: ref({}),
			materialInactives: ref(new Set<string>()),
		});

		expect(materialTable.value.map((m) => m.burn)).toEqual([
			Infinity,
			Infinity,
			Infinity,
			10,
		]);
	});

	it("totalWeightVolume", async () => {
		const { totalWeightVolume } = useBurnXITAction({
			elements: ref(elements),
			resupplyDays: ref(resupplyDays),
			hideInfinite: ref(hideInfinite),
			materialOverrides: ref(materialOverrides),
			materialInactives: ref(materialInactives),
		});

		expect(totalWeightVolume.value.totalWeight).toBe(16.230000257492065);
		expect(totalWeightVolume.value.totalVolume).toBe(11);
	});

	it("fit", async () => {
		const days = ref(5);

		const { fit } = useBurnXITAction({
			elements: ref(elements),
			resupplyDays: days,
			hideInfinite: ref(hideInfinite),
			materialOverrides: ref(materialOverrides),
			materialInactives: ref(materialInactives),
		});

		days.value = fit(50, 50);
		expect(days.value).toBe(7);

		days.value = fit(500, 500);
		expect(days.value).toBe(39);

		days.value = 50;
		days.value = fit(50, 50);
		expect(days.value).toBe(7);
	});

	it("writes none of the refs it is given", async () => {
		const days = ref(5);
		const overrides = ref<Record<string, number | null>>({ ALO: 10 });
		const inactives = ref(new Set<string>(["FEO"]));
		const scope = effectScope();
		const { fit, materialTable } = scope.run(() =>
			useBurnXITAction({
				elements: ref(elements),
				resupplyDays: days,
				hideInfinite: ref(hideInfinite),
				materialOverrides: overrides,
				materialInactives: inactives,
			})
		)!;
		await flushPromises();

		expect(materialTable.value.length).toBe(3);
		expect(fit(50, 50)).toBe(7);
		expect(days.value).toBe(5);
		expect(overrides.value).toEqual({ ALO: 10 });
		expect([...inactives.value]).toEqual(["FEO"]);
		scope.stop();
	});

	it("stops updating totalPrice once its scope is stopped", async () => {
		const days = ref(5);
		const scope = effectScope();
		const { totalPrice } = scope.run(() =>
			useBurnXITAction({
				elements: ref([{ ticker: "RAT", stock: 0, delta: -10 }]),
				resupplyDays: days,
				hideInfinite: ref(true),
				materialOverrides: ref({}),
				materialInactives: ref(new Set<string>()),
			})
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

	it("leaves inactive materials out of totalPrice", async () => {
		const { getPrice } = usePrice(ref(undefined), ref(undefined));
		const unitPrice = await getPrice("RAT", "BUY");
		// OVE has a price, so leaving it in would change the total
		expect(await getPrice("OVE", "BUY")).toBeGreaterThan(0);

		const scope = effectScope();
		const { totalPrice } = scope.run(() =>
			useBurnXITAction({
				elements: ref([
					{ ticker: "RAT", stock: 0, delta: -10 },
					{ ticker: "OVE", stock: 0, delta: -10 },
				]),
				resupplyDays: ref(5),
				hideInfinite: ref(true),
				materialOverrides: ref({}),
				materialInactives: ref(new Set<string>(["OVE"])),
			})
		)!;

		// only RAT: 5 days × 10 RAT = 50 RAT
		await vi.waitFor(() => expect(totalPrice.value).toBe(unitPrice * 50));
		scope.stop();
	});

	it("keeps the latest totalPrice when an older run finishes last", async () => {
		const unitPrice = await usePrice(
			ref(undefined),
			ref(undefined)
		).getPrice("RAT", "BUY");
		expect(unitPrice).toBeGreaterThan(0);

		// the run for 5 days waits for its price
		let release: () => void = () => {};
		priceGate.wait = new Promise<void>((resolve) => {
			release = resolve;
		});
		const days = ref(5);
		const scope = effectScope();
		const { totalPrice } = scope.run(() =>
			useBurnXITAction({
				elements: ref([{ ticker: "RAT", stock: 0, delta: -10 }]),
				resupplyDays: days,
				hideInfinite: ref(true),
				materialOverrides: ref({}),
				materialInactives: ref(new Set<string>()),
			})
		)!;
		await flushPromises();

		// the run for 10 days finishes first: 10 days × 10 RAT = 100 RAT
		priceGate.wait = undefined;
		days.value = 10;
		await vi.waitFor(() => expect(totalPrice.value).toBe(unitPrice * 100));

		// the stale 5 day run (50 RAT) finishes last and must not win
		release();
		await flushPromises();
		expect(totalPrice.value).toBe(unitPrice * 100);

		scope.stop();
	});
});
