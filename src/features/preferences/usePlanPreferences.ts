import {
	computed,
	type ComputedRef,
	type MaybeRefOrGetter,
	toValue,
	type WritableComputedRef,
} from "vue";

// Stores
import { useUserStore } from "@/stores/userStore";

// Util
import { deepClone } from "@/util/data";
import { preferenceDefaults } from "@/features/preferences/userDefaults";

// Types & Interfaces
import type { PreferencePerPlan } from "@/features/api/schemas/user.schemas";

/**
 * Preferences of a single plan. Without a uuid (plan not created yet) it
 * reads the plan defaults and writes are no-ops.
 *
 * @author jplacht
 *
 * @param {MaybeRefOrGetter<string | undefined>} planUuid Plan Uuid
 */
export function usePlanPreferences(
	planUuid: MaybeRefOrGetter<string | undefined>
) {
	const userStore = useUserStore();

	/**
	 * Computed individual plans full preferences
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<PreferencePerPlan>}
	 */
	const fullPreferences: ComputedRef<PreferencePerPlan> = computed(() => {
		const uuid = toValue(planUuid);
		return uuid
			? userStore.getPlanPreference(uuid)
			: deepClone(preferenceDefaults.planDefaults);
	});

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
		const uuid = toValue(planUuid);
		if (uuid) userStore.setPlanPreference(uuid, { [key]: value });
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

	/**
	 * Writable computed for the construction carts manually entered built
	 * buildings, building ticker to count
	 *
	 * @author jplacht
	 *
	 * @type {WritableComputedRef<
	 * 		Record<string, number> | undefined,
	 * 		Record<string, number>
	 * 	>}
	 */
	const constructionBuilt: WritableComputedRef<
		Record<string, number> | undefined,
		Record<string, number>
	> = computed({
		get: () => fullPreferences.value.constructionBuilt,
		set: (v) => setPlanPreference("constructionBuilt", v),
	});

	return {
		fullPreferences,
		setPlanPreference,
		// preferences
		includeCM,
		visitationMaterialExclusions,
		autoOptimizeHabs,
		constructionBuilt,
	};
}
