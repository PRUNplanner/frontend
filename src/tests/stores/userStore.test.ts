import { createApp, nextTick, ref } from "vue";
import { setActivePinia, createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { beforeEach, describe, it, expect, onTestFinished, vi } from "vitest";

import {
	callUserLogin,
	callRefreshToken,
	callGetProfile,
	callGetUserPreferences,
} from "@/features/api/userData.api";

import { useUserStore } from "@/stores/userStore";
import { memoryStorage } from "@/tests/memoryStorage";
import {
	type AppComposer,
	localeLazyLoaders,
	type SupportedLocale,
} from "@/lib/i18n";
import { preferenceDefaults } from "@/features/preferences/userDefaults";
import {
	UserPreferencePayloadSchema,
	type UserProfile,
} from "@/features/api/schemas/user.schemas";

vi.mock("@/features/api/userData.api", () => ({
	callUserLogin: vi.fn(),
	callRefreshToken: vi.fn(),
	callGetProfile: vi.fn(),
	callGetUserPreferences: vi.fn(),
}));

describe("User Store", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it("Initial store tokens and status", () => {
		const userStore = useUserStore();

		expect(userStore.accessToken).toBeUndefined();
		expect(userStore.refreshToken).toBeUndefined();
		expect(userStore.isLoggedIn).toBeFalsy();
	});

	it("Tokens set, logged in", () => {
		const userStore = useUserStore();

		userStore.setToken("foo", "moo");

		expect(userStore.isLoggedIn).toBeTruthy();
	});

	it("Logout", () => {
		const userStore = useUserStore();

		userStore.logout();

		expect(userStore.accessToken).toBeUndefined();
		expect(userStore.refreshToken).toBeUndefined();
		expect(userStore.isLoggedIn).toBeFalsy();
	});

	it("Logout: the next login loads its own profile and preferences", async () => {
		const userStore = useUserStore();
		const getProfile = vi
			.mocked(callGetProfile)
			.mockResolvedValue({} as UserProfile);
		getProfile.mockClear();

		userStore.setToken("access-a", "refresh-a");
		userStore.intialPreferencesCalled = true;
		userStore.logout();

		expect(userStore.intialPreferencesCalled).toBe(false);
		userStore.setToken("access-b", "refresh-b");
		// the API module loads on first use
		await vi.waitFor(() => expect(getProfile).toHaveBeenCalledTimes(2));
	});

	it("Logout: clears the query cache", async () => {
		const { useQueryStore } = await import("@/lib/query_cache/queryStore");
		const queryStore = useQueryStore();
		queryStore.addCacheState("GetMarketSummary", undefined, {} as never);
		expect(Object.keys(queryStore.cacheState)).toHaveLength(1);

		useUserStore().logout();

		expect(queryStore.cacheState).toEqual({});
	});

	it("loadProfile: a restored session loads its profile once per page load", async () => {
		const userStore = useUserStore();
		const getProfile = vi
			.mocked(callGetProfile)
			.mockResolvedValue({} as UserProfile);
		getProfile.mockClear();
		// tokens restored from storage, no setToken
		userStore.accessToken = "access";
		userStore.refreshToken = "refresh";

		userStore.loadProfile();
		userStore.loadProfile();
		// a token refresh later in the same page load
		userStore.setToken("access-2", "refresh-2");

		await vi.waitFor(() => expect(getProfile).toHaveBeenCalled());
		await vi.dynamicImportSettled();
		expect(getProfile).toHaveBeenCalledTimes(1);
	});

	it("Perform Login and set token: ok", async () => {
		const userStore = useUserStore();

		const mockUsername = "testuser";
		const mockPassword = "testpassword";
		const mockTokenData = {
			access_token: "mockAccessToken",
			refresh_token: "mockRefreshToken",
		};
		(
			callUserLogin as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(mockTokenData);
		(
			callGetProfile as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({});

		const result = await userStore.performLogin(mockUsername, mockPassword);

		expect(callUserLogin).toHaveBeenCalledWith(mockUsername, mockPassword);

		expect(result).toBe("ok");
	});

	it("Perform Login: ok when version.json fails", async () => {
		const userStore = useUserStore();
		vi.stubEnv("DEV", false);
		const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
		vi.stubGlobal("fetch", fetchMock);
		(
			callUserLogin as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ access: "a", refresh: "r" });

		expect(await userStore.performLogin("testuser", "testpassword")).toBe(
			"ok"
		);
		expect(fetchMock).not.toHaveBeenCalledWith(
			"/version.json",
			expect.anything()
		);
	});

	it("Perform Login: throttled", async () => {
		const userStore = useUserStore();

		(
			callUserLogin as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(
			Object.assign(new Error("throttled"), { status: 429 })
		);

		expect(await userStore.performLogin("testuser", "testpassword")).toBe(
			"throttled"
		);
	});

	it("Perform Login and set token: error response", async () => {
		const userStore = useUserStore();

		const mockUsername = "testuser";
		const mockPassword = "testpassword";

		(
			callUserLogin as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("Mock login error"));
		(
			callGetProfile as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({});

		const result = await userStore.performLogin(mockUsername, mockPassword);
		expect(callUserLogin).toHaveBeenCalledWith(mockUsername, mockPassword);

		expect(result).toBe("failed");
	});

	it("Perform Token Refresh", async () => {
		const userStore = useUserStore();

		const mockToken = "testtoken";
		const mockTokenData = {
			access: "mockAccessToken",
		};

		userStore.refreshToken = mockToken;

		(
			callRefreshToken as unknown as ReturnType<typeof vi.fn>
		).mockReturnValueOnce(mockTokenData);
		(
			callGetProfile as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({});

		expect(userStore.refreshToken).toBe(mockToken);
		const result = await userStore.performTokenRefresh();
		expect(callRefreshToken).toHaveBeenCalledWith(mockToken);

		expect(result).toBe(true);
		expect(userStore.accessToken).toBe(mockTokenData.access);
		expect(userStore.refreshToken).toBe(mockToken);
	});

	it("Perform Token Refresh, concurrent calls share one request", async () => {
		const userStore = useUserStore();
		userStore.refreshToken = "testtoken";
		let resolve!: (value: { access: string }) => void;
		const mocked = callRefreshToken as unknown as ReturnType<typeof vi.fn>;
		mocked.mockClear();
		mocked.mockReturnValueOnce(new Promise((r) => (resolve = r)));
		(
			callGetProfile as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({});

		const first = userStore.performTokenRefresh();
		const second = userStore.performTokenRefresh();
		resolve({ access: "mockAccessToken" });

		expect(await Promise.all([first, second])).toEqual([true, true]);
		expect(mocked).toHaveBeenCalledTimes(1);

		// settled: the next call refreshes again
		mocked.mockResolvedValueOnce({ access: "mockAccessToken2" });
		expect(await userStore.performTokenRefresh()).toBe(true);
		expect(mocked).toHaveBeenCalledTimes(2);
	});

	it("Perform Token Refresh, no refresh token", async () => {
		const userStore = useUserStore();

		userStore.refreshToken = undefined;

		(
			callGetProfile as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({});

		const result = await userStore.performTokenRefresh();
		expect(result).toBe(false);
	});

	it.each([401, 400])(
		"Perform Token Refresh: refused with %i",
		async (status) => {
			const userStore = useUserStore();

			const mockToken = "testtoken";

			userStore.refreshToken = mockToken;

			(
				callRefreshToken as unknown as ReturnType<typeof vi.fn>
			).mockRejectedValue(
				Object.assign(new Error("Mock refresh error"), { status })
			);
			(
				callGetProfile as unknown as ReturnType<typeof vi.fn>
			).mockResolvedValue({});

			const result = await userStore.performTokenRefresh();
			expect(callRefreshToken).toHaveBeenCalledWith(mockToken);

			expect(result).toBe(false);
		}
	);

	it("Perform Token Refresh: refused on a validation error", async () => {
		const userStore = useUserStore();
		userStore.refreshToken = "testtoken";

		// apiService's validation errors carry no status
		(
			callRefreshToken as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValueOnce(new Error("Validation error: refresh"));

		expect(await userStore.performTokenRefresh()).toBe(false);
	});

	it.each([
		["a network error", undefined],
		["a server error", 502],
	])("Perform Token Refresh: rejects on %s", async (_, status) => {
		const userStore = useUserStore();
		vi.mocked(callRefreshToken).mockClear();

		userStore.setToken("access", "testtoken");

		(
			callRefreshToken as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValueOnce(
			Object.assign(new Error("Network Error"), { status })
		);

		await expect(userStore.performTokenRefresh()).rejects.toThrow(
			"Network Error"
		);
		expect(userStore.refreshToken).toBe("testtoken");
		expect(userStore.accessToken).toBe("access");

		// settled: the next call asks again
		(
			callRefreshToken as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce({ access: "access-2" });
		expect(await userStore.performTokenRefresh()).toBe(true);
		expect(callRefreshToken).toHaveBeenCalledTimes(2);
	});

	describe("fioStatus", () => {
		it("is none without a profile", () => {
			expect(useUserStore().fioStatus).toBe("none");
		});

		it("follows the profile", () => {
			const userStore = useUserStore();
			userStore.profile = {
				id: 1,
				username: "test",
				email: null,
				is_email_verified: false,
				fio_apikey: "foo",
				prun_username: "moo",
				fio_status: "invalid_credentials",
				fio_last_refreshed_at: null,
			};

			expect(userStore.fioStatus).toBe("invalid_credentials");
		});

		describe("polling while syncing", () => {
			const withStatus = (
				fio_status: UserProfile["fio_status"]
			): UserProfile => ({
				id: 1,
				username: "test",
				email: null,
				is_email_verified: false,
				fio_apikey: "foo",
				prun_username: "moo",
				fio_status,
				fio_last_refreshed_at: null,
			});
			const getProfile = callGetProfile as unknown as ReturnType<
				typeof vi.fn
			>;

			beforeEach(() => {
				vi.useFakeTimers();
				getProfile.mockReset();
				onTestFinished(() => {
					vi.useRealTimers();
				});
			});

			it("reloads the profile until the status moves on", async () => {
				const userStore = useUserStore();
				userStore.accessToken = "foo";
				userStore.refreshToken = "moo";
				getProfile
					.mockResolvedValueOnce(withStatus("syncing"))
					.mockResolvedValueOnce(withStatus("ok"));

				userStore.profile = withStatus("syncing");
				await nextTick();
				await vi.advanceTimersByTimeAsync(15_000);
				expect(getProfile).toHaveBeenCalledTimes(1);

				await vi.advanceTimersByTimeAsync(15_000);
				expect(userStore.fioStatus).toBe("ok");

				await vi.advanceTimersByTimeAsync(60_000);
				expect(getProfile).toHaveBeenCalledTimes(2);
			});

			it("gives up after 20 tries", async () => {
				const userStore = useUserStore();
				userStore.accessToken = "foo";
				userStore.refreshToken = "moo";
				getProfile.mockResolvedValue(withStatus("syncing"));

				userStore.profile = withStatus("syncing");
				await nextTick();
				await vi.advanceTimersByTimeAsync(30 * 15_000);

				expect(getProfile).toHaveBeenCalledTimes(20);
			});

			it("stops on logout", async () => {
				const userStore = useUserStore();
				userStore.accessToken = "foo";
				userStore.refreshToken = "moo";
				userStore.profile = withStatus("syncing");
				// the poll is running
				await nextTick();

				userStore.$reset();
				await vi.advanceTimersByTimeAsync(60_000);

				expect(getProfile).not.toHaveBeenCalled();
			});

			it("does not poll other states", async () => {
				const userStore = useUserStore();
				userStore.accessToken = "foo";
				userStore.refreshToken = "moo";

				userStore.profile = withStatus("no_data");
				await vi.advanceTimersByTimeAsync(60_000);

				expect(getProfile).not.toHaveBeenCalled();
			});
		});
	});

	describe("hasFIO", async () => {
		const hasFIOCases: {
			profile: UserProfile | undefined;
			expected: boolean;
			description: string;
		}[] = [
			{
				profile: {
					id: 1,
					username: "test",
					email: null,
					is_email_verified: false,
					fio_apikey: "foo",
					prun_username: "moo",
					fio_status: "none",
					fio_last_refreshed_at: null,
				},
				expected: true,
				description: "Proper values, true",
			},
			{
				profile: undefined,
				expected: false,
				description: "Undefined profile, false",
			},
			{
				profile: {
					id: 1,
					username: "test",
					email: null,
					is_email_verified: false,
					fio_apikey: "",
					prun_username: "",
					fio_status: "none",
					fio_last_refreshed_at: null,
				},
				expected: false,
				description: "Empty strings, false",
			},
			{
				profile: {
					id: 1,
					username: "test",
					email: null,
					is_email_verified: false,
					fio_apikey: "test",
					prun_username: "",
					fio_status: "none",
					fio_last_refreshed_at: null,
				},
				expected: false,
				description: "Username missing, false",
			},
			{
				profile: {
					id: 1,
					username: "test",
					email: null,
					is_email_verified: false,
					fio_apikey: "",
					prun_username: "moo",
					fio_status: "none",
					fio_last_refreshed_at: null,
				},
				expected: false,
				description: "Apikey missing, false",
			},
			{
				profile: {
					id: 1,
					username: "test",
					email: null,
					is_email_verified: false,
					fio_apikey: null,
					prun_username: null,
					fio_status: "none",
					fio_last_refreshed_at: null,
				},
				expected: false,
				description: "Nulls, false",
			},
		];

		it.each(hasFIOCases)(
			"Test $description",
			async ({ profile, expected }) => {
				const userStore = useUserStore();
				userStore.profile = profile;

				expect(userStore.hasFIO).toBe(expected);
			}
		);
	});

	describe("performGetProfile", async () => {
		it("fio enabled", async () => {
			const mockProfile: UserProfile = {
				id: 1,
				username: "johndoe",
				email: "a@b.com",
				is_email_verified: true,
				fio_apikey: "foo",
				prun_username: "moo",
				fio_status: "ok",
				fio_last_refreshed_at: null,
			};

			const userStore = useUserStore();
			userStore.setToken("foo", "moo");

			(
				callGetProfile as unknown as ReturnType<typeof vi.fn>
			).mockResolvedValue(mockProfile);

			await userStore.performGetProfile();

			expect(userStore.profile).toBeDefined();
		});

		it("fio not enabled", async () => {
			const mockProfile: UserProfile = {
				id: 1,
				username: "johndoe",
				email: "a@b.com",
				is_email_verified: true,
				fio_apikey: null,
				prun_username: "moo",
				fio_status: "none",
				fio_last_refreshed_at: null,
			};

			const userStore = useUserStore();
			userStore.setToken("foo", "moo");

			(
				callGetProfile as unknown as ReturnType<typeof vi.fn>
			).mockResolvedValue(mockProfile);

			await userStore.performGetProfile();
			expect(userStore.profile).toBeDefined();
		});
	});

	describe("Preferences", async () => {
		it("Store values are set as defaults", async () => {
			const userStore = useUserStore();

			const activePrefs = userStore.preferences;

			expect(activePrefs.burnDaysRed).toBe(
				preferenceDefaults.burnDaysRed
			);
			expect(activePrefs.burnDaysYellow).toBe(
				preferenceDefaults.burnDaysYellow
			);
			expect(activePrefs.defaultEmpireUuid).toBe(
				preferenceDefaults.defaultEmpireUuid
			);
		});

		it("Preference change is persisted", async () => {
			const userStore = useUserStore();

			expect(userStore.preferences.burnDaysRed).toBe(
				preferenceDefaults.burnDaysRed
			);

			userStore.setPreference("burnDaysRed", 1);

			expect(userStore.preferences.burnDaysRed).toBe(1);
		});

		it("Preferences on plan uuid are persisted", async () => {
			const userStore = useUserStore();

			// preference does not exist, so its default

			expect(userStore.getPlanPreference("foo").includeCM).toBe(
				preferenceDefaults.planDefaults.includeCM
			);

			// change a preference
			userStore.setPlanPreference("foo", { includeCM: true });

			expect(userStore.getPlanPreference("foo").includeCM).toBeTruthy();
		});

		it("stores a complete plan override that passes the payload schema", async () => {
			const userStore = useUserStore();
			userStore.setPlanPreference("foo", {
				constructionBuilt: { FRM: 3 },
			});

			expect(userStore.preferences.planOverrides["foo"]).toStrictEqual({
				...preferenceDefaults.planDefaults,
				constructionBuilt: { FRM: 3 },
			});
			expect(() =>
				UserPreferencePayloadSchema.parse(userStore.preferences)
			).not.toThrow();
		});

		it("completes partial plan overrides persisted by older versions", async () => {
			onTestFinished(() => {
				vi.unstubAllGlobals();
			});
			vi.stubGlobal(
				"localStorage",
				memoryStorage({
					prunplanner_user: JSON.stringify({
						preferences: {
							...preferenceDefaults,
							planOverrides: {
								foo: { includeCM: true },
								moo: { autoOptimizeHabs: true },
							},
						},
					}),
				})
			);
			const pinia = createPinia().use(piniaPluginPersistedstate);
			createApp({}).use(pinia);
			setActivePinia(pinia);

			const userStore = useUserStore();

			expect(userStore.preferences.planOverrides).toStrictEqual({
				foo: { ...preferenceDefaults.planDefaults, includeCM: true },
				moo: {
					...preferenceDefaults.planDefaults,
					autoOptimizeHabs: true,
				},
			});
			expect(() =>
				UserPreferencePayloadSchema.parse(userStore.preferences)
			).not.toThrow();
		});

		it("Preference changes never touch the defaults and reset restores them", async () => {
			const userStore = useUserStore();
			const defaultBurnDaysRed = preferenceDefaults.burnDaysRed;

			userStore.setPreference("burnDaysRed", defaultBurnDaysRed + 1);
			userStore.setPlanPreference("foo", { includeCM: true });

			expect(preferenceDefaults.burnDaysRed).toBe(defaultBurnDaysRed);
			expect(preferenceDefaults.planOverrides).toStrictEqual({});

			userStore.$reset();

			expect(userStore.preferences.burnDaysRed).toBe(defaultBurnDaysRed);
			expect(userStore.preferences.planOverrides).toStrictEqual({});
		});

		it("restores a session stored with empty plan overrides", () => {
			onTestFinished(() => {
				vi.unstubAllGlobals();
			});
			const stored = { ...preferenceDefaults, planOverrides: null };
			vi.stubGlobal(
				"localStorage",
				memoryStorage({
					prunplanner_user: JSON.stringify({ preferences: stored }),
				})
			);
			const pinia = createPinia().use(piniaPluginPersistedstate);
			createApp({}).use(pinia);
			setActivePinia(pinia);

			const userStore = useUserStore();

			expect(userStore.preferences.planOverrides).toStrictEqual({});
		});

		it("resets a cleared number preference to its default on restore", () => {
			onTestFinished(() => {
				vi.unstubAllGlobals();
			});
			vi.stubGlobal(
				"localStorage",
				memoryStorage({
					prunplanner_user: JSON.stringify({
						preferences: {
							...preferenceDefaults,
							// NaN is persisted as null
							burnDaysRed: null,
							burnDaysYellow: 12,
						},
					}),
				})
			);
			const pinia = createPinia().use(piniaPluginPersistedstate);
			createApp({}).use(pinia);
			setActivePinia(pinia);

			const userStore = useUserStore();

			expect(userStore.preferences.burnDaysRed).toBe(
				preferenceDefaults.burnDaysRed
			);
			expect(userStore.preferences.burnDaysYellow).toBe(12);
		});

		it("loads the preferences once per login", async () => {
			const userStore = useUserStore();
			vi.mocked(callUserLogin).mockResolvedValue({
				access: "access",
				refresh: "refresh",
			});
			vi.mocked(callGetProfile).mockResolvedValue({} as UserProfile);
			vi.mocked(callGetUserPreferences).mockResolvedValue(
				preferenceDefaults
			);
			vi.mocked(callGetUserPreferences).mockClear();

			await userStore.performLogin("user", "pw");
			expect(userStore.intialPreferencesCalled).toBe(true);
			expect(callGetUserPreferences).toHaveBeenCalledTimes(1);

			// a second login in the same session does not ask again
			expect(await userStore.performLogin("user", "pw")).toBe("ok");
			expect(callGetUserPreferences).toHaveBeenCalledTimes(1);
		});
	});

	describe("locale", () => {
		const localeKey = "/src/locales/xx_XX/test.json";
		const xx = "xx_XX" as SupportedLocale;

		function fakeComposer(available: string[] = []) {
			const composer = {
				availableLocales: available,
				locale: ref("en_US"),
				setLocaleMessage: vi.fn(),
			};
			return { composer, typed: composer as unknown as AppComposer };
		}

		function addLoader(loader: () => Promise<unknown>) {
			localeLazyLoaders[localeKey] = loader;
			onTestFinished(() => {
				delete localeLazyLoaders[localeKey];
			});
		}

		it("switches to a locale that is already loaded", async () => {
			const userStore = useUserStore();
			const { composer, typed } = fakeComposer(["de_DE"]);

			await userStore.setLocale("de_DE", typed);

			expect(composer.locale.value).toBe("de_DE");
			expect(composer.setLocaleMessage).not.toHaveBeenCalled();
		});

		it("initLocale applies the stored preference", async () => {
			const userStore = useUserStore();
			userStore.setPreference("locale", "de_DE");
			const { composer, typed } = fakeComposer(["de_DE"]);

			await userStore.initLocale(typed);

			expect(composer.locale.value).toBe("de_DE");
		});

		it("logs an error for a locale without message files", async () => {
			const userStore = useUserStore();
			const error = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const { composer, typed } = fakeComposer();

			await userStore.setLocale(xx, typed);

			expect(error).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "No files found for locale: xx_XX",
				})
			);
			expect(composer.locale.value).toBe("en_US");
		});

		it("skips message files without a name", async () => {
			const userStore = useUserStore();
			const unnamed = "/src/locales/xx_XX/.json";
			localeLazyLoaders[unnamed] = async () => ({ a: "b" });
			onTestFinished(() => {
				delete localeLazyLoaders[unnamed];
			});
			const { composer, typed } = fakeComposer();

			await userStore.setLocale(xx, typed);

			expect(composer.setLocaleMessage).toHaveBeenCalledWith("xx_XX", {});
		});

		it("registers the loaded messages and sets the html lang", async () => {
			const userStore = useUserStore();
			addLoader(async () => ({ hello: "Hallo" }));
			const { composer, typed } = fakeComposer();

			await userStore.setLocale(xx, typed);
			await nextTick();

			expect(composer.setLocaleMessage).toHaveBeenCalledWith("xx_XX", {
				test: { hello: "Hallo" },
			});
			expect(composer.locale.value).toBe("xx_XX");
			expect(document.documentElement.getAttribute("lang")).toBe("xx_XX");
		});

		it("warns about, and drops, messages that do not compile", async () => {
			const userStore = useUserStore();
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			addLoader(async () => ({
				broken: "@:{terms.materials}",
				ok: "fine",
			}));
			const { composer, typed } = fakeComposer();

			await userStore.setLocale(xx, typed);

			expect(warn).toHaveBeenCalledWith(
				"Invalid xx_XX messages, using en_US:",
				["test.broken"]
			);
			expect(composer.setLocaleMessage).toHaveBeenCalledWith("xx_XX", {
				test: { ok: "fine" },
			});
		});

		it("keeps the locale when loading its files fails", async () => {
			const userStore = useUserStore();
			const error = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			addLoader(() => Promise.reject(new Error("offline")));
			const { composer, typed } = fakeComposer();

			await userStore.setLocale(xx, typed);

			expect(error).toHaveBeenCalledWith(expect.any(Error));
			expect(composer.locale.value).toBe("en_US");
		});
	});
});
