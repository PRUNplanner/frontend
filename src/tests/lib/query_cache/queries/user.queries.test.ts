import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { userQueries } from "@/lib/query_cache/queries/user.queries";
import {
	callPasswordReset,
	callRegisterUser,
	callVerifyEmail,
} from "@/features/api/userData.api";
import { ApiError } from "@/lib/apiError";
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
	callVerifyEmail: vi.fn(),
	callPasswordReset: vi.fn(),
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
				status: 400,
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

		vi.mocked(callDeleteAPIKey).mockResolvedValue(undefined);
		await userQueries.DeleteAPIKey.fetchFn({ id: "1" });
		expect(trackEvent).toHaveBeenCalledWith("account:api_key_revoke");
	});

	it("sets the preference person properties when they are saved", async () => {
		const userStore = useUserStore();
		userStore.setToken("access", "refresh");

		Object.assign(userStore.preferences, {
			locale: "de_DE",
			colorPalette: "colorblind",
			layoutNavigationStyle: "collapsed",
			marketCardTrigger: "click",
			planSuggestions: false,
			defaultEmpireUuid: "empire-uuid",
			defaultCXUuid: undefined,
			defaultBuyItemsFromCX: false,
			burnDaysRed: 3,
			burnDaysYellow: 8,
			burnResupplyDays: 25,
			burnOrigin: "Moria Station Warehouse",
			supplyCartDays: 14,
			fioRepairIntervalDays: 90,
			fioRepairDueSoonDays: 5,
			fioRepairArrivalDays: 1,
			fioRepairPlanLinks: { a: { planUuid: null }, b: { planUuid: "p" } },
			planOverrides: { "plan-a": {} },
			emailNudgeDismissal: "later",
			emailNudgeDismissedAt: "2026-10-01T00:00:00Z",
		});

		// the patch holds only what changed, the store everything
		await userQueries.PatchPreferences.fetchFn({ locale: "de_DE" });

		expect(trackUser).toHaveBeenCalledWith({
			language: "de_DE",
			color_palette: "colorblind",
			navigation_style: "collapsed",
			market_card_trigger: "click",
			is_plan_suggestions_enabled: false,
			has_default_empire: true,
			has_default_cx: false,
			is_buy_from_cx_default: false,
			burn_days_red: 3,
			burn_days_yellow: 8,
			burn_resupply_days: 25,
			burn_origin: "Moria Station Warehouse",
			supply_cart_days: 14,
			fio_repair_interval_days: 90,
			fio_repair_due_soon_days: 5,
			fio_repair_arrival_days: 1,
			fio_repair_plan_link_count: 2,
			plan_override_count: 1,
			email_nudge_dismissal: "later",
			email_nudge_dismissed_at: "2026-10-01T00:00:00Z",
		});
	});

	it("sets no person properties for a logged out visitor", async () => {
		const userStore = useUserStore();

		await userQueries.PatchPreferences.fetchFn(userStore.preferences);

		expect(trackUser).not.toHaveBeenCalled();
	});
});

function apiError(status: number, responseData?: unknown): ApiError {
	return Object.assign(new ApiError(String(status)), { status, responseData });
}

describe("userQueries error codes", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it.each([
		[apiError(429), "throttled"],
		[apiError(400, { code: "expired" }), "expired"],
		[apiError(400, { code: ["Ensure this field has 8 characters."] }), "invalid"],
		[apiError(500), "error"],
		[new Error("Network"), "error"],
	])("maps a failed email verification to a code", async (err, code) => {
		vi.mocked(callVerifyEmail).mockRejectedValue(err);
		expect(
			await userQueries.PostUserVerifyEmail.fetchFn({ code: "12345678" })
		).toBe(code);
	});

	it("returns an error code for a failed password reset", async () => {
		vi.mocked(callPasswordReset).mockRejectedValue(apiError(400));
		expect(
			await userQueries.PostUserPasswordReset.fetchFn({
				email: "foo@example.com",
				code: "12345678",
				new_password: "secret-password",
			})
		).toBe("error");
	});

	it("rethrows a throttled password reset", async () => {
		vi.mocked(callPasswordReset).mockRejectedValue(apiError(429));
		await expect(
			userQueries.PostUserPasswordReset.fetchFn({
				email: "foo@example.com",
				code: "12345678",
				new_password: "secret-password",
			})
		).rejects.toMatchObject({ status: 429 });
	});
});
