import { defineStore } from "pinia";
import {
	computed,
	type ComputedRef,
	nextTick,
	type Reactive,
	reactive,
	ref,
	type Ref,
	watch,
} from "vue";
import { merge } from "lodash-es";

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
	FIOStatus,
	UserProfile,
} from "@/features/api/schemas/user.schemas";
import { preferenceDefaults } from "@/features/preferences/userDefaults";
import { setSyncedPreferences } from "@/features/preferences/preferenceSync";
import { persistStorage } from "@/lib/persistStorage";
import { deepClone } from "@/util/data";
import type { Composer } from "vue-i18n";
import {
	dropInvalidMessages,
	localeLazyLoaders,
	type SupportedLocale,
} from "@/lib/i18n";

const FIO_POLL_MS = 15_000;
const FIO_POLL_TRIES = 20;

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
		// until hydrated or fetched, the defaults are what's synced
		setSyncedPreferences(preferences);

		// state reset
		function $reset(): void {
			accessToken.value = undefined;
			refreshToken.value = undefined;
			profile.value = undefined;
			Object.assign(preferences, deepClone(preferenceDefaults));
			setSyncedPreferences(preferences);
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
			// a stored override is always complete: the PATCH schema needs
			// every required field, and the backend defaults differ
			const current = preferences.planOverrides[planUuid] || {};
			preferences.planOverrides[planUuid] = {
				...deepClone(preferenceDefaults.planDefaults),
				...current,
				...patch,
			};
		}

		function getPlanPreference(planUuid: string): PreferencePerPlan {
			return merge(
				{},
				preferenceDefaults.planDefaults,
				preferences.planOverrides[planUuid] || {}
			);
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
					console.warn(
						`Invalid ${v} messages, using en_US:`,
						dropped
					);
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

		// a profile persisted before fio_status existed has none until it reloads
		const fioStatus: ComputedRef<FIOStatus> = computed(
			() => profile.value?.fio_status ?? "none"
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
			resetSession();
		}

		/**
		 * Clears the session's data: user, plans and query cache. Also used
		 * when another tab logged out.
		 * @author jplacht
		 */
		function resetSession(): void {
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
		 * @returns {Promise<"ok" | "throttled" | "failed">} "throttled" on a 429
		 */
		async function performLogin(
			username: string,
			password: string
		): Promise<"ok" | "throttled" | "failed"> {
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

				return "ok";
			} catch (err) {
				console.error(err);
				return (err as { status?: number }).status === 429
					? "throttled"
					: "failed";
			}
		}

		async function refreshAccessToken(): Promise<boolean> {
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

		// the refresh in flight, shared by everyone asking while it runs
		let refreshInFlight: Promise<boolean> | null = null;

		/**
		 * Performs a token refresh. Concurrent callers (parallel 401s) share
		 * one request and get the same promise; the next call after it
		 * settled refreshes again.
		 * @author jplacht
		 *
		 * @returns {Promise<boolean>}
		 */
		function performTokenRefresh(): Promise<boolean> {
			refreshInFlight ??= refreshAccessToken().finally(() => {
				refreshInFlight = null;
			});
			return refreshInFlight;
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

		/*
		 * New FIO credentials read "syncing" until the worker's first refresh,
		 * usually seconds: reload the profile until the status moves on, for at
		 * most FIO_POLL_TRIES * FIO_POLL_MS
		 */
		let fioPoll: ReturnType<typeof setTimeout> | undefined;
		watch(
			fioStatus,
			(status) => {
				clearTimeout(fioPoll);
				if (status !== "syncing") return;

				let tries = 0;
				const poll = () => {
					fioPoll = setTimeout(async () => {
						await performGetProfile();
						if (
							fioStatus.value === "syncing" &&
							++tries < FIO_POLL_TRIES
						)
							poll();
					}, FIO_POLL_MS);
				};
				poll();
			},
			{ immediate: true }
		);

		return {
			accessToken,
			refreshToken,
			profile,
			// reset
			$reset,
			// getters
			isLoggedIn,
			hasFIO,
			fioStatus,
			// preferences
			intialPreferencesCalled,
			preferences,
			setPreference,
			setPlanPreference,
			getPlanPreference,
			setLocale,
			initLocale,
			// functions
			setToken,
			logout,
			resetSession,
			performLogin,
			performTokenRefresh,
			performGetProfile,
		};
	},
	{
		persist: {
			storage: persistStorage,
			pick: ["accessToken", "refreshToken", "profile", "preferences"],
			// overrides persisted before setPlanPreference stored complete
			// ones fail the PATCH schema, which blocks every preference sync
			afterHydrate: ({ store }) => {
				const overrides: UserPreference["planOverrides"] =
					store.preferences.planOverrides ?? {};
				for (const uuid of Object.keys(overrides))
					overrides[uuid] = {
						...deepClone(preferenceDefaults.planDefaults),
						...overrides[uuid],
					};
				store.preferences.planOverrides = overrides;
				// a cleared number field once stored null or NaN (persisted as null)
				for (const key of [
					"burnDaysRed",
					"burnDaysYellow",
					"burnResupplyDays",
					"supplyCartDays",
				] as const)
					if (!Number.isFinite(store.preferences[key]))
						store.preferences[key] = preferenceDefaults[key];
				// a PATCH sends what changed since this state
				setSyncedPreferences(store.preferences);
			},
		},
	}
);
