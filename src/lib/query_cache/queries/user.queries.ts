import { Composer } from "vue-i18n";

import { i18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Stores
import { useUserStore } from "@/stores/userStore";

// Util
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
import {
	IUserChangePasswordPayload,
	IUserPasswordResetPayload,
	IUserPasswordResetResponse,
	IUserProfile,
	IUserProfilePatch,
	IUserRegistrationPayload,
	IUserRegistrationResponse,
	IUserRequestPasswordResetPayload,
	IUserRequestPasswordResetResponse,
	IUserResponseDetail,
	IUserVerifyEmailPayload,
} from "@/features/api/userData.types";
import { IPreference } from "@/features/preferences/userPreferences.types";
import {
	APIKeyCreatePayloadType,
	APIKeyCreateResponseType,
	APIKeyListType,
} from "@/features/api/schemas/apiKeysData.schema";

export const userQueries = {
	// Account
	PostUserRegistration: defineQuery({
		key: () => ["user", "account", "registration"],
		fetchFn: async (
			params: IUserRegistrationPayload
		): Promise<IUserRegistrationResponse> => {
			trackEvent("user_registration", {
				username: params.username,
			});
			try {
				return await callRegisterUser(params);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (error: any) {
				const apiErrors = error.responseData;

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
		fetchFn: async (params: IUserVerifyEmailPayload): Promise<boolean> => {
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
		fetchFn: (): Promise<IUserResponseDetail> =>
			callResendEmailVerification(),
		persist: false,
	}),
	PostUserRequestPasswordReset: defineQuery({
		key: () => ["user", "account", "request_password_reset"],
		fetchFn: (
			params: IUserRequestPasswordResetPayload
		): Promise<IUserRequestPasswordResetResponse> =>
			callRequestPasswordReset(params.email),
		persist: false,
	}),
	PostUserPasswordReset: defineQuery({
		key: () => ["user", "account", "password_reset"],
		fetchFn: async (
			params: IUserPasswordResetPayload
		): Promise<IUserPasswordResetResponse> => {
			try {
				return await callPasswordReset(
					params.email,
					params.code,
					params.new_password
				);
			} catch {
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
		fetchFn: async (params: IUserChangePasswordPayload): Promise<boolean> => {
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
		fetchFn: async (params: IUserProfilePatch): Promise<IUserProfile> => {
			const data = await callPatchProfile(params);
			await useUserStore().performGetProfile();
			return data;
		},
		persist: false,
	}),
	GetPreferences: defineQuery({
		key: () => ["user", "profile"],
		fetchFn: async (): Promise<IPreference> => {
			const userStore = useUserStore();
			const prefs = await callGetUserPreferences();
			Object.assign(userStore.preferences, prefs);

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
		fetchFn: async (prefs: IPreference): Promise<IPreference | undefined> => {
			// dont try to patch if not logged in, d'oh!
			if (!useUserStore().isLoggedIn) return undefined;

			return callPatchUserPreferences(prefs);
		},
		persist: false,
	}),

	// API keys
	GetAPIKeys: defineQuery({
		key: () => ["user", "api", "keys"],
		fetchFn: (): Promise<APIKeyListType> => callGetAPIKeys(),
		persist: false,
	}),
	PostCreateAPIKey: defineQuery({
		key: () => ["user", "api", "keys", "create"],
		fetchFn: (
			params: APIKeyCreatePayloadType
		): Promise<APIKeyCreateResponseType> =>
			callPostCreateAPIKey(params.name),
		persist: false,
	}),
	DeleteAPIKey: defineQuery({
		key: (params) => ["user", "api", "keys", "delete", params.id],
		fetchFn: (params: { id: string }): Promise<boolean> =>
			callDeleteAPIKey(params.id),
		persist: false,
	}),
};
