import { describe, it, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Composables
import { usePlanPreferences } from "@/features/preferences/usePlanPreferences";

import { preferenceDefaults } from "@/features/preferences/userDefaults";

describe("usePreferences", async () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it("fullPreferences", async () => {
		const { fullPreferences } = usePlanPreferences("meow");
		expect(fullPreferences.value).toStrictEqual(
			preferenceDefaults.planDefaults
		);
	});

	it("setPlanPreference", async () => {
		const { fullPreferences, setPlanPreference } =
			usePlanPreferences("meow");
		expect(fullPreferences.value).toStrictEqual(
			preferenceDefaults.planDefaults
		);

		setPlanPreference("includeCM", true);
		expect(fullPreferences.value.includeCM).toBeTruthy();
		setPlanPreference("includeCM", false);
		expect(fullPreferences.value.includeCM).toBeFalsy();
	});

	describe("includeCM", async () => {
		it("get", async () => {
			const { includeCM } = usePlanPreferences("meow");

			expect(includeCM.value).toBe(
				preferenceDefaults.planDefaults.includeCM
			);
		});

		it("set", async () => {
			const { includeCM } = usePlanPreferences("meow");
			includeCM.value = true;
			expect(includeCM.value).toBe(true);
		});
	});

	describe("autoOptimizeHabs", async () => {
		it("get", async () => {
			const { autoOptimizeHabs } = usePlanPreferences("meow");

			expect(autoOptimizeHabs.value).toBe(
				preferenceDefaults.planDefaults.autoOptimizeHabs
			);
		});

		it("set", async () => {
			const { autoOptimizeHabs } = usePlanPreferences("meow");
			autoOptimizeHabs.value = true;
			expect(autoOptimizeHabs.value).toBe(true);
		});
	});

	describe("visitationMaterialExclusions", async () => {
		it("get", async () => {
			const { visitationMaterialExclusions } = usePlanPreferences("meow");
			expect(visitationMaterialExclusions.value).toStrictEqual(
				preferenceDefaults.planDefaults.visitationMaterialExclusions
			);
		});

		it("set", async () => {
			const { visitationMaterialExclusions } = usePlanPreferences("meow");
			visitationMaterialExclusions.value = ["RAT", "DW"];
			expect(visitationMaterialExclusions.value).toStrictEqual([
				"RAT",
				"DW",
			]);
		});
	});
});
