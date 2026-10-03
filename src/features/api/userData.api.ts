import { apiService } from "@/lib/apiService";

// Schemas
import { z } from "zod";
import {
	LoginPayloadSchema,
	TokenResponseSchema,
	RefreshPayloadSchema,
	UserProfileSchema,
	UserProfilePatchSchema,
	UserChangePasswordPayloadSchema,
	UserResponseDetailSchema,
	UserVerifyEmailPayloadSchema,
	UserRegistrationPayloadSchema,
	UserRequestPasswordResetPayloadSchema,
	UserPasswordResetPayloadSchema,
	RefreshTokenResponseSchema,
	UserPreferencePatchSchema,
	UserPreferenceSchema,
	UserRegistrationResponseSchema,
} from "@/features/api/schemas/user.schemas";

// Types & Interfaces
import type {
	RefreshTokenResponse,
	TokenResponse,
	UserChangePasswordPayload,
	UserPreference,
	UserPreferencePatch,
	UserProfile,
	UserProfilePatch,
	UserRegistrationPayload,
	UserRegistrationResponse,
	UserResponseDetail,
	UserVerifyEmailPayload,
} from "@/features/api/schemas/user.schemas";

/**
 * Calls the backends Login endpoint to return Token
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} username Username Plain
 * @param {string} password Password Plain
 * @returns {Promise<Account.ILoginResponse>} Token Response
 */
export async function callUserLogin(
	username: string,
	password: string
): Promise<TokenResponse> {
	return apiService.post(
		"/user/login/",
		{
			username,
			password,
		},
		LoginPayloadSchema,
		TokenResponseSchema,
		true
	);
}

/**
 * Calls the backends Token refresh endpoint to fetch new
 * access and refresh tokens
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} refresh_token Current Refresh Token
 * @returns {Promise<TokenResponse>} Token Response
 */
export async function callRefreshToken(
	refresh_token: string
): Promise<RefreshTokenResponse> {
	return apiService.post(
		"/user/refresh/",
		{
			refresh: refresh_token,
		},
		RefreshPayloadSchema,
		RefreshTokenResponseSchema,
		true
	);
}

/**
 * Calls the backends Profile endpoint to fetch users profile
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<UserProfile>} User Profile
 */
export async function callGetProfile(): Promise<UserProfile> {
	return apiService.get("/user/profile/", UserProfileSchema);
}

/**
 * Calls the backend Profile endpoint to patch user profile data
 *
 * @author jplacht
 *
 * @export
 * @async
 * @param {UserProfilePatch} patchProfile Patched profile
 * @returns {Promise<UserProfile>} Updated user profile
 */
export async function callPatchProfile(
	patchProfile: UserProfilePatch
): Promise<UserProfile> {
	return apiService.patch(
		"/user/profile/",
		patchProfile,
		UserProfilePatchSchema,
		UserProfileSchema
	);
}

/**
 * Calls the backend to trigger another send of the email
 * verification email containing the verification code
 *
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<boolean>} Request Status
 */
export async function callResendEmailVerification(): Promise<UserResponseDetail> {
	return apiService.post(
		"/user/request_email_verification/",
		null,
		z.null(),
		UserResponseDetailSchema
	);
}

/**
 * Calls the backend and transmits an email verification code which is
 * then checked and the check status returned.
 *
 * @author jplacht
 *
 * @export
 * @async
 * @param {UserVerifyEmailPayload} postCode Verification code
 * @returns {Promise<UserResponseDetail>} Verification status
 */
export async function callVerifyEmail(
	postCode: UserVerifyEmailPayload
): Promise<UserResponseDetail> {
	return apiService.post(
		"/user/verify_email/",
		postCode,
		UserVerifyEmailPayloadSchema,
		UserResponseDetailSchema
	);
}

/**
 * Calls the backend with the current (old) and to be updated
 * password (new) to change the users password.
 *
 * @author jplacht
 *
 * @export
 * @async
 * @param {UserChangePasswordPayload} patchPassword Old and New password
 * @returns {Promise<UserResponseDetail>} Update status message
 */
export async function callChangePassword(
	patchPassword: UserChangePasswordPayload
): Promise<UserResponseDetail> {
	return apiService.post(
		"/user/change_password/",
		patchPassword,
		UserChangePasswordPayloadSchema,
		UserResponseDetailSchema
	);
}

export async function callRegisterUser(
	data: UserRegistrationPayload
): Promise<UserRegistrationResponse> {
	return apiService.post(
		"/user/signup/",
		data,
		UserRegistrationPayloadSchema,
		UserRegistrationResponseSchema,
		true
	);
}

export async function callRequestPasswordReset(
	email: string
): Promise<UserResponseDetail> {
	return apiService.post(
		"/user/request_password_reset/",
		{ email },
		UserRequestPasswordResetPayloadSchema,
		UserResponseDetailSchema
	);
}

export async function callPasswordReset(
	email: string,
	code: string,
	new_password: string
): Promise<UserResponseDetail> {
	return apiService.post(
		"/user/password_reset/",
		{ email, code, new_password },
		UserPasswordResetPayloadSchema,
		UserResponseDetailSchema
	);
}

export async function callPatchUserPreferences(
	preferences: UserPreferencePatch
): Promise<UserPreference> {
	return apiService.patch(
		"/user/preferences/",
		preferences,
		UserPreferencePatchSchema,
		UserPreferenceSchema
	);
}

export async function callGetUserPreferences(): Promise<UserPreference> {
	return apiService.get("/user/preferences/", UserPreferenceSchema);
}
