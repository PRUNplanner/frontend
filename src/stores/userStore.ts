import { defineStore } from "pinia";
import { computed, ComputedRef, Reactive, reactive, ref, Ref } from "vue";
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
	trackUser,
	resetUser,
	identifyUser,
} from "@/lib/analytics/useAnalytics";

// Types & Interfaces
import {
	IUserProfile,
	IUserRefreshTokenResponse,
	IUserTokenResponse,
} from "@/features/api/userData.types";
import {
	IPreference,
	IPreferencePerPlan,
} from "@/features/preferences/userPreferences.types";
import { preferenceDefaults } from "@/features/preferences/userDefaults";

export const useUserStore = defineStore(
	"prunplanner_user",
	() => {
		// state
		const accessToken: Ref<string | undefined> = ref(undefined);
		const refreshToken: Ref<string | undefined> = ref(undefined);
		const profile: Ref<IUserProfile | undefined> = ref(undefined);

		const preferences: Reactive<IPreference> =
			reactive<IPreference>(preferenceDefaults);

		// state reset
		function $reset(): void {
			accessToken.value = undefined;
			refreshToken.value = undefined;
			profile.value = undefined;
			Object.assign(preferences, preferenceDefaults);
		}

		// user preference handling

		type PreferenceType = typeof preferences;

		// generic setter for top-level preferences
		function setPreference<K extends keyof IPreference>(
			key: K,
			value: PreferenceType[K]
		): void {
			preferences[key] = value;
		}

		// per plan override setter
		function setPlanPreference(
			planUuid: string,
			patch: Partial<IPreferencePerPlan>
		): void {
			const current = preferences.planOverrides[planUuid] || {};
			preferences.planOverrides[planUuid] = { ...current, ...patch };
		}

		function getPlanPreference(planUuid: string): IPreferencePerPlan {
			return merge(
				{},
				preferenceDefaults.planDefaults,
				preferences.planOverrides[planUuid] || {}
			);
		}

		function clearPlanPreference(planUuid: string): void {
			delete preferences.planOverrides[planUuid];
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
			performGetProfile();
		}

		/**
		 * Logs user out by clearing data
		 * @author jplacht
		 */
		function logout(): void {
			trackEvent("user_logout");

			// reset user store
			$reset();

			// reset posthog users
			resetUser();

			const planningStore = usePlanningStore();
			planningStore.$reset();

			const queryStore = useQueryStore();
			queryStore.$reset();
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
				const tokenData: IUserTokenResponse = await callUserLogin(
					username,
					password
				);

				setToken(tokenData.access, tokenData.refresh);

				trackEvent("user_login", { username });

				// sets the current version to the available version
				const { markUpdated } = useVersionCheck();
				await markUpdated();

				// update preferences
				useQuery("GetPreferences");

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
					const tokenData: IUserRefreshTokenResponse =
						await callRefreshToken(refreshToken.value);

					setToken(tokenData.access, refreshToken.value);

					// update preferences
					useQuery("GetPreferences");

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
					await callGetProfile().then((result: IUserProfile) => {
						// identify users for posthog
						identifyUser(result.id.toString(), {
							username: result.username,
						});

						if (
							result.fio_apikey !== profile.value?.fio_apikey ||
							result.prun_username !==
								profile.value?.prun_username
						) {
							if (
								result.fio_apikey !== null &&
								result.prun_username !== null
							)
								trackUser({ fio_enabled: true });
							else trackUser({ fio_enabled: false });

							trackUser({
								prun_username: result.prun_username,
							});
						}

						profile.value = result;
					});
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
			preferences,
			setPreference,
			setPlanPreference,
			clearPlanPreference,
			getPlanPreference,
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
