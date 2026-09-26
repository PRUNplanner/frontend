import { describe, it, expect, vi } from "vitest";

import axios from "axios";

import axiosSetup, { setAxiosHeader } from "@/util/axiosSetup";
import { useUserStore } from "@/stores/userStore";

vi.mock("@/stores/userStore", () => ({
	useUserStore: vi.fn(),
}));
vi.mock("@/router/router", () => ({
	router: { push: vi.fn() },
}));

describe("Axios Header", () => {
	it("Set Authorization Header if accessToken is available", () => {
		const mockUserStore = { accessToken: "mock-token" };
		// @ts-expect-error mock
		useUserStore.mockReturnValue(mockUserStore);

		const config = { headers: {} };

		// @ts-expect-error mock
		const result = setAxiosHeader(config);

		expect(result.headers.Authorization).toBe("Bearer mock-token");
		expect(result.headers.withCredentials).toBe(true);
	});

	it("No Authorization Header if accessToken missing", () => {
		const mockUserStore = { accessToken: undefined };

		// @ts-expect-error mock
		useUserStore.mockReturnValue(mockUserStore);

		const config = { headers: {} };

		// @ts-expect-error mock
		const result = setAxiosHeader(config);

		expect(result.headers.Authorization).toBeUndefined();
		expect(result.headers.withCredentials).toBeUndefined();
	});

	it("Request interceptor rejects on request errors", async () => {
		const requestUse = vi
			.spyOn(axios.interceptors.request, "use")
			.mockReturnValue(0);
		vi.spyOn(axios.interceptors.response, "use").mockReturnValue(0);

		axiosSetup();

		const onRejected = requestUse.mock.calls[0][1]!;
		const error = new Error("request failed");

		await expect(onRejected(error)).rejects.toBe(error);

		vi.restoreAllMocks();
	});
});
