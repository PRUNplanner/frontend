import { i18n } from "@/lib/i18n";
import { trackEvent, trackUser, reportError } from "@/lib/analytics/useAnalytics";
import { isApiError } from "@/lib/apiError";

// Stores
import { useUserStore } from "@/stores/userStore";

// Util
import { setSyncedPreferences } from "@/features/preferences/preferenceSync";
import {
	defineMutation,
	defineQuery,
} from "@/lib/query_cache/queries/queries.util";

// API Calls
import {
	callChangePassword,
	callGetUserPreferences,
	callPasswordReset,
	callPatchProfile,
	callPatchUserPreferences,
	callRegisterUser,
	callRequestPasswordReset,
	callResendEmailVerification,
	callVerifyEmail,
} from "@/features/api/userData.api";
import {
	callDeleteAPIKey,
	callGetAPIKeys,
	callPostCreateAPIKey,
} from "@/features/api/apiKeysData.api";

// Types & Interfaces
import type {
	UserChangePasswordPayload,
	UserPasswordResetPayload,
	UserPreference,
	UserPreferencePatch,
	UserProfile,
	UserProfilePatch,
	UserRegistrationPayload,
	UserRegistrationResponse,
	UserRequestPasswordResetPayload,
	UserResponseDetail,
	UserVerifyEmailPayload,
} from "@/features/api/schemas/user.schemas";
import type {
	APIKey,
	APIKeyCreatePayload,
	APIKeyCreateResponse,
} from "@/features/api/schemas/apiKeysData.schemas";

/**
 * Every preference as a person property: ids only as has_*, per-plan and
 * per-site settings as counts
 */
function trackPreferences(prefs: UserPreference): void {
	trackUser({
		language: prefs.locale,
		color_palette: prefs.colorPalette,
		navigation_style: prefs.layoutNavigationStyle,
		market_card_trigger: prefs.marketCardTrigger,
		is_plan_suggestions_enabled: prefs.planSuggestions,
		has_default_empire: !!prefs.defaultEmpireUuid,
		has_default_cx: !!prefs.defaultCXUuid,
		is_buy_from_cx_default: prefs.defaultBuyItemsFromCX,
		burn_days_red: prefs.burnDaysRed,
		burn_days_yellow: prefs.burnDaysYellow,
		burn_resupply_days: prefs.burnResupplyDays,
		burn_origin: prefs.burnOrigin,
		supply_cart_days: prefs.supplyCartDays,
		fio_repair_interval_days: prefs.fioRepairIntervalDays,
		fio_repair_due_soon_days: prefs.fioRepairDueSoonDays,
		fio_repair_arrival_days: prefs.fioRepairArrivalDays,
		fio_repair_plan_link_count: Object.keys(prefs.fioRepairPlanLinks)
			.length,
		plan_override_count: Object.keys(prefs.planOverrides).length,
		email_nudge_dismissal: prefs.emailNudgeDismissal,
		email_nudge_dismissed_at: prefs.emailNudgeDismissedAt,
	});
}

