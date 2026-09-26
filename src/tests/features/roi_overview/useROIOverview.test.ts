import { ref, Ref, watch } from "vue";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises } from "@vue/test-utils";

// stores
import {
	materialsStore,
	recipesStore,
	buildingsStore,
	exchangesStore,
} from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { useBuildingData } from "@/database/services/useBuildingData";

// test data
import recipes from "@/tests/test_data/api_data_recipes.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import plan_etherwind from "@/tests/test_data/api_data_plan_etherwind.json";
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import { useROIOverview } from "@/features/roi_overview/useROIOverview";

vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);

	return {
		usePlanetData: vi.fn(() => ({
			getPlanet: vi.fn().mockResolvedValue(planet_etherwind),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});

// record every plan calculation the ROI overview creates
const planCalculations = vi.hoisted(() => [] as { refreshKey: Ref<number> }[]);

vi.mock("@/features/planning/usePlanCalculation", async () => {
	const actual: any = await vi.importActual(
		"@/features/planning/usePlanCalculation"
	);

	return {
		...actual,
		usePlanCalculation: (...args: unknown[]) => {
			const calculation = actual.usePlanCalculation(...args);
			planCalculations.push(calculation);
			return calculation;
		},
	};
});

import { optimalProduction } from "@/features/roi_overview/assets/optimalProduction";

describe("useROIOverview", async () => {
	const definition = ref(plan_etherwind);
	const tnp = optimalProduction.find((e) => e.ticker === "TNP")!;

	beforeAll(async () => {
		setActivePinia(createPinia());

		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);
		await materialsStore.setMany(materials);
		// @ts-expect-error mock data date as string
		await exchangesStore.setMany(exchanges);

		const { preload } = useMaterialData();
		const { preloadBuildings, preloadRecipes } = useBuildingData();

		await preload();
		await preloadBuildings();
		await preloadRecipes();
		await flushPromises();
	});

	it("calculateItem", async () => {
		const { calculateItem } = useROIOverview(
			// @ts-expect-error mock definition
			definition,
			ref(undefined)
		);

		const result = await calculateItem(tnp);

		expect(result.length).toBe(3);
	});

	it("calculates through the engine, no live plan calculations", async () => {
		planCalculations.length = 0;

		const { calculateItem } = useROIOverview(
			// @ts-expect-error mock definition
			definition,
			ref(undefined)
		);

		expect((await calculateItem(tnp)).length).toBe(3);
		expect(planCalculations.length).toBe(0);
	});

	// full recipe sweep, slow under parallel load with coverage
	it("calculate", { timeout: 20_000 }, async () => {
		const { calculate, resultData } = useROIOverview(
			// @ts-expect-error mock definition
			definition,
			ref(undefined)
		);

		await calculate();

		expect(resultData.value.length).toBe(370);
	});

	// e.g. the CX changes while the first sweep still runs
	it("drops a calculation a newer one took over", { timeout: 40_000 }, async () => {
		const { calculate, resultData, progressCurrent, progressTotal } =
			useROIOverview(
				// @ts-expect-error mock definition
				definition,
				ref(undefined)
			);

		const first = calculate();
		await new Promise((r) => setTimeout(r, 0));
		const second = await calculate();

		expect(await first).toBeUndefined();
		expect(second).toHaveLength(370);
		expect(resultData.value).toHaveLength(370);
		// the dropped run stops counting progress
		expect(progressCurrent.value).toBe(progressTotal.value);
	});

	it("drops a run superseded in its last step", { timeout: 60_000 }, async () => {
		const { calculate, progressCurrent, progressTotal } =
			useROIOverview(
				// @ts-expect-error mock definition
				definition,
				ref(undefined)
			);

		// start the next run once the first one counted its last building
		let second: ReturnType<typeof calculate> | undefined;
		watch(
			progressCurrent,
			(v) => {
				if (v === progressTotal.value && !second) second = calculate();
			},
			{ flush: "sync" }
		);

		expect(await calculate()).toBeUndefined();
		expect(await second).toHaveLength(370);
	});

	it("formatOptimal", async () => {
		const { formatOptimal } = useROIOverview(
			// @ts-expect-error mock definition
			definition,
			ref(undefined)
		);

		expect(formatOptimal(optimalProduction[0])).toBe(
			"35x RIG, 11x HB1, 1x STO"
		);
		expect(formatOptimal(optimalProduction[1])).toBe(
			"11x TNP, 9x HB3, 1x STO"
		);
	});
});
