export interface IUserLoginPayload {
	username: string;
	password: string;
}

export interface IUserRefreshPayload {
	refresh: string;
}

export interface IUserTokenResponse {
	access: string;
	refresh: string;
}

export interface IUserRefreshTokenResponse {
	access: string;
}

export interface IUserProfile {
	id: number;
	username: string;
	email: string | null;
	is_email_verified: boolean;
	fio_apikey: string | null;
	prun_username: string | null;
}

export interface IUserProfilePatch {
	fio_apikey: string | null;
	prun_username: string | null;
	email: string | null;
}

export interface IUserChangePasswordPayload {
	old_password: string;
	new_password: string;
}

export interface IUserChangePasswordResponse {
	detail: string;
}

export interface IUserVerifyEmailPayload {
	code: string;
}

export interface IUserVerifyEmailResponse {
	status_code: number;
	message: string;
}

export interface IUserAPIKey {
	name: string;
	key: string;
	created_date: Date;
	last_activity: Date | null;
}

export interface IUserAPIKeyCreatePayload {
	keyname: string;
}

export interface IUserRegistrationPayload {
	username: string;
	password: string;
	email?: string;
	planet_id: string;
	planet_input: string;
}

export interface IUserRegistrationResponse {
	username: string;
}

export interface IUserRequestPasswordResetPayload {
	email: string;
}

export interface IUserRequestPasswordResetResponse {
	detail: string;
}

export interface IUserPasswordResetPayload {
	email: string;
	code: string;
	new_password: string;
}

export interface IUserPasswordResetResponse {
	detail: string;
}

export interface IUserResponseDetail {
	detail: string;
}