export const userQueries = {
	// Account
	PostUserRegistration: defineMutation({
		fetchFn: async (
			params: UserRegistrationPayload
		): Promise<UserRegistrationResponse> => {
			try {
				const result = await callRegisterUser(params);
				trackEvent("account:signup_complete");
				return result;
			} catch (error) {
				const apiErrors = isApiError(error)
					? error.responseData
					: undefined;

				// field names only, the values are personal data
				trackEvent("account:signup_fail", {
					fields:
						apiErrors && typeof apiErrors === "object"
							? Object.keys(apiErrors)
							: [],
				});

				// every field and every message, shown at their fields
				if (
					isApiError(error) &&
					error.status === 400 &&
					apiErrors &&
					typeof apiErrors === "object"
				) {
					error.fieldErrors = Object.fromEntries(
						Object.entries(apiErrors).map(([key, messages]) => [
							key,
							Array.isArray(messages)
								? messages.map(String)
								: [String(messages)],
						])
					);
				}

				throw error;
			}
		},
	}),
	PostUserVerifyEmail: defineMutation({
		// the result code: "verified", the backend's error code (invalid,
		// expired, no_code, already_verified), "throttled" or "error". A
		// confirmed account refreshes the profile.
		fetchFn: async (params: UserVerifyEmailPayload): Promise<string> => {
			let result = "verified";
			try {
				await callVerifyEmail(params);
			} catch (err) {
				const data = isApiError(err) ? err.responseData : undefined;
				const code =
					data && typeof data === "object" && "code" in data
						? data.code
						: undefined;
				result =
					isApiError(err) && err.status === 429
						? "throttled"
						: typeof code === "string"
							? code
							: // DRF field error: the code isn't 8 characters
								Array.isArray(code)
								? "invalid"
								: "error";
			}
			if (result === "verified" || result === "already_verified")
				await useUserStore().performGetProfile();
			return result;
		},
	}),
	PostUserResendEmailVerification: defineMutation({
		fetchFn: (): Promise<UserResponseDetail> =>
			callResendEmailVerification(),
	}),
	PostUserRequestPasswordReset: defineMutation({
		fetchFn: (
			params: UserRequestPasswordResetPayload
		): Promise<UserResponseDetail> =>
			callRequestPasswordReset(params.email),
	}),
	PostUserPasswordReset: defineMutation({
		// the backend's detail, or "error" for the caller to translate
		fetchFn: async (
			params: UserPasswordResetPayload
		): Promise<UserResponseDetail | "error"> => {
			try {
				return await callPasswordReset(
					params.email,
					params.code,
					params.new_password
				);
			} catch (err) {
				// throttled: the caller shows its own message
				if (isApiError(err) && err.status === 429) throw err;
				return "error";
			}
		},
	}),
	PatchUserChangePassword: defineMutation({
		// we skip the actual message just to have a boolean
		fetchFn: async (
			params: UserChangePasswordPayload
		): Promise<boolean> => {
			try {
				await callChangePassword(params);
				return true;
			} catch {
				return false;
			}
		},
	}),

	// Profile & preferences
	PatchUserProfile: defineMutation({
		fetchFn: async (params: UserProfilePatch): Promise<UserProfile> => {
			const data = await callPatchProfile(params);
			await useUserStore().performGetProfile();
			return data;
		},
	}),
	GetPreferences: defineQuery({
		key: () => ["user", "profile"],
		fetchFn: async (): Promise<UserPreference> => {
			const userStore = useUserStore();
			const prefs = await callGetUserPreferences();
			Object.assign(userStore.preferences, prefs);
			setSyncedPreferences(prefs);
			userStore.preferencesLoaded = true;
			trackPreferences(userStore.preferences);

			// handle locale
			const userLocale = userStore.preferences.locale || "en_US";
			userStore
				.setLocale(userLocale, i18n.global)
				.catch(reportError);

			return prefs;
		},
		cache: false,
	}),
	PatchPreferences: defineMutation({
		fetchFn: async (
			patch: UserPreferencePatch
		): Promise<UserPreference | undefined> => {
			const userStore = useUserStore();
			// dont try to patch if not logged in, d'oh!
			if (!userStore.isLoggedIn) return undefined;

			// the patch is taken from the store, which holds every key: a
			// patch carries only the changed plans and sites
			trackPreferences(userStore.preferences);
			return callPatchUserPreferences(patch);
		},
	}),

	// API keys
	GetAPIKeys: defineQuery({
		key: () => ["user", "api", "keys"],
		fetchFn: (): Promise<APIKey[]> => callGetAPIKeys(),
		cache: false,
	}),
	PostCreateAPIKey: defineMutation({
		fetchFn: async (
			params: APIKeyCreatePayload
		): Promise<APIKeyCreateResponse> => {
			const key = await callPostCreateAPIKey(params.name);
			trackEvent("account:api_key_create");
			return key;
		},
	}),
	DeleteAPIKey: defineMutation({
		fetchFn: async (params: { id: string }): Promise<void> => {
			await callDeleteAPIKey(params.id);
			trackEvent("account:api_key_revoke");
		},
	}),
};
