import { defineStore } from "pinia";
import {
	computed,
	type ComputedRef,
	nextTick,
	type Reactive,
	reactive,
	ref,
	type Ref,
} from "vue";
import merge from "lodash/merge";

// API
import {
	callGetProfile,
	callRefreshToken,
	callUserLogin,
} from "@/features/api/userData.api";

// Stores
import { usePlanningStore } from "@/stores/planningStore";
import { useQueryStore } from "@/lib/query_cache/queryStore";

// Composables
import { useQuery } from "@/lib/query_cache/useQuery";
import { useVersionCheck } from "@/lib/useVersionCheck";
import {
	trackEvent,
	resetUser,
	identifyUser,
} from "@/lib/analytics/useAnalytics";

// Types & Interfaces
import type {
	PreferencePerPlan,
	RefreshTokenResponse,
	TokenResponse,
	UserPreference,
	UserProfile,
} from "@/features/api/schemas/user.schemas";
import { preferenceDefaults } from "@/features/preferences/userDefaults";
import { deepClone } from "@/util/data";
import type { Composer } from "vue-i18n";
import {
	dropInvalidMessages,
	localeLazyLoaders,
	type SupportedLocale,
} from "@/lib/i18n";

export const useUserStore = defineStore(
	"prunplanner_user",
	() => {
		// state
		const accessToken: Ref<string | undefined> = ref(undefined);
		const refreshToken: Ref<string | undefined> = ref(undefined);
		const profile: Ref<UserProfile | undefined> = ref(undefined);

		const initialProfileCalled: Ref<boolean> = ref(false);
		const intialPreferencesCalled: Ref<boolean> = ref(false);
		const preferences: Reactive<UserPreference> = reactive<UserPreference>(
			deepClone(preferenceDefaults)
		);

		// state reset
		function $reset(): void {
			accessToken.value = undefined;
			refreshToken.value = undefined;
			profile.value = undefined;
			Object.assign(preferences, deepClone(preferenceDefaults));
			// the next login must load its own profile and preferences
			initialProfileCalled.value = false;
			intialPreferencesCalled.value = false;
		}

		// user preference handling

		type PreferenceType = typeof preferences;

		// generic setter for top-level preferences
		function setPreference<K extends keyof UserPreference>(
			key: K,
			value: PreferenceType[K]
		): void {
			preferences[key] = value;
		}

		// per plan override setter
		function setPlanPreference(
			planUuid: string,
			patch: Partial<PreferencePerPlan>
		): void {
			const current = preferences.planOverrides[planUuid] || {};
			preferences.planOverrides[planUuid] = { ...current, ...patch };
		}

		function getPlanPreference(planUuid: string): PreferencePerPlan {
			return merge(
				{},
				preferenceDefaults.planDefaults,
				preferences.planOverrides[planUuid] || {}
			);
		}

		function clearPlanPreference(planUuid: string): void {
			delete preferences.planOverrides[planUuid];
		}

		async function initLocale(composer: Composer) {
			await setLocale(preferences.locale, composer);
		}

		async function setLocale(v: SupportedLocale, composer: Composer) {
			// language already loaded
			if (composer.availableLocales.includes(v)) {
				composer.locale.value = v;
				return;
			}

			// filter glob for all files in specified locale folder
			const localeFolderPrefix = `/src/locales/${v}/`;
			const relevantFiles = Object.keys(localeLazyLoaders).filter(
				(path) => path.startsWith(localeFolderPrefix)
			);

			if (relevantFiles.length === 0) {
				console.error(`No files found for locale: ${v}`);
				return;
			}

			try {
				// 3. Resolve all loaders in parallel
				const loadedModules = await Promise.all(
					relevantFiles.map(async (path) => {
						const loader = localeLazyLoaders[
							path
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
						] as () => Promise<{ default: any }>;
						const mod = await loader();
						const key = path.split("/").pop()?.replace(".json", "");
						return { key, data: mod.default };
					})
				);

				// 4. Merge into a single message object
				const messages = loadedModules.reduce(
					(acc, { key, data }) => {
						if (key) acc[key] = data;
						return acc;
					},
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					{} as Record<string, any>
				);

				// 5. Register and switch, untranslatable messages fall back
				const { messages: validMessages, dropped } =
					dropInvalidMessages(messages);
				if (dropped.length > 0) {
					console.warn(`Invalid ${v} messages, using en_US:`, dropped);
				}
				composer.setLocaleMessage(v, validMessages);
				composer.locale.value = v;

				nextTick(() => {
					document.querySelector("html")?.setAttribute("lang", v);
				});
			} catch (err) {
				console.error(`Failed to load locale ${v}:`, err);
			}
		}

		// getters
		const isLoggedIn: ComputedRef<boolean> = computed(
			() =>
				accessToken.value !== undefined &&
				refreshToken.value !== undefined
		);

		const hasFIO: ComputedRef<boolean> = computed(
			() =>
				profile.value !== undefined &&
				profile.value.fio_apikey !== "" &&
				profile.value.fio_apikey !== null &&
				profile.value.prun_username !== "" &&
				profile.value.prun_username !== null
		);

		// functions

		/**
		 * Sets access and refresh token
		 * @author jplacht
		 *
		 * @param {string} access Access Token
		 * @param {string} refresh Refresh Token
		 */
		function setToken(access: string, refresh: string): void {
			accessToken.value = access;
			refreshToken.value = refresh;

			// trigger profile refresh non-blocking
			if (initialProfileCalled.value) return;

			initialProfileCalled.value = true;

			// make get profile call
			performGetProfile();
		}

		/**
		 * Logs user out by clearing data
		 * @author jplacht
		 */
		function logout(): void {
			trackEvent("account:logout");

			// reset user store
			$reset();

			// reset posthog users
			resetUser();

			const planningStore = usePlanningStore();
			planningStore.$reset();

			const queryStore = useQueryStore();
			queryStore.$reset();
		}

		async function queryPreferences(): Promise<void> {
			if (intialPreferencesCalled.value) return;

			intialPreferencesCalled.value = true;

			// update preferences
			await useQuery("GetPreferences").execute();
		}

		/**
		 * Performs a login
		 * @author jplacht
		 *
		 * @async
		 * @param {string} username
		 * @param {string} password
		 * @returns {Promise<boolean>}
		 */
		async function performLogin(
			username: string,
			password: string
		): Promise<boolean> {
			try {
				const tokenData: TokenResponse = await callUserLogin(
					username,
					password
				);

				setToken(tokenData.access, tokenData.refresh);

				trackEvent("account:login");

				// sets the current version to the available version
				const { markUpdated } = useVersionCheck();
				await markUpdated();

				await queryPreferences();

				return true;
			} catch (err) {
				console.error(err);
				return false;
			}
		}

		/**
		 * Performs a token refresh
		 * @author jplacht
		 *
		 * @async
		 * @returns {Promise<boolean>}
		 */
		async function performTokenRefresh(): Promise<boolean> {
			if (refreshToken.value) {
				try {
					const tokenData: RefreshTokenResponse =
						await callRefreshToken(refreshToken.value);

					setToken(tokenData.access, refreshToken.value);

					return true;
				} catch (error) {
					console.error(error);
					return false;
				}
			} else {
				return false;
			}
		}

		/**
		 * Loads the users profile
		 * @author jplacht
		 *
		 * @async
		 * @returns {Promise<void>} None
		 */
		async function performGetProfile(): Promise<void> {
			// only perform if the user is logged in
			if (isLoggedIn.value) {
				try {
					const result: UserProfile = await callGetProfile();

					// identify users for posthog
					identifyUser(result);

					profile.value = result;
				} catch (error) {
					console.error(error);
				}
			}
		}

		return {
			accessToken,
			refreshToken,
			profile,
			// reset
			$reset,
			// getters
			isLoggedIn,
			hasFIO,
			// preferences
			intialPreferencesCalled,
			preferences,
			setPreference,
			setPlanPreference,
			clearPlanPreference,
			getPlanPreference,
			setLocale,
			initLocale,
			// functions
			setToken,
			logout,
			performLogin,
			performTokenRefresh,
			performGetProfile,
		};
	},
	{
		persist: {
			pick: ["accessToken", "refreshToken", "profile", "preferences"],
		},
	}
);
