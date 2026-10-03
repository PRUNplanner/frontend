import {
	computed,
	type ComputedRef,
	watch,
	type WritableComputedRef,
} from "vue";
import { debounce, isEqual, cloneDeep } from "lodash-es";
import {
	markPreferencesSynced,
	unsyncedPreferences,
} from "@/features/preferences/preferenceSync";
import { i18n, type SupportedLocale } from "@/lib/i18n";
import type { Composer } from "vue-i18n";

// Stores
import { useUserStore } from "@/stores/userStore";

// Composables
import { usePlan } from "@/features/planning_data/usePlan";

// API
import { useQuery } from "@/lib/query_cache/useQuery";

// Default values
import { preferenceDefaults } from "@/features/preferences/userDefaults";

// Types & Interfaces
import type { IPlanPreferenceOverview } from "@/features/preferences/userPreferences.types";
import type {
	PreferencePerPlan,
	UserPreference,
} from "@/features/api/schemas/user.schemas";

// debounced update to backend, dropped if the session (refresh token) it
// was scheduled in has ended: never send one user's preferences as another.
// Only what changed since the last sync is sent, so a tab never resets keys
// another tab or device changed. A failed sync is retried once on the next
// debounce.
const patchPrefs = async (session: string | undefined, retry = true) => {
	const userStore = useUserStore();
	if (session !== userStore.refreshToken) return;

	const patch = unsyncedPreferences(userStore.preferences);
	if (Object.keys(patch).length === 0) return;

	try {
		await useQuery("PatchPreferences", patch).execute();
		markPreferencesSynced(patch);
	} catch (err) {
		console.error("Sync failed", err);
		if (retry) syncToBackend(session, false);
	}
};
const syncToBackend = debounce(patchPrefs, 5000);

