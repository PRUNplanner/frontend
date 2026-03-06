import { apiService } from "@/lib/apiService";

// Schemas
import { z } from "zod";
import {
	LoginPayloadSchema,
	LoginPayloadType,
	TokenResponseSchema,
	TokenResponseType,
	RefreshPayloadType,
	RefreshPayloadSchema,
	UserProfilePayloadType,
	UserProfilePayloadSchema,
	UserProfilePatchPayloadType,
	UserProfilePatchSchema,
	UserChangePasswordPayloadType,
	UserChangePasswordPayloadSchema,
	UserChangePasswordResponseSchema,
	UserChangePasswordResponseType,
	UserVerifyEmailPayloadType,
	UserVerifyEmailPayloadSchema,
	UserRegistrationPayloadType,
	UserRegistrationPayloadSchema,
	UserRequestPasswordResetResponseType,
	UserRequestPasswordResetResponseSchema,
	UserRequestPasswordResetPayloadType,
	UserRequestPasswordResetPayloadSchema,
	UserPasswordResetPayloadType,
	UserPasswordResetResponseType,
	UserPasswordResetPayloadSchema,
	UserPasswordResetResponseSchema,
	RefreshTokenResponseType,
	RefreshTokenResponseSchema,
	UserPreferenceType,
	UserPreferenceSchema,
	UserResponseDetailType,
	UserResponseDetailSchema,
	UserRegistrationResponseType,
	UserRegistrationResponseSchema,
} from "@/features/api/schemas/user.schemas";

// Types & Interfaces
import {
	IUserChangePasswordPayload,
	IUserChangePasswordResponse,
	IUserRequestPasswordResetResponse,
	IUserProfile,
	IUserProfilePatch,
	IUserRegistrationPayload,
	IUserTokenResponse,
	IUserVerifyEmailPayload,
	IUserPasswordResetResponse,
	IUserRefreshTokenResponse,
	IUserResponseDetail,
	IUserRegistrationResponse,
} from "@/features/api/userData.types";
import { IPreference } from "../preferences/userPreferences.types";

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
): Promise<IUserTokenResponse> {
	return apiService.post<LoginPayloadType, TokenResponseType>(
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
 * @returns {Promise<IUserTokenResponse>} Token Response
 */
export async function callRefreshToken(
	refresh_token: string
): Promise<IUserRefreshTokenResponse> {
	return apiService.post<RefreshPayloadType, RefreshTokenResponseType>(
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
 * @returns {Promise<IUserProfile>} User Profile
 */
export async function callGetProfile(): Promise<IUserProfile> {
	return apiService.get<UserProfilePayloadType>(
		"/user/profile/",
		UserProfilePayloadSchema
	);
}

/**
 * Calls the backend Profile endpoint to patch user profile data
 *
 * @author jplacht
 *
 * @export
 * @async
 * @param {IUserProfilePatch} patchProfile Patched profile
 * @returns {Promise<IUserProfile>} Updated user profile
 */
export async function callPatchProfile(
	patchProfile: IUserProfilePatch
): Promise<IUserProfile> {
	return apiService.patch<
		UserProfilePatchPayloadType,
		UserProfilePayloadType
	>(
		"/user/profile/",
		patchProfile,
		UserProfilePatchSchema,
		UserProfilePayloadSchema
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
export async function callResendEmailVerification(): Promise<IUserResponseDetail> {
	return apiService.post<null, UserResponseDetailType>(
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
 * @param {IUserVerifyEmailPayload} postCode Verification code
 * @returns {Promise<IUserVerifyEmailResponse>} Verification status
 */
export async function callVerifyEmail(
	postCode: IUserVerifyEmailPayload
): Promise<IUserResponseDetail> {
	return apiService.post<UserVerifyEmailPayloadType, UserResponseDetailType>(
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
 * @param {IUserChangePasswordPayload} patchPassword Old and New password
 * @returns {Promise<IUserChangePasswordResponse>} Update status message
 */
export async function callChangePassword(
	patchPassword: IUserChangePasswordPayload
): Promise<IUserChangePasswordResponse> {
	return apiService.post<
		UserChangePasswordPayloadType,
		UserChangePasswordResponseType
	>(
		"/user/change_password/",
		patchPassword,
		UserChangePasswordPayloadSchema,
		UserChangePasswordResponseSchema
	);
}

export async function callRegisterUser(
	data: IUserRegistrationPayload
): Promise<IUserRegistrationResponse> {
	return apiService.post<
		UserRegistrationPayloadType,
		UserRegistrationResponseType
	>(
		"/user/signup/",
		data,
		UserRegistrationPayloadSchema,
		UserRegistrationResponseSchema,
		true
	);
}

export async function callRequestPasswordReset(
	email: string
): Promise<IUserRequestPasswordResetResponse> {
	return apiService.post<
		UserRequestPasswordResetPayloadType,
		UserRequestPasswordResetResponseType
	>(
		"/user/request_password_reset/",
		{ email },
		UserRequestPasswordResetPayloadSchema,
		UserRequestPasswordResetResponseSchema
	);
}

export async function callPasswordReset(
	email: string,
	code: string,
	new_password: string
): Promise<IUserPasswordResetResponse> {
	return apiService.post<
		UserPasswordResetPayloadType,
		UserPasswordResetResponseType
	>(
		"/user/password_reset/",
		{ email, code, new_password },
		UserPasswordResetPayloadSchema,
		UserPasswordResetResponseSchema
	);
}

export async function callPatchUserPreferences(
	preferences: IPreference
): Promise<IPreference> {
	return apiService.patch<UserPreferenceType, UserPreferenceType>(
		"/user/preferences/",
		preferences,
		UserPreferenceSchema,
		UserPreferenceSchema
	);
}

export async function callGetUserPreferences(): Promise<IPreference> {
	return apiService.get<UserPreferenceType>(
		"/user/preferences/",
		UserPreferenceSchema
	);
}
