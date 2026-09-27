import {
	describe,
	it,
	expect,
	beforeAll,
	beforeEach,
	afterEach,
	vi,
} from "vitest";
import { h } from "vue";
import {
	flushPromises,
	RouterLinkStub,
	type VueWrapper,
} from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { useUserStore } from "@/stores/userStore";
import { usePlanningStore } from "@/stores/planningStore";
import { preferenceDefaults } from "@/features/preferences/userDefaults";
import UserPreferences from "@/features/profile/components/UserPreferences.vue";
import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";
import PSelect from "@/ui/components/PSelect.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

// test data
import empireList from "@/tests/test_data/api_data_empire_list.json";
import plan_etherwind from "@/tests/test_data/api_data_plan_etherwind.json";

// the selector reads CX data, its own wiring isn't under test here
vi.mock("@/features/exchanges/components/CXPreferenceSelector.vue", () => ({
	default: {
		name: "CXPreferenceSelector",
		props: { cxUuid: String, addUndefinedCX: Boolean },
		render: () => h("div"),
	},
}));

const mock = new AxiosMockAdapter(apiService.client);
const PREFERENCES_URL = /user\/preferences\/$/;

const [FIRST_EMPIRE, SECOND_EMPIRE] = empireList;
const PLAN = plan_etherwind as unknown as Plan;
const OTHER_PLAN = {
	...PLAN,
	uuid: "00000002-0000-4000-8000-000000000000",
	plan_name: "Other Plan",
	planet_natural_id: "OT-580b",
} as Plan;
const DELETED_PLAN = "00000003-0000-4000-8000-000000000000";

let pinia: Pinia;

function seed(
	options: { empires?: boolean; plans?: Plan[] } = {}
): ReturnType<typeof useUserStore> {
	const planningStore = usePlanningStore();
	planningStore.setEmpires(
		options.empires === false
			? []
			: (empireList as unknown as PlanEmpireElement[])
	);
	planningStore.setPlans(options.plans ?? [PLAN, OTHER_PLAN]);
	return useUserStore();
}

const mountPreferences = () => mountComponent(UserPreferences, {}, { pinia });

/** locale, default empire, XIT origin */
const selects = (wrapper: VueWrapper) => wrapper.findAllComponents(PSelect);
/** red, yellow, resupply */
const numberInputs = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(PInputNumber);
const checkbox = (wrapper: VueWrapper) =>
	wrapper.find<HTMLInputElement>("input[type=checkbox]");
const planRows = (wrapper: VueWrapper) =>
	wrapper
		.findAll(".ptable tbody tr")
		.map((tr) => tr.findAll("td").map((td) => td.text()));

