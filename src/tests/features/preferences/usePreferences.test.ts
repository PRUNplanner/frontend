import { describe, it, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Stores
import { useUserStore } from "@/stores/userStore";
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { usePreferences } from "@/features/preferences/usePreferences";

import { preferenceDefaults } from "@/features/preferences/userDefaults";

describe("usePreferences", async () => {
	let userStore: any;
	let planningStore: any;

	beforeEach(() => {
		setActivePinia(createPinia());
		userStore = useUserStore();
		planningStore = usePlanningStore();
	});

	describe("defaultEmpireUuid", async () => {
		it("get", async () => {
			const { defaultEmpireUuid } = usePreferences();
			expect(defaultEmpireUuid.value).toBe(
				preferenceDefaults.defaultEmpireUuid
			);
		});

		it("set", async () => {
			const { defaultEmpireUuid } = usePreferences();
			defaultEmpireUuid.value = "test";
			expect(defaultEmpireUuid.value).toBe("test");
		});
	});

	describe("defaultCXUuid", async () => {
		it("get", async () => {
			const { defaultCXUuid } = usePreferences();
			expect(defaultCXUuid.value).toBe(preferenceDefaults.defaultCXUuid);
		});

		it("set", async () => {
			const { defaultCXUuid } = usePreferences();
			defaultCXUuid.value = "test";
			expect(defaultCXUuid.value).toBe("test");
		});
	});

	describe("burnOrigin", async () => {
		it("get", async () => {
			const { burnOrigin } = usePreferences();
			expect(burnOrigin.value).toBe(preferenceDefaults.burnOrigin);
		});

		it("set", async () => {
			const { burnOrigin } = usePreferences();
			burnOrigin.value = "test";
			expect(burnOrigin.value).toBe("test");
		});
	});

	describe("burnResupplyDays", async () => {
		it("get", async () => {
			const { burnResupplyDays } = usePreferences();
			expect(burnResupplyDays.value).toBe(
				preferenceDefaults.burnResupplyDays
			);
		});

		it("set", async () => {
			const { burnResupplyDays } = usePreferences();
			burnResupplyDays.value = 1;
			expect(burnResupplyDays.value).toBe(1);
		});
	});

	describe("burnDefaultMode", async () => {
		it("get", async () => {
			const { burnDefaultMode } = usePreferences();
			expect(burnDefaultMode.value).toBe(
				preferenceDefaults.burnDefaultMode
			);
		});

		it("set", async () => {
			const { burnDefaultMode } = usePreferences();
			burnDefaultMode.value = "solver";
			expect(burnDefaultMode.value).toBe("solver");
		});
	});

	describe("burnFullCoverThreshold", async () => {
		it("get", async () => {
			const { burnFullCoverThreshold } = usePreferences();
			expect(burnFullCoverThreshold.value).toBe(
				preferenceDefaults.burnFullCoverThreshold
			);
		});

		it("set", async () => {
			const { burnFullCoverThreshold } = usePreferences();
			burnFullCoverThreshold.value = 2.5;
			expect(burnFullCoverThreshold.value).toBe(2.5);
		});
	});

	describe("defaultBuyItemsFromCX", async () => {
		it("get", async () => {
			const { defaultBuyItemsFromCX } = usePreferences();
			expect(defaultBuyItemsFromCX.value).toBe(
				preferenceDefaults.defaultBuyItemsFromCX
			);
		});

		it("set", async () => {
			const { defaultBuyItemsFromCX } = usePreferences();
			defaultBuyItemsFromCX.value = true;
			expect(defaultBuyItemsFromCX.value).toBe(true);
		});
	});

	describe("burnDaysRed", async () => {
		it("get", async () => {
			const { burnDaysRed } = usePreferences();
			expect(burnDaysRed.value).toBe(preferenceDefaults.burnDaysRed);
		});

		it("set", async () => {
			const { burnDaysRed } = usePreferences();
			burnDaysRed.value = 55;
			expect(burnDaysRed.value).toBe(55);
		});
	});

	describe("burnDaysYellow", async () => {
		it("get", async () => {
			const { burnDaysYellow } = usePreferences();
			expect(burnDaysYellow.value).toBe(
				preferenceDefaults.burnDaysYellow
			);
		});

		it("set", async () => {
			const { burnDaysYellow } = usePreferences();
			burnDaysYellow.value = 55;
			expect(burnDaysYellow.value).toBe(55);
		});
	});

	describe("layoutNavigationStyle", async () => {
		it("get", async () => {
			const { layoutNavigationStyle } = usePreferences();
			expect(layoutNavigationStyle.value).toBe(
				preferenceDefaults.layoutNavigationStyle
			);
		});

		it("set", async () => {
			const { layoutNavigationStyle } = usePreferences();
			layoutNavigationStyle.value = "collapsed";
			expect(layoutNavigationStyle.value).toBe("collapsed");
		});
	});

	it("planSettings", async () => {
		const { planSettings } = usePreferences();

		expect(planSettings.value).toStrictEqual({});
	});

	describe("planSettingsOverview", async () => {
		it("plan data not loaded, empty return", async () => {
			// prepare some preference data
			userStore.setPlanPreference("foo", { includeCM: true });

			const { planSettings, planSettingsOverview } = usePreferences();

			expect(Object.keys(planSettings.value).length).toBe(1);
			expect(planSettingsOverview.value.length).toBe(0);
		});

		it("valid settings", async () => {
			// prepare some preference data
			userStore.setPlanPreference("foo", { includeCM: true });
			userStore.setPlanPreference("moo", {
				visitationMaterialExclusions: ["RAT", "DW"],
			});
			userStore.setPlanPreference("moo", { autoOptimizeHabs: false });

			// prepare plan data to get name and it
			planningStore.plans["foo"] = {
				planet_id: "1",
				name: "2",
			};
			planningStore.plans["moo"] = {
				planet_id: "3",
				name: "4",
			};

			const { planSettings, planSettingsOverview } = usePreferences();

			expect(Object.keys(planSettings.value).length).toBe(2);
			expect(planSettingsOverview.value.length).toBe(2);
		});
	});

	it("cleanPlanPreferences", async () => {
		userStore.setPlanPreference("foo", { includeCM: true });
		userStore.setPlanPreference("moo", {
			visitationMaterialExclusions: ["RAT", "DW"],
		});

		planningStore.plans["foo"] = {
			planet_id: "1",
			name: "2",
		};

		const { planSettings, cleanPlanPreferences } = usePreferences();

		expect(Object.keys(planSettings.value).length).toBe(2);

		cleanPlanPreferences();

		expect(Object.keys(planSettings.value).length).toBe(1);
	});

	describe("getBurnDisplayClass", async () => {
		beforeEach(() => {
			userStore.setPreference("burnDaysRed", 5);
			userStore.setPreference("burnDaysYellow", 10);
		});

		it("red class", async () => {
			const { getBurnDisplayClass } = usePreferences();

			expect(
				getBurnDisplayClass(4).value.includes("bg-negative")
			).toBeTruthy();
			expect(
				getBurnDisplayClass(4).value.includes("bg-positive")
			).toBeFalsy();
		});

		it("yellow class", async () => {
			const { getBurnDisplayClass } = usePreferences();

			const result = getBurnDisplayClass(6).value;

			expect(result.includes("bg-positive")).toBeTruthy();
			expect(result.includes("bg-negative")).toBeFalsy();
		});

		it("no class", async () => {
			const { getBurnDisplayClass } = usePreferences();

			const result = getBurnDisplayClass(11).value;

			expect(result).toBe("");
		});
	});
});
