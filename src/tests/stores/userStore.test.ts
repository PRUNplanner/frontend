import { createApp, nextTick } from "vue";
import { setActivePinia, createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { beforeEach, describe, it, expect, onTestFinished, vi } from "vitest";

import {
	callUserLogin,
	callRefreshToken,
	callGetProfile,
} from "@/features/api/userData.api";

import { useUserStore } from "@/stores/userStore";
import { memoryStorage } from "@/tests/memoryStorage";
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

	it("Logout: the next login loads its own profile and preferences", () => {
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
		expect(getProfile).toHaveBeenCalledTimes(2);
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

		expect(result).toBe(true);
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

		expect(result).toBe(false);
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

	it("Perform Token Refresh: API Error", async () => {
		const userStore = useUserStore();

		const mockToken = "testtoken";

		userStore.refreshToken = mockToken;

		(
			callRefreshToken as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("Mock login error"));
		(
			callGetProfile as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({});

		const result = await userStore.performTokenRefresh();
		expect(callRefreshToken).toHaveBeenCalledWith(mockToken);

		expect(result).toBe(false);
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
		const hasFIOCases = [
			{
				profile: {
					id: 1,
					username: "test",
					email: null,
					is_email_verified: false,
					fio_apikey: "foo",
					prun_username: "moo",
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
			onTestFinished(() => vi.unstubAllGlobals());
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
	});
});
