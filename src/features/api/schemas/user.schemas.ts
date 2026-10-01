import { z } from "zod";

import { SUPPORTED_LOCALES } from "@/lib/i18n";

export const LoginPayloadSchema = z.object({
	username: z.string().min(1),
	password: z.string().min(1),
});

export const TokenResponseSchema = z.object({
	access: z.string().min(120),
	refresh: z.string().min(120),
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

export const RefreshPayloadSchema = TokenResponseSchema.pick({ refresh: true });

export const RefreshTokenResponseSchema = TokenResponseSchema.pick({
	access: true,
});
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;

export const UserProfileSchema = z.object({
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
export type UserProfile = z.infer<typeof UserProfileSchema>;

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
export type UserProfilePatch = z.input<typeof UserProfilePatchSchema>;

export const UserResponseDetailSchema = z.object({
	detail: z.string(),
});
export type UserResponseDetail = z.infer<typeof UserResponseDetailSchema>;

export const UserChangePasswordPayloadSchema = z.object({
	old_password: z.string(),
	new_password: z.string(),
});
export type UserChangePasswordPayload = z.input<
	typeof UserChangePasswordPayloadSchema
>;

export const UserVerifyEmailPayloadSchema = z.object({
	code: z.string(),
});
export type UserVerifyEmailPayload = z.input<
	typeof UserVerifyEmailPayloadSchema
>;

export const UserRegistrationPayloadSchema = z.object({
	username: z.string().min(3),
	password: z.string().min(8),
	email: z.string().optional(),
	planet_id: z.string(),
	planet_input: z.string(),
});
export type UserRegistrationPayload = z.input<
	typeof UserRegistrationPayloadSchema
>;

export const UserRegistrationResponseSchema = z.object({
	username: z.string(),
});
export type UserRegistrationResponse = z.infer<
	typeof UserRegistrationResponseSchema
>;

export const UserRequestPasswordResetPayloadSchema = z.object({
	email: z.email(),
});
export type UserRequestPasswordResetPayload = z.input<
	typeof UserRequestPasswordResetPayloadSchema
>;

export const UserPasswordResetPayloadSchema =
	UserRequestPasswordResetPayloadSchema.extend({
		code: z.string(),
		new_password: z.string(),
	});
export type UserPasswordResetPayload = z.input<
	typeof UserPasswordResetPayloadSchema
>;

const PreferencePerPlanSchema = z.object({
	includeCM: z.boolean().optional(),
	visitationMaterialExclusions: z.array(z.string()).optional(),
	autoOptimizeHabs: z.boolean(),
	// building ticker → count already built on the planet
	constructionBuilt: z.record(z.string(), z.number().int().min(0)).optional(),
});
export type PreferencePerPlan = z.infer<typeof PreferencePerPlanSchema>;

export const UserPreferenceSchema = z.object({
	locale: z
		.preprocess((val) => val ?? "en_US", z.enum(SUPPORTED_LOCALES))
		.catch("en_US"),
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
	supplyCartDays: z.number(),
	layoutNavigationStyle: z.enum(["full", "collapsed"]).catch("full"),
	colorPalette: z.enum(["default", "colorblind"]).catch("default"),
	planOverrides: z
		.record(z.string(), PreferencePerPlanSchema)
		.nullable()
		.transform((v) => v ?? {}),
});
export type UserPreference = z.infer<typeof UserPreferenceSchema>;

// PATCH merges into the stored preferences, an unset uuid must be sent as
// null to clear it (undefined is dropped from the JSON body)
export const UserPreferencePayloadSchema = UserPreferenceSchema.extend({
	defaultEmpireUuid: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	defaultCXUuid: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
});
