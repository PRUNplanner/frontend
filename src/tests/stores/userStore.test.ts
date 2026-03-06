import { setActivePinia, createPinia } from "pinia";
import { beforeEach, describe, it, expect, vi } from "vitest";

import {
	callUserLogin,
	callRefreshToken,
	callGetProfile,
} from "@/features/api/userData.api";

import { useUserStore } from "@/stores/userStore";
import { preferenceDefaults } from "@/features/preferences/userDefaults";
import { IUserProfile } from "@/features/api/userData.types";

vi.mock("@/features/api/userData.api", () => ({
	callUserLogin: vi.fn(),
	callRefreshToken: vi.fn(),
	callGetProfile: vi.fn(),
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
			async ({ profile, expected, description }) => {
				const userStore = useUserStore();
				userStore.profile = profile;

				expect(userStore.hasFIO).toBe(expected);
			}
		);
	});

	describe("performGetProfile", async () => {
		it("fio enabled", async () => {
			const mockProfile: IUserProfile = {
				id: 1,
				username: "johndoe",
				email: "a@b.com",
				is_email_verified: true,
				fio_apikey: "foo",
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

		it("fio not enabled", async () => {
			const mockProfile: IUserProfile = {
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

			// clear a preference
			userStore.clearPlanPreference("foo");

			expect(userStore.getPlanPreference("foo").includeCM).toBe(
				preferenceDefaults.planDefaults.includeCM
			);
		});
	});
});
