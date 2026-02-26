import { z } from "zod";

// Types & Interfaces
import {
	IUserLoginPayload,
	IUserRefreshPayload,
	IUserTokenResponse,
	IUserAPIKey,
	IUserAPIKeyCreatePayload,
	IUserRegistrationPayload,
	IUserRequestPasswordResetResponse,
	IUserRequestPasswordResetPayload,
	IUserPasswordResetPayload,
	IUserRefreshTokenResponse,
	IUserResponseDetail,
	IUserChangePasswordPayload,
	IUserChangePasswordResponse,
	IUserRegistrationResponse,
} from "@/features/api/userData.types";
import { IPreference } from "@/features/preferences/userPreferences.types";

export const LoginPayloadSchema: z.ZodType<IUserLoginPayload> = z.object({
	username: z.string().min(1),
	password: z.string().min(1),
});

export const TokenResponseSchema: z.ZodType<IUserTokenResponse> = z.object({
	access: z.string().min(120),
	refresh: z.string().min(120),
});

export const RefreshPayloadSchema: z.ZodType<IUserRefreshPayload> = z.object({
	refresh: z.string().min(120),
});

export const RefreshTokenResponseSchema: z.ZodType<IUserRefreshTokenResponse> =
	z.object({
		access: z.string().min(120),
	});

export const UserProfilePayloadSchema = z.object({
	id: z.number(),
	username: z.string(),
	email: z
		.string()
		.transform((val) => (val === "" ? null : val))
		.nullable(),
	is_email_verified: z.boolean(),
	fio_apikey: z
		.string()
		.transform((val) => (val === "" ? null : val))
		.nullable(),
	prun_username: z
		.string()
		.transform((val) => (val === "" ? null : val))
		.nullable(),
});

export const UserProfilePatchSchema = z.object({
	fio_apikey: z
		.string()
		.transform((val) => (val === "" || !val ? null : val))
		.nullable(),
	prun_username: z
		.string()
		.transform((val) => (val === "" || !val ? null : val))
		.nullable(),
	email: z
		.string()
		.transform((val) => (val === "" || !val ? null : val))
		.nullable(),
});

export const UserChangePasswordPayloadSchema: z.ZodType<IUserChangePasswordPayload> =
	z.object({
		old_password: z.string(),
		new_password: z.string(),
	});

export const UserChangePasswordResponseSchema: z.ZodType<IUserChangePasswordResponse> =
	z.object({
		detail: z.string(),
	});

export const UserVerifyEmailPayloadSchema = z.object({
	code: z.string(),
});

export const UserVerifyEmailResponseSchema = z.object({
	status_code: z.int(),
	message: z.string(),
});

const UserAPIKeySchema: z.ZodType<IUserAPIKey> = z.object({
	name: z.string(),
	key: z.string(),
	created_date: z.coerce.date(),
	last_activity: z.coerce.date().nullable(),
});

export const UserAPIKeyPayloadSchema: z.ZodType<IUserAPIKey[]> =
	z.array(UserAPIKeySchema);

export const UserAPIKeyCreatePayloadSchema: z.ZodType<IUserAPIKeyCreatePayload> =
	z.object({
		keyname: z.string().min(1).max(100),
	});

export const UserRegistrationPayloadSchema: z.ZodType<IUserRegistrationPayload> =
	z.object({
		username: z.string().min(3),
		password: z.string().min(8),
		email: z.string().optional(),
		planet_id: z.string(),
		planet_input: z.string(),
	});

export const UserRegistrationResponseSchema: z.ZodType<IUserRegistrationResponse> =
	z.object({ username: z.string() });

export const UserRequestPasswordResetPayloadSchema: z.ZodType<IUserRequestPasswordResetPayload> =
	z.object({
		email: z.email(),
	});

export const UserRequestPasswordResetResponseSchema: z.ZodType<IUserRequestPasswordResetResponse> =
	z.object({
		detail: z.string(),
	});

export const UserPasswordResetPayloadSchema: z.ZodType<IUserPasswordResetPayload> =
	z.object({
		email: z.email(),
		code: z.string(),
		new_password: z.string(),
	});

export const UserPasswordResetResponseSchema: z.ZodType<IUserRequestPasswordResetResponse> =
	z.object({
		detail: z.string(),
	});

export const UserPreferenceSchema: z.ZodType<IPreference> = z.object({
	defaultEmpireUuid: z
		.string()
		.nullish()
		.transform((v) => v ?? undefined),
	defaultCXUuid: z
		.string()
		.nullish()
		.transform((v) => v ?? undefined),
	defaultBuyItemsFromCX: z.boolean(),
	burnDaysRed: z.number(),
	burnDaysYellow: z.number(),
	burnResupplyDays: z.number(),
	burnOrigin: z.string(),
	layoutNavigationStyle: z.enum(["full", "collapsed"]),
	planOverrides: z.record(
		z.string(),
		z.object({
			includeCM: z.boolean().optional(),
			visitationMaterialExclusions: z.array(z.string()).optional(),
			autoOptimizeHabs: z.boolean(),
		})
	),
});

export const UserResponseDetailSchema: z.ZodType<IUserResponseDetail> =
	z.object({
		detail: z.string(),
	});

export type UserPreferenceType = z.infer<typeof UserPreferenceSchema>;
export type LoginPayloadType = z.infer<typeof LoginPayloadSchema>;
export type TokenResponseType = z.infer<typeof TokenResponseSchema>;
export type RefreshPayloadType = z.infer<typeof RefreshPayloadSchema>;
export type RefreshTokenResponseType = z.infer<
	typeof RefreshTokenResponseSchema
>;
export type UserProfilePayloadType = z.infer<typeof UserProfilePayloadSchema>;
export type UserProfilePatchPayloadType = z.infer<
	typeof UserProfilePatchSchema
>;
export type UserChangePasswordPayloadType = z.infer<
	typeof UserChangePasswordPayloadSchema
>;
export type UserChangePasswordResponseType = z.infer<
	typeof UserChangePasswordResponseSchema
>;
export type UserVerifyEmailPayloadType = z.infer<
	typeof UserVerifyEmailPayloadSchema
>;
export type UserVerifyEmailResponseType = z.infer<
	typeof UserVerifyEmailResponseSchema
>;
export type UserAPIKeyPayloadType = z.infer<typeof UserAPIKeyPayloadSchema>;
export type UserAPIKeyCreatePayloadType = z.infer<
	typeof UserAPIKeyCreatePayloadSchema
>;
export type UserRegistrationPayloadType = z.infer<
	typeof UserRegistrationPayloadSchema
>;
export type UserRegistrationResponseType = z.infer<
	typeof UserRegistrationResponseSchema
>;
export type UserRequestPasswordResetPayloadType = z.infer<
	typeof UserRequestPasswordResetPayloadSchema
>;
export type UserRequestPasswordResetResponseType = z.infer<
	typeof UserRequestPasswordResetResponseSchema
>;

export type UserPasswordResetPayloadType = z.infer<
	typeof UserPasswordResetPayloadSchema
>;
export type UserPasswordResetResponseType = z.infer<
	typeof UserPasswordResetResponseSchema
>;

export type UserResponseDetailType = z.infer<typeof UserResponseDetailSchema>;
