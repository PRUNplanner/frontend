import { computed, ComputedRef, WritableComputedRef } from "vue";

// Stores
import { useUserStore } from "@/stores/userStore";

// Types & Interfaces
import { IPreferencePerPlan } from "@/features/preferences/userPreferences.types";

export function usePlanPreferences(planUuid: string) {
	const userStore = useUserStore();

	/**
	 * Computed individual plans full preferences
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<IPreferencePerPlan>}
	 */
	const fullPreferences: ComputedRef<IPreferencePerPlan> = computed(() =>
		userStore.getPlanPreference(planUuid)
	);

	/**
	 * Set a plans preferences key to specified value
	 *
	 * @author jplacht
	 *
	 * @template {keyof typeof fullPreferences.value} K Preference Key
	 * @param {K} key Key as String
	 * @param {(typeof fullPreferences.value)[K]} value Preference Value
	 */
	function setPlanPreference<K extends keyof typeof fullPreferences.value>(
		key: K,
		value: (typeof fullPreferences.value)[K]
	): void {
		userStore.setPlanPreference(planUuid, { [key]: value });
	}

	/**
	 * Writable computed for plans include core module preferences
	 *
	 * @author jplacht
	 *
	 * @type {WritableComputedRef<boolean, boolean>}
	 */
	const includeCM: WritableComputedRef<boolean | undefined, boolean> =
		computed({
			get: () => fullPreferences.value.includeCM,
			set: (v) => setPlanPreference("includeCM", v),
		});

	/**
	 * Writable computed for plans visitation frequency tool material
	 * exclusion list, array of material tickers
	 *
	 * @author jplacht
	 *
	 * @type {WritableComputedRef<
	 * 		string[],
	 * 		string[]
	 * 	>}
	 */
	const visitationMaterialExclusions: WritableComputedRef<
		string[] | undefined,
		string[]
	> = computed({
		get: () => fullPreferences.value.visitationMaterialExclusions,
		set: (v) => setPlanPreference("visitationMaterialExclusions", v),
	});

	const autoOptimizeHabs: WritableComputedRef<boolean, boolean> = computed({
		get: () => fullPreferences.value.autoOptimizeHabs,
		set: (v) => setPlanPreference("autoOptimizeHabs", v),
	});

	return {
		fullPreferences,
		setPlanPreference,
		// preferences
		includeCM,
		visitationMaterialExclusions,
		autoOptimizeHabs,
	};
}
