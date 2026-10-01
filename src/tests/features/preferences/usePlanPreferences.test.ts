import { describe, it, expect, beforeEach } from "vitest";
import { ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/stores/userStore";

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

	describe("constructionBuilt", async () => {
		it("get", async () => {
			const { constructionBuilt } = usePlanPreferences("meow");
			expect(constructionBuilt.value).toStrictEqual({});
		});

		it("set", async () => {
			const userStore = useUserStore();
			const { constructionBuilt } = usePlanPreferences("meow");
			constructionBuilt.value = { FRM: 3 };
			expect(constructionBuilt.value).toStrictEqual({ FRM: 3 });

			// a removed key is gone, not merged back from before
			constructionBuilt.value = {};
			expect(constructionBuilt.value).toStrictEqual({});
			expect(
				userStore.preferences.planOverrides["meow"].constructionBuilt
			).toStrictEqual({});
		});
	});

	it("follows a changing uuid ref", async () => {
		const userStore = useUserStore();
		userStore.setPlanPreference("a", { includeCM: true });
		userStore.setPlanPreference("b", { includeCM: false });

		const uuid = ref("a");
		const { includeCM } = usePlanPreferences(uuid);
		expect(includeCM.value).toBe(true);

		uuid.value = "b";
		expect(includeCM.value).toBe(false);
	});

	it("undefined uuid reads defaults and ignores writes", async () => {
		const userStore = useUserStore();
		const { fullPreferences, includeCM } = usePlanPreferences(undefined);

		expect(fullPreferences.value).toStrictEqual(
			preferenceDefaults.planDefaults
		);

		includeCM.value = !preferenceDefaults.planDefaults.includeCM;
		expect(includeCM.value).toBe(preferenceDefaults.planDefaults.includeCM);
		expect(userStore.preferences.planOverrides).toStrictEqual({});
	});
});
