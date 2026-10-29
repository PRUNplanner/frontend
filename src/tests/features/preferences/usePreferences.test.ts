import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Stores
import { useUserStore } from "@/stores/userStore";
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { usePreferences } from "@/features/preferences/usePreferences";

import { i18n } from "@/lib/i18n";
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

	describe("FIO Repair", () => {
		it("numbers: defaults, set, invalid input kept out", () => {
			const {
				fioRepairIntervalDays,
				fioRepairDueSoonDays,
				fioRepairArrivalDays,
			} = usePreferences();
			expect(fioRepairIntervalDays.value).toBe(60);
			expect(fioRepairDueSoonDays.value).toBe(7);
			expect(fioRepairArrivalDays.value).toBe(2);

			fioRepairIntervalDays.value = 45;
			fioRepairDueSoonDays.value = 3;
			fioRepairArrivalDays.value = 5;
			fioRepairArrivalDays.value = NaN;
			expect(fioRepairIntervalDays.value).toBe(45);
			expect(fioRepairDueSoonDays.value).toBe(3);
			expect(fioRepairArrivalDays.value).toBe(5);
		});

		it("plan links: pick, no plan, back to automatic", () => {
			const { fioRepairPlanLinks, setFioRepairPlanLink } =
				usePreferences();
			setFioRepairPlanLink("s1", "p1");
			setFioRepairPlanLink("s2", null);
			expect(fioRepairPlanLinks.value).toStrictEqual({
				s1: { planUuid: "p1" },
				s2: { planUuid: null },
			});

			setFioRepairPlanLink("s1", undefined);
			expect(fioRepairPlanLinks.value).toStrictEqual({
				s2: { planUuid: null },
			});
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

	// a cleared or half-typed field must not block the preferences PATCH
	describe("number preferences ignore non-numbers", async () => {
		it.each([null, NaN])("%s", async (bad) => {
			const { burnDaysRed, supplyCartDays } = usePreferences();
			burnDaysRed.value = 55;
			supplyCartDays.value = 7.5;
			burnDaysRed.value = bad as unknown as number;
			supplyCartDays.value = bad as unknown as number;
			expect(userStore.preferences.burnDaysRed).toBe(55);
			expect(userStore.preferences.supplyCartDays).toBe(7.5);
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

	describe("colorPalette", () => {
		it("get and set", () => {
			const { colorPalette } = usePreferences();
			expect(colorPalette.value).toBe(preferenceDefaults.colorPalette);

			colorPalette.value = "colorblind";

			expect(userStore.preferences.colorPalette).toBe("colorblind");
			expect(colorPalette.value).toBe("colorblind");
		});
	});

	describe("planSuggestions", () => {
		it("is on until turned off", () => {
			const { planSuggestions } = usePreferences();
			userStore.preferences.planSuggestions = undefined;
			expect(planSuggestions.value).toBe(true);

			planSuggestions.value = false;

			expect(userStore.preferences.planSuggestions).toBe(false);
			expect(planSuggestions.value).toBe(false);
		});
	});

	describe("fallbacks for preferences a profile does not have", () => {
		it("buys from CX and carts 20 days", () => {
			const { defaultBuyItemsFromCX, supplyCartDays } = usePreferences();
			userStore.preferences.defaultBuyItemsFromCX = undefined;
			userStore.preferences.supplyCartDays = undefined;

			expect(defaultBuyItemsFromCX.value).toBe(true);
			expect(supplyCartDays.value).toBe(20);
		});
	});

	describe("locale", () => {
		it("stores the locale and loads it into the app i18n", () => {
			const setLocale = vi
				.spyOn(userStore, "setLocale")
				.mockResolvedValue(undefined);
			const { locale } = usePreferences();

			locale.value = "de_DE";

			expect(userStore.preferences.locale).toBe("de_DE");
			expect(locale.value).toBe("de_DE");
			expect(setLocale).toHaveBeenCalledWith("de_DE", i18n.global);
		});

		it("logs a locale that fails to load instead of throwing", async () => {
			const failure = new Error("chunk missing");
			vi.spyOn(userStore, "setLocale").mockRejectedValue(failure);
			const error = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const { locale } = usePreferences();

			locale.value = "de_DE";
			await Promise.resolve();

			expect(error).toHaveBeenCalledWith(failure);
			error.mockRestore();
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

	it("lists an auto-optimize setting that differs from the default", () => {
		userStore.setPlanPreference("foo", { autoOptimizeHabs: true });
		userStore.setPlanPreference("moo", { autoOptimizeHabs: false });
		planningStore.plans["foo"] = { planet_id: "1", name: "2" };
		planningStore.plans["moo"] = { planet_id: "3", name: "4" };

		const { planSettingsOverview } = usePreferences();

		expect(planSettingsOverview.value).toHaveLength(1);
		expect(planSettingsOverview.value[0]).toMatchObject({
			planUuid: "foo",
			preferences: ["profile.preferences.plan_settings.auto_optimize_inactive"],
		});
	});

	it("lists manual construction built values", async () => {
		userStore.setPlanPreference("foo", { constructionBuilt: { FRM: 1 } });
		userStore.setPlanPreference("moo", { constructionBuilt: {} });
		planningStore.plans["foo"] = { planet_id: "1", name: "2" };
		planningStore.plans["moo"] = { planet_id: "3", name: "4" };

		const { planSettingsOverview } = usePreferences();

		expect(planSettingsOverview.value).toHaveLength(1);
		expect(planSettingsOverview.value[0].preferences).toStrictEqual([
			"profile.preferences.plan_settings.construction_built",
		]);
	});

	describe("getBurnDisplayClass", async () => {
		beforeEach(() => {
			userStore.setPreference("burnDaysRed", 5);
			userStore.setPreference("burnDaysYellow", 10);
		});

		it("red class", async () => {
			const { getBurnDisplayClass } = usePreferences();

			// black on the red badge: white on it is below 4.5:1
			expect(getBurnDisplayClass(4).value).toContain("text-black");
			expect(
				getBurnDisplayClass(4).value.includes("bg-negative")
			).toBeTruthy();
			expect(
				getBurnDisplayClass(4).value.includes("bg-warning")
			).toBeFalsy();
		});

		it("yellow class", async () => {
			const { getBurnDisplayClass } = usePreferences();

			const result = getBurnDisplayClass(6).value;

			expect(result.includes("bg-warning")).toBeTruthy();
			expect(result.includes("bg-negative")).toBeFalsy();
		});

		it("no class", async () => {
			const { getBurnDisplayClass } = usePreferences();

			const result = getBurnDisplayClass(11).value;

			expect(result).toBe("");
		});
	});
});
