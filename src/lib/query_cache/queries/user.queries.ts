import type { Composer } from "vue-i18n";

import { i18n } from "@/lib/i18n";
import { trackEvent, trackUser } from "@/lib/analytics/useAnalytics";

// Stores
import { useUserStore } from "@/stores/userStore";

// Util
import { setSyncedPreferences } from "@/features/preferences/preferenceSync";
import { defineQuery } from "@/lib/query_cache/queries/queries.util";

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
 * Person properties of the preferences worth segmenting by
 */
function trackPreferences(prefs: UserPreference): void {
	trackUser({
		language: prefs.locale,
		color_palette: prefs.colorPalette,
		navigation_style: prefs.layoutNavigationStyle,
		is_plan_suggestions_enabled: prefs.planSuggestions,
	});
}

export const userQueries = {
	// Account
	PostUserRegistration: defineQuery({
		key: () => ["user", "account", "registration"],
		fetchFn: async (
			params: UserRegistrationPayload
		): Promise<UserRegistrationResponse> => {
			try {
				const result = await callRegisterUser(params);
				trackEvent("account:signup_complete");
				return result;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (error: any) {
				const apiErrors = error.responseData;

				// field names only, the values are personal data
				trackEvent("account:signup_fail", {
					fields:
						apiErrors && typeof apiErrors === "object"
							? Object.keys(apiErrors)
							: [],
				});

				if (apiErrors && typeof apiErrors === "object") {
					const firstKey = Object.keys(apiErrors)[0];
					const messages = apiErrors[firstKey];
					const userFriendlyMessage = Array.isArray(messages)
						? messages[0]
						: messages;

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(error as any).validationFields = userFriendlyMessage;
				}

				throw error;
			}
		},
		persist: false,
	}),
	PostUserVerifyEmail: defineQuery({
		key: () => ["user", "verification", "check"],
		fetchFn: async (params: UserVerifyEmailPayload): Promise<boolean> => {
			try {
				await callVerifyEmail(params);
				return true;
			} catch {
				return false;
			}
		},
		persist: false,
	}),
	PostUserResendEmailVerification: defineQuery({
		key: () => ["user", "verification", "resend"],
		fetchFn: (): Promise<UserResponseDetail> =>
			callResendEmailVerification(),
		persist: false,
	}),
	PostUserRequestPasswordReset: defineQuery({
		key: () => ["user", "account", "request_password_reset"],
		fetchFn: (
			params: UserRequestPasswordResetPayload
		): Promise<UserResponseDetail> =>
			callRequestPasswordReset(params.email),
		persist: false,
	}),
	PostUserPasswordReset: defineQuery({
		key: () => ["user", "account", "password_reset"],
		fetchFn: async (
			params: UserPasswordResetPayload
		): Promise<UserResponseDetail> => {
			try {
				return await callPasswordReset(
					params.email,
					params.code,
					params.new_password
				);
			} catch (err) {
				// throttled: the caller shows its own message
				if ((err as { status?: number }).status === 429) throw err;
				return {
					detail: "An error occured. Check your Email, Code and Password. Make sure your password is secure.",
				};
			}
		},
		persist: false,
	}),
	PatchUserChangePassword: defineQuery({
		key: () => ["user", "password", "patch"],
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
		persist: false,
	}),

	// Profile & preferences
	PatchUserProfile: defineQuery({
		key: () => ["user", "profile", "patch"],
		fetchFn: async (params: UserProfilePatch): Promise<UserProfile> => {
			const data = await callPatchProfile(params);
			await useUserStore().performGetProfile();
			return data;
		},
		persist: false,
	}),
	GetPreferences: defineQuery({
		key: () => ["user", "profile"],
		fetchFn: async (): Promise<UserPreference> => {
			const userStore = useUserStore();
			const prefs = await callGetUserPreferences();
			Object.assign(userStore.preferences, prefs);
			setSyncedPreferences(prefs);
			trackPreferences(userStore.preferences);

			// handle locale
			const userLocale = userStore.preferences.locale || "en_US";
			userStore
				.setLocale(userLocale, i18n.global as unknown as Composer)
				.catch(console.error);

			return prefs;
		},
		persist: false,
	}),
	PatchPreferences: defineQuery({
		key: () => ["user", "preferences", "patch"],
		fetchFn: async (
			patch: UserPreferencePatch
		): Promise<UserPreference | undefined> => {
			const userStore = useUserStore();
			// dont try to patch if not logged in, d'oh!
			if (!userStore.isLoggedIn) return undefined;

			trackPreferences({
				...userStore.preferences,
				...patch,
			} as UserPreference);
			return callPatchUserPreferences(patch);
		},
		persist: false,
	}),

	// API keys
	GetAPIKeys: defineQuery({
		key: () => ["user", "api", "keys"],
		fetchFn: (): Promise<APIKey[]> => callGetAPIKeys(),
		persist: false,
	}),
	PostCreateAPIKey: defineQuery({
		key: () => ["user", "api", "keys", "create"],
		fetchFn: async (
			params: APIKeyCreatePayload
		): Promise<APIKeyCreateResponse> => {
			const key = await callPostCreateAPIKey(params.name);
			trackEvent("account:api_key_create");
			return key;
		},
		persist: false,
	}),
	DeleteAPIKey: defineQuery({
		key: (params) => ["user", "api", "keys", "delete", params.id],
		fetchFn: (params: { id: string }): Promise<boolean> =>
			callDeleteAPIKey(params.id),
		persist: false,
	}),
};
