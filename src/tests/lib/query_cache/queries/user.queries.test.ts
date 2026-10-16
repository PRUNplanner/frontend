import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { userQueries } from "@/lib/query_cache/queries/user.queries";
import { callRegisterUser } from "@/features/api/userData.api";
import {
	callDeleteAPIKey,
	callPostCreateAPIKey,
} from "@/features/api/apiKeysData.api";
import { trackEvent, trackUser } from "@/lib/analytics/useAnalytics";
import { useUserStore } from "@/stores/userStore";

vi.mock("@/lib/analytics/useAnalytics", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: vi.fn(),
	trackUser: vi.fn(),
}));
vi.mock("@/features/api/userData.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/features/api/userData.api")>()),
	callRegisterUser: vi.fn(),
	callPatchUserPreferences: vi.fn(async (prefs) => prefs),
}));

vi.mock("@/features/api/apiKeysData.api", () => ({
	callPostCreateAPIKey: vi.fn(),
	callDeleteAPIKey: vi.fn(),
	callGetAPIKeys: vi.fn(),
}));

const REGISTRATION = {
	username: "foo",
	password: "secret-password",
	email: "foo@example.com",
	planet_id: "OT-580b",
	planet_input: "OT-580b",
};

describe("userQueries analytics", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it("reports a signup once, after the API call succeeded", async () => {
		vi.mocked(callRegisterUser).mockImplementation(async () => {
			expect(trackEvent).not.toHaveBeenCalled();
			return {} as never;
		});

		await userQueries.PostUserRegistration.fetchFn(REGISTRATION);

		expect(vi.mocked(trackEvent).mock.calls).toEqual([
			["account:signup_complete"],
		]);
	});

	it("reports a failed signup with the field names only", async () => {
		vi.mocked(callRegisterUser).mockRejectedValue(
			Object.assign(new Error("400"), {
				responseData: {
					username: ["A user with that username already exists."],
					email: ["Enter a valid email address."],
				},
			})
		);

		await expect(
			userQueries.PostUserRegistration.fetchFn(REGISTRATION)
		).rejects.toThrow();

		expect(vi.mocked(trackEvent).mock.calls).toEqual([
			["account:signup_fail", { fields: ["username", "email"] }],
		]);
	});

	it("hands every field and every message of a 400 to the form", async () => {
		vi.mocked(callRegisterUser).mockRejectedValue(
			Object.assign(new Error("400"), {
				status: 400,
				responseData: {
					username: ["Taken."],
					password: ["Too common.", "Entirely numeric."],
					non_field_errors: "Plain string.",
				},
			})
		);

		const error = await userQueries.PostUserRegistration.fetchFn(
			REGISTRATION
		).catch((e) => e);

		expect(error.status).toBe(400);
		expect(error.fieldErrors).toEqual({
			username: ["Taken."],
			password: ["Too common.", "Entirely numeric."],
			non_field_errors: ["Plain string."],
		});
		expect(error).not.toHaveProperty("validationFields");
		expect(trackEvent).toHaveBeenCalledWith("account:signup_fail", {
			fields: ["username", "password", "non_field_errors"],
		});
	});

	it("hands no field errors to the form on a throttled signup", async () => {
		vi.mocked(callRegisterUser).mockRejectedValue(
			Object.assign(new Error("429"), {
				status: 429,
				responseData: { detail: "Request was throttled." },
			})
		);

		const error = await userQueries.PostUserRegistration.fetchFn(
			REGISTRATION
		).catch((e) => e);

		expect(error.status).toBe(429);
		expect(error).not.toHaveProperty("fieldErrors");
	});

	it("reports a failed signup without an API error body", async () => {
		vi.mocked(callRegisterUser).mockRejectedValue(new Error("Network"));

		await expect(
			userQueries.PostUserRegistration.fetchFn(REGISTRATION)
		).rejects.toThrow();

		expect(trackEvent).toHaveBeenCalledWith("account:signup_fail", {
			fields: [],
		});
	});

	it("reports a created API key", async () => {
		vi.mocked(callPostCreateAPIKey).mockResolvedValue({} as never);

		await userQueries.PostCreateAPIKey.fetchFn({ name: "key" });

		expect(trackEvent).toHaveBeenCalledWith("account:api_key_create");
	});

	it("reports a revoked API key only after the call succeeded", async () => {
		vi.mocked(callDeleteAPIKey).mockRejectedValueOnce(new Error("500"));
		await expect(
			userQueries.DeleteAPIKey.fetchFn({ id: "1" })
		).rejects.toThrow();
		expect(trackEvent).not.toHaveBeenCalledWith("account:api_key_revoke");

		vi.mocked(callDeleteAPIKey).mockResolvedValue(true);
		await userQueries.DeleteAPIKey.fetchFn({ id: "1" });
		expect(trackEvent).toHaveBeenCalledWith("account:api_key_revoke");
	});

	it("sets the preference person properties when they are saved", async () => {
		const userStore = useUserStore();
		userStore.setToken("access", "refresh");

		await userQueries.PatchPreferences.fetchFn({
			...userStore.preferences,
			locale: "de_DE",
			colorPalette: "colorblind",
			layoutNavigationStyle: "collapsed",
			planSuggestions: false,
		} as never);

		expect(trackUser).toHaveBeenCalledWith({
			language: "de_DE",
			color_palette: "colorblind",
			navigation_style: "collapsed",
			is_plan_suggestions_enabled: false,
		});
	});

	it("sets no person properties for a logged out visitor", async () => {
		const userStore = useUserStore();

		await userQueries.PatchPreferences.fetchFn(userStore.preferences);

		expect(trackUser).not.toHaveBeenCalled();
	});
});
