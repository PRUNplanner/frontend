import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick, ref, type Slots } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import EmpireView from "@/views/EmpireView.vue";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
import ComputingProgress from "@/layout/components/ComputingProgress.vue";
import { mountComponent } from "@/tests/mountComponent";
import { usePlanningStore } from "@/stores/planningStore";

// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { Plan } from "@/features/api/schemas/planningData.schemas";

// test data
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
const { stub, passThrough, patches, profits } = vi.hoisted(() => ({
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
	patches: [] as unknown[],
	profits: [] as unknown[][],
}));

// the loaders fetch data, here they only hand through their slot
vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader")
);
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	passThrough("WrapperGameDataLoader")
);
vi.mock("@/features/preferences/usePreferences", () => ({
	usePreferences: () => ({ defaultEmpireUuid: ref(undefined) }),
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
// records what the view stores
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params: unknown) => ({
		execute: async () => {
			if (name === "PatchEmpireState") patches.push(params);
		},
	}),
}));
vi.mock("@/features/empire/useEmpireProfits", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("@/features/empire/useEmpireProfits")
		>();
	return {
		useEmpireProfits: () => {
			const real = actual.useEmpireProfits();
			return {
				...real,
				setProfits: (...args: Parameters<typeof real.setProfits>) => {
					profits.push(args);
					real.setProfits(...args);
				},
			};
		},
	};
});
vi.mock("@/features/empire/components/EmpireMaterialIOFiltered.vue", () =>
	stub("EmpireMaterialIOFiltered", [
		"content",
		"empireMaterialIO",
		"cxUuid",
		"planListData",
	])
);
vi.mock("@/features/empire/components/EmpireCostOverview.vue", () =>
	stub("EmpireCostOverview", ["costOverview", "shippingDemand", "split"])
);
vi.mock("@/features/empire/components/EmpirePlanList.vue", () =>
	stub("EmpirePlanList", ["planListData"])
);
vi.mock("@/features/empire/components/EmpireConfiguration.vue", () =>
	stub("EmpireConfiguration")
);
vi.mock("@/features/empire/components/EmpireEmpty.vue", () =>
	stub("EmpireEmpty")
);
vi.mock("@/features/empire/components/EmpireOnboarding.vue", () =>
	stub("EmpireOnboarding")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));
vi.mock("@/ui/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("vue-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("vue-router")>()),
	useRouter: () => ({ replace: vi.fn() }),
}));

/**
 * Golden: what the empire page hands its children (plan list, cost
 * overview, material I/O) and stores (profits, empire state), from real
 * plan results.
 */

const PLANS: Plan[] = [
	etherwindPlan(),
	{
		...smallPlan(),
		uuid: "8b0e6b1c-0000-4000-8000-000000000002",
		plan_name: "Small",
	},
	{
		...etherwindPlan(),
		uuid: "8b0e6b1c-0000-4000-8000-000000000003",
		plan_name: "Food COGC",
		planet_natural_id: "ZV-307b",
		plan_cogc: "FOOD_INDUSTRIES",
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
	usePlanningStore().setCXs(cx_list as unknown as CX[]);

	const { wrapper } = await mountComponent(
		EmpireView,
		{ empireUuid: input.empireUuid },
		{ pinia }
	);
	await vi.waitFor(() =>
		expect(wrapper.findComponent(WrapperPlanningDataLoader).exists()).toBe(
			true
		)
	);
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

// the empire state without its timestamp
function stripTimestamp(patch: unknown) {
	const p = structuredClone(patch) as {
		empireState: { metadata: { timestamp?: string } };
	};
	delete p.empireState.metadata.timestamp;
	return p;
}

async function snapshot(input: ICase) {
	patches.length = 0;
	profits.length = 0;
	const wrapper = await mountView(input);
	await vi.waitFor(() => {
		expect(wrapper.findComponent({ name: "EmpirePlanList" }).exists()).toBe(
			true
		);
		expect(
			wrapper.findComponent({ name: "EmpireCostOverview" }).exists()
		).toBe(true);
		expect(patches).toHaveLength(1);
	});
	const io = wrapper.findComponent({ name: "EmpireMaterialIOFiltered" });
	const cost = wrapper.findComponent({ name: "EmpireCostOverview" });
	return {
		planList: wrapper
			.findComponent({ name: "EmpirePlanList" })
			.props("planListData"),
		costOverview: cost.props(),
		materialIO: {
			cxUuid: io.props("cxUuid"),
			empireMaterialIO: io.props("empireMaterialIO"),
		},
		setProfits: [...profits],
		patchEmpireState: patches.map(stripTimestamp),
	};
}

describe("EmpireView (golden)", () => {
	beforeEach(async () => {
		await setupPlanningTestData();
	});

	it("plan list, cost overview, material I/O and stored state", async () => {
		const result = {
			// meow: no faction, Universe prices
			plain: await snapshot({
				empireUuid: "8804b0e1-73d8-48f7-93e3-48bb2ef7b727",
			}),
			// meow with PRUN CX REAL
			cx: await snapshot({
				empireUuid: "8804b0e1-73d8-48f7-93e3-48bb2ef7b727",
				cxUuid: cx_list[0].uuid,
			}),
			// Share: OUTSIDEREGION, faction bonus on resource extraction
			empire: await snapshot({
				empireUuid: "a208d74e-d07f-4722-8192-9b55d4140f58",
			}),
		};

		await expect(golden(result)).toMatchFileSnapshot(
			"./__snapshots__/EmpireView.golden.json"
		);
	});
});