describe("UserPreferences", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		mock.reset();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("shows the default preferences", async () => {
		seed();
		const { wrapper } = await mountPreferences();

		expect(selects(wrapper).map((s) => s.props("value"))).toEqual([
			"en_US",
			// no default empire yet, so the first one is picked
			FIRST_EMPIRE.uuid,
			"Configure on Execution",
		]);
		expect(numberInputs(wrapper).map((n) => n.props("value"))).toEqual([
			5, 10, 20,
		]);
		expect(checkbox(wrapper).element.checked).toBe(true);
		expect(
			wrapper.findComponent(CXPreferenceSelector).props()
		).toMatchObject({ cxUuid: undefined, addUndefinedCX: false });
		// the defaults themselves stay untouched
		expect(preferenceDefaults.defaultEmpireUuid).toBeUndefined();
	});

	it("shows stored preferences", async () => {
		const userStore = seed();
		userStore.preferences.defaultEmpireUuid = SECOND_EMPIRE.uuid;
		userStore.preferences.defaultCXUuid = "cx-uuid";
		userStore.preferences.burnDaysRed = 3;
		userStore.preferences.burnDaysYellow = 7;
		userStore.preferences.burnResupplyDays = 30;
		userStore.preferences.burnOrigin = "Moria Station Warehouse";
		userStore.preferences.defaultBuyItemsFromCX = false;
		const { wrapper } = await mountPreferences();

		expect(selects(wrapper).map((s) => s.props("value"))).toEqual([
			"en_US",
			SECOND_EMPIRE.uuid,
			"Moria Station Warehouse",
		]);
		expect(numberInputs(wrapper).map((n) => n.props("value"))).toEqual([
			3, 7, 30,
		]);
		expect(checkbox(wrapper).element.checked).toBe(false);
		expect(
			wrapper.findComponent(CXPreferenceSelector).props("cxUuid")
		).toBe("cx-uuid");
	});

	it("offers the languages and the XIT station warehouses", async () => {
		seed();
		const { wrapper } = await mountPreferences();

		expect(
			selects(wrapper)
				.at(0)!
				.props("options")
				.map((o) => o.value)
		).toEqual(expect.arrayContaining(["en_US", "de_DE"]));
		const origins = selects(wrapper).at(2)!.props("options");
		// "Configure on Execution" plus 6 stations
		expect(origins).toHaveLength(7);
		expect(origins.at(0)!.value).toBe("Configure on Execution");
		expect(origins.at(6)).toEqual({
			label: "Moria Station",
			value: "Moria Station Warehouse",
		});
	});

	it("offers the empires by name", async () => {
		seed();
		const { wrapper } = await mountPreferences();

		const options = selects(wrapper).at(1)!.props("options");
		expect(options).toHaveLength(7);
		expect(options.at(0)).toEqual({
			label: "PRUN REAL",
			value: FIRST_EMPIRE.uuid,
		});
		expect(options.at(1)).toEqual({
			label: "RFab Plan",
			value: SECOND_EMPIRE.uuid,
		});
	});

	it("replaces a default empire that no longer exists with the first one", async () => {
		const userStore = seed();
		userStore.preferences.defaultEmpireUuid =
			"00000009-0000-4000-8000-000000000000";
		await mountPreferences();

		expect(userStore.preferences.defaultEmpireUuid).toBe(FIRST_EMPIRE.uuid);
	});

	it("keeps a default empire that still exists", async () => {
		const userStore = seed();
		userStore.preferences.defaultEmpireUuid = SECOND_EMPIRE.uuid;
		await mountPreferences();

		expect(userStore.preferences.defaultEmpireUuid).toBe(
			SECOND_EMPIRE.uuid
		);
	});

	it("clears the default empire without any empires", async () => {
		const userStore = seed({ empires: false });
		userStore.preferences.defaultEmpireUuid = SECOND_EMPIRE.uuid;
		const { wrapper } = await mountPreferences();

		expect(userStore.preferences.defaultEmpireUuid).toBeUndefined();
		expect(selects(wrapper).at(1)!.props("options")).toEqual([]);
	});

	it("drops plan preferences of deleted plans on mount", async () => {
		const userStore = seed();
		userStore.preferences.planOverrides = {
			[PLAN.uuid!]: { autoOptimizeHabs: true },
			[DELETED_PLAN]: { autoOptimizeHabs: true },
		};
		await mountPreferences();

		expect(Object.keys(userStore.preferences.planOverrides)).toEqual([
			PLAN.uuid,
		]);
	});

	it("lists plans with non-default preferences and links them", async () => {
		const userStore = seed();
		userStore.preferences.planOverrides = {
			[PLAN.uuid!]: {
				includeCM: true,
				visitationMaterialExclusions: ["RAT"],
				autoOptimizeHabs: true,
			},
			// all at their defaults, so not listed
			[OTHER_PLAN.uuid!]: {
				includeCM: false,
				visitationMaterialExclusions: [],
				autoOptimizeHabs: false,
			},
		};
		const { wrapper } = await mountPreferences();

		expect(planRows(wrapper)).toEqual([
			[
				"EW COF RAT DW C",
				"Include CM, Visitation Material Exclusions, Auto-Optimize Inactive",
			],
		]);
		expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe(
			`/plan/KW-688c/${PLAN.uuid}`
		);
	});

	it("shows an empty plan table without plan preferences", async () => {
		seed();
		const { wrapper } = await mountPreferences();

		expect(planRows(wrapper)).toEqual([]);
		expect(wrapper.text()).toContain("profile.preferences.form.plan");
	});

	it("switches the language", async () => {
		const userStore = seed();
		const setLocale = vi
			.spyOn(userStore, "setLocale")
			.mockResolvedValue(undefined);
		const { wrapper } = await mountPreferences();

		selects(wrapper).at(0)!.vm.$emit("update:value", "de_DE");
		await flushPromises();

		expect(userStore.preferences.locale).toBe("de_DE");
		expect(setLocale).toHaveBeenCalledWith("de_DE", expect.anything());
	});

	it("sets the default empire and XIT origin", async () => {
		const userStore = seed();
		const { wrapper } = await mountPreferences();

		selects(wrapper).at(1)!.vm.$emit("update:value", SECOND_EMPIRE.uuid);
		selects(wrapper)
			.at(2)!
			.vm.$emit("update:value", "Benten Station Warehouse");
		await flushPromises();

		expect(userStore.preferences.defaultEmpireUuid).toBe(
			SECOND_EMPIRE.uuid
		);
		expect(userStore.preferences.burnOrigin).toBe(
			"Benten Station Warehouse"
		);
	});

	it("sets the burn thresholds", async () => {
		const userStore = seed();
		const { wrapper } = await mountPreferences();
		const inputs = wrapper.findAll("input[inputmode=numeric]");

		await inputs.at(0)!.setValue("3");
		await inputs.at(1)!.setValue("8");
		await inputs.at(2)!.setValue("25");
		await flushPromises();

		expect(userStore.preferences.burnDaysRed).toBe(3);
		expect(userStore.preferences.burnDaysYellow).toBe(8);
		expect(userStore.preferences.burnResupplyDays).toBe(25);
	});

	it("keeps every burn threshold at 1 day or more", async () => {
		const userStore = seed();
		const { wrapper } = await mountPreferences();
		const inputs = wrapper.findAll("input[inputmode=numeric]");

		for (const input of inputs) await input.setValue("0");
		await flushPromises();

		// 0 is below the minimum of 1
		expect(userStore.preferences.burnDaysRed).toBe(1);
		expect(userStore.preferences.burnDaysYellow).toBe(1);
		expect(userStore.preferences.burnResupplyDays).toBe(1);
	});

	it("steps the burn thresholds with the +/- buttons", async () => {
		const userStore = seed();
		userStore.preferences.burnDaysYellow = 1;
		const { wrapper } = await mountPreferences();
		// minus, plus for each of the 3 inputs
		const steppers = wrapper.findAll(".ph-no-capture");
		expect(steppers).toHaveLength(6);

		await steppers.at(0)!.trigger("click");
		await steppers.at(2)!.trigger("click");
		await steppers.at(5)!.trigger("click");

		// red 5 - 1 = 4, resupply 20 + 1 = 21
		expect(userStore.preferences.burnDaysRed).toBe(4);
		expect(userStore.preferences.burnResupplyDays).toBe(21);
		// yellow 1 - 1 = 0 is below the minimum of 1
		expect(userStore.preferences.burnDaysYellow).toBe(1);
	});

	it("toggles buying from the CX", async () => {
		const userStore = seed();
		const { wrapper } = await mountPreferences();

		await checkbox(wrapper).setValue(false);

		expect(userStore.preferences.defaultBuyItemsFromCX).toBe(false);
	});

	it("saves changes to the backend 5 seconds after the last one", async () => {
		const userStore = seed();
		userStore.accessToken = "test-access-token";
		userStore.refreshToken = "test-refresh-token";
		mock.onPatch(PREFERENCES_URL).reply((config) => [200, config.data]);
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		// the debounce lives in the usePreferences module, a fresh copy keeps
		// timers left over by earlier tests out
		vi.resetModules();
		const { default: FreshPreferences } =
			await import("@/features/profile/components/UserPreferences.vue");
		const { wrapper } = await mountComponent(
			FreshPreferences,
			{},
			{ pinia }
		);
		const inputs = wrapper.findAll("input[inputmode=numeric]");

		await inputs.at(0)!.setValue("3");
		await flushPromises();
		vi.advanceTimersByTime(4999);
		await inputs.at(1)!.setValue("8");
		await flushPromises();
		// the second change restarts the wait
		vi.advanceTimersByTime(4999);
		expect(mock.history.patch).toHaveLength(0);

		vi.advanceTimersByTime(1);
		await vi.waitFor(() => expect(mock.history.patch).toHaveLength(1));
		expect(JSON.parse(mock.history.patch.at(0)!.data)).toMatchObject({
			burnDaysRed: 3,
			burnDaysYellow: 8,
			defaultEmpireUuid: FIRST_EMPIRE.uuid,
		});
	});
});
