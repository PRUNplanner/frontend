import { describe, it, expect } from "vitest";

import { ApiError, ApiValidationError, isApiError } from "@/lib/apiError";

describe("isApiError", () => {
	it("is true for a response error, also without a status value", () => {
		expect(isApiError(Object.assign(new ApiError("x"), { status: 500 }))).toBe(
			true
		);
		expect(
			isApiError(Object.assign(new ApiError("x"), { status: undefined }))
		).toBe(true);
	});

	it("accepts a plain Error carrying a status", () => {
		expect(isApiError(Object.assign(new Error("x"), { status: 429 }))).toBe(
			true
		);
	});

	it("is false for validation errors, other errors and non-errors", () => {
		const validation = new ApiValidationError("Validation error: x");
		expect(isApiError(validation)).toBe(false);
		expect("status" in validation).toBe(false);
		expect(validation).toBeInstanceOf(ApiError);
		expect(validation.name).toBe("ApiValidationError");
		expect(isApiError(new Error("x"))).toBe(false);
		expect(isApiError({ status: 500 })).toBe(false);
		expect(isApiError(null)).toBe(false);
	});
});
