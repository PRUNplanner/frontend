import {
	computed,
	type ComputedRef,
	watch,
	type WatchHandle,
	type WritableComputedRef,
} from "vue";
import { debounce } from "lodash-es";
import {
	markPreferencesSynced,
	unsyncedPreferences,
} from "@/features/preferences/preferenceSync";
import { i18n, type SupportedLocale } from "@/lib/i18n";

// Stores
import { useUserStore } from "@/stores/userStore";
import { usePlanningStore } from "@/stores/planningStore";

// Default values
import { preferenceDefaults } from "@/features/preferences/userDefaults";
import { reportError } from "@/lib/analytics/useAnalytics";

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
		// loaded here, so the landing page and footer (locale) stay light
		const { useQuery } = await import("@/lib/query_cache/useQuery");
		await useQuery("PatchPreferences", patch).execute();
		markPreferencesSynced(patch);
	} catch (err) {
		reportError(err);
		if (retry) syncToBackend(session, false);
	}
};
const syncToBackend = debounce(patchPrefs, 5000);
// a change made right before leaving (e.g. a dismissed banner) is not lost
if (typeof window !== "undefined")
	window.addEventListener("pagehide", () => syncToBackend.flush());

/**
 * Syncs every preference change to the backend, once for the whole app
 * (main.ts), whether or not a component using the preferences is mounted
 *
 * @author jplacht
 *
 * @returns {WatchHandle} Stops the sync
 */
export function startPreferenceSync(): WatchHandle {
	const userStore = useUserStore();
	return watch(
		() => userStore.preferences,
		() => syncToBackend(userStore.refreshToken),
		{ deep: true }
	);
}

export function usePreferences() {
	const userStore = useUserStore();

	const { getPlanNamePlanet } = usePlanningStore();

	// a cleared or half-typed number field gives null or NaN, which the
	// PATCH schema rejects: keep the last valid value
	const setNumber = (
		key:
			| "burnDaysRed"
			| "burnDaysYellow"
			| "burnResupplyDays"
			| "supplyCartDays"
			| "fioRepairIntervalDays"
			| "fioRepairDueSoonDays"
			| "fioRepairArrivalDays",
		v: number
	) => {
		if (Number.isFinite(v)) userStore.setPreference(key, v);
	};

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
		set: (v) => setNumber("burnDaysRed", v),
	});

	const burnDaysYellow: WritableComputedRef<number, number> =
		computed<number>({
			get: () => userStore.preferences.burnDaysYellow,
			set: (v) => setNumber("burnDaysYellow", v),
		});

	const burnResupplyDays: WritableComputedRef<number, number> =
		computed<number>({
			get: () => userStore.preferences.burnResupplyDays,
			set: (v) => setNumber("burnResupplyDays", v),
		});

	const burnOrigin: WritableComputedRef<string, string> = computed<string>({
		get: () => userStore.preferences.burnOrigin,
		set: (v) => userStore.setPreference("burnOrigin", v),
	});

	const supplyCartDays: WritableComputedRef<number, number> = computed({
		get: () => userStore.preferences.supplyCartDays ?? 20,
		set: (v) => setNumber("supplyCartDays", v),
	});

	const fioRepairIntervalDays: WritableComputedRef<number, number> = computed(
		{
			get: () => userStore.preferences.fioRepairIntervalDays,
			set: (v) => setNumber("fioRepairIntervalDays", v),
		}
	);

	const fioRepairDueSoonDays: WritableComputedRef<number, number> = computed({
		get: () => userStore.preferences.fioRepairDueSoonDays,
		set: (v) => setNumber("fioRepairDueSoonDays", v),
	});

	const fioRepairArrivalDays: WritableComputedRef<number, number> = computed({
		get: () => userStore.preferences.fioRepairArrivalDays,
		set: (v) => setNumber("fioRepairArrivalDays", v),
	});

	const fioRepairPlanLinks: ComputedRef<
		UserPreference["fioRepairPlanLinks"]
	> = computed(() => userStore.preferences.fioRepairPlanLinks);

	/**
	 * Saves the plan picked for a FIO base: a plan uuid, null for "no
	 * plan", undefined to go back to automatic matching. The sync sends
	 * only this SiteId.
	 *
	 * @author jplacht
	 *
	 * @param {string} siteId FIO SiteId
	 * @param {string | null | undefined} planUuid Plan, null or undefined
	 */
	function setFioRepairPlanLink(
		siteId: string,
		planUuid: string | null | undefined
	): void {
		const links = (userStore.preferences.fioRepairPlanLinks ??= {});
		if (planUuid === undefined) delete links[siteId];
		else links[siteId] = { planUuid };
	}

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

	const marketCardTrigger: WritableComputedRef<
		UserPreference["marketCardTrigger"]
	> = computed({
		get: () => userStore.preferences.marketCardTrigger,
		set: (v) => userStore.setPreference("marketCardTrigger", v),
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
				.setLocale(v, i18n.global)
				.catch(reportError);
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
						// i18n keys, translated by the overview
						preferences: [] as string[],
					};

					// handle individual preferences
					if (
						"includeCM" in preference &&
						preference.includeCM !==
							preferenceDefaults.planDefaults.includeCM
					) {
						planOverview.preferences.push(
							"profile.preferences.plan_settings.include_cm"
						);
					}

					if (
						"visitationMaterialExclusions" in preference &&
						preference.visitationMaterialExclusions &&
						preference.visitationMaterialExclusions.length > 0
					) {
						planOverview.preferences.push(
							"profile.preferences.plan_settings.visitation_exclusions"
						);
					}

					if (
						preference.constructionBuilt &&
						Object.keys(preference.constructionBuilt).length > 0
					) {
						planOverview.preferences.push(
							"profile.preferences.plan_settings.construction_built"
						);
					}

					if (
						"autoOptimizeHabs" in preference &&
						preference.autoOptimizeHabs !==
							preferenceDefaults.planDefaults.autoOptimizeHabs
					) {
						planOverview.preferences.push(
							"profile.preferences.plan_settings.auto_optimize_inactive"
						);
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
				return "text-black bg-negative";
			} else if (value <= burnDaysYellow.value)
				return "text-black bg-warning";
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
		fioRepairIntervalDays,
		fioRepairDueSoonDays,
		fioRepairArrivalDays,
		fioRepairPlanLinks,
		planSettings,
		planSettingsOverview,
		layoutNavigationStyle,
		colorPalette,
		marketCardTrigger,
		planSuggestions,
		locale,
		// functions
		getBurnDisplayClass,
		setFioRepairPlanLink,
	};
}
