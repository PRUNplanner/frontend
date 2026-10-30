import { effectScope, ref } from "vue";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

// Stores
import { usePlanningStore } from "@/stores/planningStore";
import { useUserStore } from "@/stores/userStore";

// Composables
import { useFIORepair } from "@/features/fio_repair/useFIORepair";

// Schemas
import { FIOStorageSchema } from "@/features/api/schemas/gameData.schemas";

// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

// test data
import fio_storage from "@/tests/test_data/api_data_fio_storage.json";
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import cx_list from "@/tests/test_data/api_data_cx_list.json";
import empire_list from "@/tests/test_data/api_data_empire_list.json";
import {
	etherwindPlan,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";
import { golden } from "@/tests/golden";

// Etherwind (KW-688c) is the only planet loaded, as the FIO base there
vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);
	return {
		usePlanetData: vi.fn(() => ({
			getPlanet: vi.fn(async (id: string) => {
				if (id === planet_etherwind.planet_natural_id)
					return planet_etherwind;
				throw new Error(`Planet ${id} not available.`);
			}),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});

/**
 * Golden: every FIO base's repair status (targets from the matched
 * Etherwind plan's best days, bills, waiting cost) and a few repair
 * flights, from the FIO storage fixture and the real engine.
 */

const storage = FIOStorageSchema.parse(fio_storage);
const NOW = storage.last_modified.getTime();

// the Etherwind base, its plan in the OUTSIDEREGION empire
const plans: Plan[] = [etherwindPlan()];
const empires = (empire_list as unknown as PlanEmpireElement[]).filter(
	(e) => e.uuid === "a208d74e-d07f-4722-8192-9b55d4140f58"
);

// the one place that calls the composable
async function runRepair(usePlans: boolean) {
	const scope = effectScope();
	const repair = scope.run(() =>
		useFIORepair(ref(plans), ref(empires), ref(usePlans))
	)!;
	await repair.load();
	await flushPromises();
	return { ...repair, scope };
}

async function snapshot(usePlans: boolean) {
	const { bases, flight, scope } = await runRepair(usePlans);
	try {
		return {
			bases: bases.value,
			flights: bases.value.slice(0, 3).flatMap((base) =>
				[0, 30].flatMap((arrival) =>
					[false, true].map((useStore) => ({
						planet: base.planet,
						arrival,
						useStore,
						...flight(base, arrival, useStore),
					}))
				)
			),
		};
	} finally {
		scope.stop();
	}
}

describe("useFIORepair (golden)", () => {
	beforeEach(async () => {
		vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
		await setupPlanningTestData();
		const planningStore = usePlanningStore();
		planningStore.fio_sites_planets = structuredClone(storage.sites_data);
		planningStore.fio_storage_planets = structuredClone(
			storage.storage_data.planets
		);
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.mocked(console.error).mockRestore();
	});

	it("targets from the matched plan, Universe prices", async () => {
		const result = await snapshot(true);
		const etherwind = result.bases.find((b) => b.planet === "KW-688c")!;
		expect(etherwind.match.candidate?.plan.uuid).toBe(plans[0].uuid);

		await expect(golden(result)).toMatchFileSnapshot(
			"./__snapshots__/useFIORepair.golden.json"
		);
	});

	it("the interval only, with the default Exchange Preference", async () => {
		// CX Norwick Scheme: AI1 7D and empire ticker rules
		usePlanningStore().setCXs(cx_list as unknown as CX[]);
		useUserStore().preferences.defaultCXUuid = cx_list[2].uuid;

		await expect(golden(await snapshot(false))).toMatchFileSnapshot(
			"./__snapshots__/useFIORepair.cx.golden.json"
		);
	});
});
