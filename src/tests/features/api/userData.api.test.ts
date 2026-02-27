import { describe, it, expect, vi } from "vitest";

import { apiService } from "@/lib/apiService";
import {
	callChangePassword,
	callGetProfile,
	callPasswordReset,
	callPatchProfile,
	callRefreshToken,
	callRegisterUser,
	callRequestPasswordReset,
	callResendEmailVerification,
	callUserLogin,
	callVerifyEmail,
} from "@/features/api/userData.api";
import {
	LoginPayloadSchema,
	TokenResponseSchema,
	UserChangePasswordPayloadSchema,
	UserChangePasswordResponseSchema,
	UserProfilePatchSchema,
	UserProfilePayloadSchema,
} from "@/features/api/schemas/user.schemas";

vi.mock("@/lib/apiService", () => ({
	apiService: {
		post: vi.fn(),
		get: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	},
}));

describe("Feature: Account", () => {
	it("callUserLogin: Calls API Service and gets correct response", async () => {
		const mockUsername = "testuser";
		const mockPassword = "testpassword";
		const mockResponse = {
			access_token: "mockAccessToken",
			refresh_token: "mockRefreshToken",
		};

		// @ts-expect-error - mock post typing
		apiService.post.mockResolvedValue(mockResponse);

		const result = await callUserLogin(mockUsername, mockPassword);

		expect(apiService.post).toHaveBeenCalledWith(
			"/user/login/",
			{ username: mockUsername, password: mockPassword },
			LoginPayloadSchema,
			TokenResponseSchema,
			true
		);

		expect(result).toEqual(mockResponse);
	});

	it("callRefreshToken: Calls API Service and gets correct response", async () => {
		const mockRefreshToken = "123";
		const mockResponse = {
			refresh_token: "mockRefreshToken",
		};

		// @ts-expect-error - mock post typing
		apiService.post.mockResolvedValue(mockResponse);

		const result = await callRefreshToken(mockRefreshToken);

		expect(apiService.post).toHaveBeenCalled();

		expect(result).toEqual(mockResponse);
	});

	it("callGetProfile: Calls API Service and gets correct response", async () => {
		const mockResponse = {
			id: 1,
			username: "foo",
			email: "",
			is_email_verified: true,
			fio_apikey: "foo@moo.de",
			prun_username: "foo",
		};

		// @ts-expect-error - mock post typing
		apiService.get.mockResolvedValue(mockResponse);

		const result = await callGetProfile();

		expect(apiService.get).toHaveBeenCalledWith(
			"/user/profile/",
			UserProfilePayloadSchema
		);

		expect(result).toEqual(mockResponse);
	});

	it("callPatchProfile: Calls API Service and gets correct response", async () => {
		const mockResponse = {
			email: "",
			fio_apikey: "foo@moo.de",
			prun_username: "foo",
		};

		// @ts-expect-error - mock post typing
		apiService.patch.mockResolvedValue(mockResponse);

		const result = await callPatchProfile(mockResponse);

		expect(apiService.patch).toHaveBeenCalledWith(
			"/user/profile/",
			mockResponse,
			UserProfilePatchSchema,
			UserProfilePayloadSchema
		);

		expect(result).toEqual(mockResponse);
	});

	it("callResendEmailVerification: Calls API Service and gets correct response", async () => {
		// @ts-expect-error - mock post typing
		apiService.post.mockResolvedValue(true);

		const result = await callResendEmailVerification();
		expect(result).toEqual(true);
	});

	it("callChangePassword: Calls API Service and gets correct response", async () => {
		const mockResponse = {
			message: "foo",
		};

		// @ts-expect-error - mock post typing
		apiService.post.mockResolvedValue(mockResponse);

		const result = await callChangePassword({
			old_password: "moo",
			new_password: "foo",
		});

		expect(apiService.post).toHaveBeenCalledWith(
			"/user/change_password/",
			{ old_password: "moo", new_password: "foo" },
			UserChangePasswordPayloadSchema,
			UserChangePasswordResponseSchema
		);

		expect(result).toEqual(mockResponse);
	});
	it("callVerifyEmail: Calls API Service and gets correct response", async () => {
		const mockResponse = {
			detail: "foo",
		};

		// @ts-expect-error - mock post typing
		apiService.post.mockResolvedValue(mockResponse);

		const result = await callVerifyEmail({ code: "moo" });

		expect(apiService.post).toHaveBeenCalled();

		expect(result).toEqual(mockResponse);
	});

	it("callRegisterUser: Calls API Service and gets correct response", async () => {
		const mockResponse = {
			user_id: 1,
			username: "foo",
			email: "",
			email_verified: true,
			fio_apikey: "foo@moo.de",
			prun_username: "foo",
			last_login: new Date(),
			last_action: new Date(),
		};

		// @ts-expect-error - mock post typing
		apiService.post.mockResolvedValue(mockResponse);

		const result = await callRegisterUser({
			username: "foo",
			password: "moo",
			planet_input: "1",
			planet_id: "2",
		});

		expect(result).toEqual(mockResponse);
	});

	it("callRequestPasswordReset: Calls API Service and gets correct response", async () => {
		const mockResponse = {
			status_code: 200,
			message: "foo",
		};

		// @ts-expect-error - mock post typing
		apiService.post.mockResolvedValue(mockResponse);

		const result = await callRequestPasswordReset("foo@moo.de");

		expect(result).toEqual(mockResponse);
	});

	it("callRequestPasswordReset: Calls API Service and gets correct response", async () => {
		const mockResponse = {
			status_code: 200,
			message: "foo",
		};

		// @ts-expect-error - mock post typing
		apiService.post.mockResolvedValue(mockResponse);

		const result = await callPasswordReset("foo@moo.de", "foo", "moo");

		expect(result).toEqual(mockResponse);
	});
});
