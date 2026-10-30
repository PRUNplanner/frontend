import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick, ref, type Slots } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import FIOBurnView from "@/views/fio/FIOBurnView.vue";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
import ComputingProgress from "@/layout/components/ComputingProgress.vue";
import { mountComponent } from "@/tests/mountComponent";
import { useUserStore } from "@/stores/userStore";
import { usePlanningStore } from "@/stores/planningStore";

// Schemas
import { FIOStorageSchema } from "@/features/api/schemas/gameData.schemas";

// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { Plan } from "@/features/api/schemas/planningData.schemas";

// test data
import fio_storage from "@/tests/test_data/api_data_fio_storage.json";
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import empire_list from "@/tests/test_data/api_data_empire_list.json";
import cx_list from "@/tests/test_data/api_data_cx_list.json";
import {
	etherwindPlan,
	setupPlanningTestData,
	smallPlan,
} from "@/tests/features/planning/usePlanCalculation.fixtures";
import { golden } from "@/tests/golden";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers. __esModule lets
// defineAsyncComponent pick the default export of a mocked module
const { stub, passThrough, preferences } = vi.hoisted(() => ({
	stub: (name: string, props: string[] = []) => ({
		__esModule: true,
		default: { name, props, render: () => null },
	}),
	passThrough: (name: string) => ({
		__esModule: true,
		default: {
			name,
			setup:
				(_: unknown, { slots }: { slots: Slots }) =>
				() =>
					slots.default?.({ empirePlanetList: [] }),
		},
	}),
	preferences: { empireUuid: "" },
}));

// the loaders fetch data, here they only hand through their slot
vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader")
);
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	passThrough("WrapperGameDataLoader")
);
vi.mock("@/features/preferences/usePreferences", () => ({
	usePreferences: () => ({
		defaultEmpireUuid: ref(preferences.empireUuid),
		burnDaysRed: ref(3),
		burnDaysYellow: ref(7),
	}),
}));
// every planet is Etherwind under its own id
vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);
	return {
		usePlanetData: vi.fn(() => ({
			getPlanet: vi.fn(async (id: string) => ({
				...planet_etherwind,
				planet_natural_id: id,
			})),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});
vi.mock("@/features/fio/components/FIOBurnPlanTable.vue", () =>
	stub("FIOBurnPlanTable", ["planTable"])
);
vi.mock("@/features/fio/components/FIOBurnTable.vue", () =>
	stub("FIOBurnTable", ["burnTable"])
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));

/**
 * Golden: the burn tables FIO Burn hands its children, from real plan
 * results and the FIO storage fixture.
 */

const storage = FIOStorageSchema.parse(fio_storage);

// Etherwind and a small one on its FIO base, one on a base with other
// stock, one on a planet without storage
const PLANS: Plan[] = [
	etherwindPlan(),
	{
		...smallPlan(),
		uuid: "8b0e6b1c-0000-4000-8000-000000000002",
		plan_name: "Small",
	},
	{
		...smallPlan(),
		uuid: "8b0e6b1c-0000-4000-8000-000000000003",
		plan_name: "Bober",
		planet_natural_id: "ZV-307b",
	},
	{
		...etherwindPlan(),
		uuid: "8b0e6b1c-0000-4000-8000-000000000004",
		plan_name: "Nowhere",
		planet_natural_id: "XX-000a",
	},
];

interface ICase {
	empireUuid: string;
	cxUuid?: string;
}

// the one place that mounts the view: the loaders hand over the data
async function mountView(input: ICase): Promise<VueWrapper> {
	const pinia = createPinia();
	setActivePinia(pinia);
	// @ts-expect-error partial profile
	useUserStore().profile = { fio_apikey: "key", prun_username: "user" };
	const planningStore = usePlanningStore();
	planningStore.setCXs(cx_list as unknown as CX[]);
	planningStore.fio_storage_planets = structuredClone(
		storage.storage_data.planets
	);
	preferences.empireUuid = input.empireUuid;

	const { wrapper } = await mountComponent(FIOBurnView, {}, { pinia });
	const loader = wrapper.findComponent(WrapperPlanningDataLoader);
	loader.vm.$emit("data:empire:list", structuredClone(empire_list));
	loader.vm.$emit("data:empire:plans", structuredClone(PLANS));
	loader.vm.$emit("update:cx-uuid", input.cxUuid);
	await nextTick();

	await vi.waitFor(() =>
		expect(wrapper.findComponent(WrapperGameDataLoader).exists()).toBe(true)
	);
	wrapper.findComponent(WrapperGameDataLoader).vm.$emit("complete");
	await vi.waitFor(() =>
		expect(wrapper.findComponent(ComputingProgress).exists()).toBe(false)
	);
	await flushPromises();
	return wrapper;
}

async function snapshot(input: ICase) {
	const wrapper = await mountView(input);
	await vi.waitFor(() =>
		expect(wrapper.findComponent({ name: "FIOBurnTable" }).exists()).toBe(
			true
		)
	);
	return {
		burnTable: wrapper
			.findComponent({ name: "FIOBurnTable" })
			.props("burnTable"),
		planTable: wrapper
			.findComponent({ name: "FIOBurnPlanTable" })
			.props("planTable"),
	};
}

describe("FIOBurnView (golden)", () => {
	beforeEach(async () => {
		await setupPlanningTestData();
	});

	it("burn and plan table: no faction, OUTSIDEREGION with a CX", async () => {
		const result = {
			// meow: no faction
			plain: await snapshot({
				empireUuid: "8804b0e1-73d8-48f7-93e3-48bb2ef7b727",
			}),
			// Share: OUTSIDEREGION, PRUN CX REAL
			empire_cx: await snapshot({
				empireUuid: "a208d74e-d07f-4722-8192-9b55d4140f58",
				cxUuid: cx_list[0].uuid,
			}),
		};

		await expect(golden(result)).toMatchFileSnapshot(
			"./__snapshots__/FIOBurnView.golden.json"
		);
	});
});
