import { describe, expect, it } from "vitest";
import axios from "axios";

// own file: registration is once per module life
describe("axiosSetup: registration", () => {
	// axiosSetup adds the only response interceptor
	const responseInterceptors = () =>
		(
			axios.interceptors.response as unknown as { handlers: unknown[] }
		).handlers.filter(Boolean).length;

	it("comes with the API service, once", async () => {
		expect(responseInterceptors()).toBe(0);

		await import("@/lib/apiService");
		expect(responseInterceptors()).toBe(1);

		(await import("@/util/axiosSetup")).default();
		expect(responseInterceptors()).toBe(1);
	});
});