export function usePreferences() {
	const userStore = useUserStore();

	const { getPlanNamePlanet } = usePlan();

	watch(
		() => cloneDeep(userStore.preferences),
		(newVal, oldVal) => {
			if (isEqual(newVal, oldVal)) return;
			syncToBackend(userStore.refreshToken);
		},
		{ deep: true }
	);

	const defaultEmpireUuid: WritableComputedRef<
		string | undefined,
		string | undefined
	> = computed<string | undefined>({
		get: () => userStore.preferences.defaultEmpireUuid,
		set: (v) => userStore.setPreference("defaultEmpireUuid", v),
	});

	const defaultCXUuid: WritableComputedRef<
		string | undefined,
		string | undefined
	> = computed<string | undefined>({
		get: () => userStore.preferences.defaultCXUuid,
		set: (v) => userStore.setPreference("defaultCXUuid", v),
	});

	const defaultBuyItemsFromCX: WritableComputedRef<boolean, boolean> =
		computed<boolean>({
			get: () => userStore.preferences.defaultBuyItemsFromCX ?? true,
			set: (v) => userStore.setPreference("defaultBuyItemsFromCX", v),
		});

	const burnDaysRed: WritableComputedRef<number, number> = computed<number>({
		get: () => userStore.preferences.burnDaysRed,
		set: (v) => userStore.setPreference("burnDaysRed", v),
	});

	const burnDaysYellow: WritableComputedRef<number, number> =
		computed<number>({
			get: () => userStore.preferences.burnDaysYellow,
			set: (v) => userStore.setPreference("burnDaysYellow", v),
		});

	const burnResupplyDays: WritableComputedRef<number, number> =
		computed<number>({
			get: () => userStore.preferences.burnResupplyDays,
			set: (v) => userStore.setPreference("burnResupplyDays", v),
		});

	const burnOrigin: WritableComputedRef<string, string> = computed<string>({
		get: () => userStore.preferences.burnOrigin,
		set: (v) => userStore.setPreference("burnOrigin", v),
	});

	const supplyCartDays: WritableComputedRef<number, number> = computed({
		get: () => userStore.preferences.supplyCartDays ?? 20,
		set: (v) => userStore.setPreference("supplyCartDays", v),
	});

	const planSettings: ComputedRef<
		Record<string, Partial<PreferencePerPlan>>
	> = computed(() => {
		return userStore.preferences.planOverrides;
	});

	const layoutNavigationStyle: WritableComputedRef<
		UserPreference["layoutNavigationStyle"]
	> = computed({
		get: () => userStore.preferences.layoutNavigationStyle,
		set: (v) => userStore.setPreference("layoutNavigationStyle", v),
	});

	const colorPalette: WritableComputedRef<UserPreference["colorPalette"]> =
		computed({
			get: () => userStore.preferences.colorPalette,
			set: (v) => userStore.setPreference("colorPalette", v),
		});

	const planSuggestions: WritableComputedRef<boolean> = computed({
		get: () => userStore.preferences.planSuggestions ?? true,
		set: (v) => userStore.setPreference("planSuggestions", v),
	});

	const locale: WritableComputedRef<string> = computed({
		get: () => userStore.preferences.locale,
		set: (v: SupportedLocale) => {
			userStore.setPreference("locale", v);
			userStore
				.setLocale(v, i18n.global as unknown as Composer)
				.catch(console.error);
		},
	});

	/**
	 * Computed overview array of users plan specific settings, checks settings
	 * for existance and against default values
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<IPlanPreferenceOverview[]>}
	 */
	const planSettingsOverview: ComputedRef<IPlanPreferenceOverview[]> =
		computed(() => {
			const overview: IPlanPreferenceOverview[] = [];

			for (const [planUuid, preference] of Object.entries(
				planSettings.value
			) as [string, Partial<PreferencePerPlan>][]) {
				// fetch generic plan information
				try {
					const { planetId, planName } = getPlanNamePlanet(planUuid);

					const planOverview = {
						planUuid: planUuid,
						planetId: planetId,
						planName: planName,
						preferences: [] as string[],
					};

					// handle individual preferences
					if (
						"includeCM" in preference &&
						preference.includeCM !==
							preferenceDefaults.planDefaults.includeCM
					) {
						planOverview.preferences.push("Include CM");
					}

					if (
						"visitationMaterialExclusions" in preference &&
						preference.visitationMaterialExclusions &&
						preference.visitationMaterialExclusions.length > 0
					) {
						planOverview.preferences.push(
							"Visitation Material Exclusions"
						);
					}

					if (
						preference.constructionBuilt &&
						Object.keys(preference.constructionBuilt).length > 0
					) {
						planOverview.preferences.push(
							"Construction Cart: Built"
						);
					}

					if (
						"autoOptimizeHabs" in preference &&
						preference.autoOptimizeHabs !==
							preferenceDefaults.planDefaults.autoOptimizeHabs
					) {
						planOverview.preferences.push("Auto-Optimize Inactive");
					}

					// add to overview if there is a pref set
					if (planOverview.preferences.length > 0) {
						overview.push(planOverview);
					}
				} catch {
					continue;
				}
			}

			return overview;
		});

	/**
	 * Generates CSS classes to visualize a value in relation to the users
	 * preferred minimum burn days to display the "red" or "yellow" category
	 *
	 * @author jplacht
	 *
	 * @param {number} value Value of days actual
	 * @returns {ComputedRef<string>} Burn Type CSS class
	 */
	function getBurnDisplayClass(value: number): ComputedRef<string> {
		return computed(() => {
			if (value <= burnDaysRed.value) {
				return "text-white bg-negative";
			} else if (value <= burnDaysYellow.value)
				return "text-black bg-positive";
			else return "";
		});
	}

	return {
		// preferences
		defaultCXUuid,
		defaultBuyItemsFromCX,
		defaultEmpireUuid,
		burnDaysRed,
		burnDaysYellow,
		burnResupplyDays,
		burnOrigin,
		supplyCartDays,
		planSettings,
		planSettingsOverview,
		layoutNavigationStyle,
		colorPalette,
		planSuggestions,
		locale,
		// functions
		getBurnDisplayClass,
	};
}
