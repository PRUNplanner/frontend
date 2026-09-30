import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { z } from "zod";
import { apiService } from "@/lib/apiService";
import AxiosMockAdapter from "axios-mock-adapter";
import axiosSetup from "@/util/axiosSetup";
import { createPinia, setActivePinia } from "pinia";
import { CanceledError } from "axios";
import { trackException } from "@/lib/analytics/useAnalytics";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackException: vi.fn(),
	trackContext: vi.fn(),
}));

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

describe("ApiService", () => {
	beforeAll(() => {
		setActivePinia(createPinia());
		axiosSetup();
	});

	describe("setup", () => {
		it("service defined", () => {
			expect(apiService).toBeDefined();
			expect(apiService.get).toBeDefined();
			expect(apiService.post).toBeDefined();
		});
	});

	describe("error normalization", async () => {
		it("get: wrong response schema", async () => {
			const mockDataWrong = { foo: "moo" };
			const responseSchema = z.object({
				id: z.number(),
				name: z.string(),
			});

			mock.onGet("/test").reply(200, mockDataWrong);

			await expect(
				apiService.get("/test", responseSchema)
			).rejects.toThrowError();
		});

		it("post: generic error", async () => {
			const mockPayload = { foo: "moo" };
			const payloadSchema = z.object({ foo: z.string() });

			const responseSchema = z.object({ moo: z.string() });

			mock.onPost("/test").timeout();

			await expect(
				apiService.post(
					"/test",
					mockPayload,
					payloadSchema,
					responseSchema,
					true
				)
			).rejects.toThrowError(/^timeout of 0ms exceeded$/);
		});

		it("axios error", async () => {
			const responseSchema = z.object({
				id: z.number(),
				name: z.string(),
			});

			mock.onGet("/test").timeout();

			await expect(
				apiService.get("/test", responseSchema)
			).rejects.toThrowError(/^timeout of 0ms exceeded$/);
		});
	});

	describe("error tracking", () => {
		const PLAN = "/planning/plan/0b1e2c3d-1111-4222-8333-444455556666/";
		const schema = z.object({ id: z.number() });

		beforeEach(() => {
			vi.mocked(trackException).mockClear();
		});

		const tracked = () => {
			const [error, props] = vi.mocked(trackException).mock.calls[0];
			return { error: error as Error, props };
		};

		it("validation error: issue paths and codes, no values", async () => {
			mock.onGet(PLAN).reply(200, { id: "secret-value" });

			await expect(apiService.get(PLAN, schema)).rejects.toThrowError(
				/^Validation error/
			);

			expect(trackException).toHaveBeenCalledTimes(1);
			const { error, props } = tracked();
			expect(error.name).toBe("ApiValidationError");
			expect(error.message).toBe("GET /planning/plan/:uuid/");
			expect(props).toStrictEqual({
				path_template: "/planning/plan/:uuid/",
				method: "GET",
				issues: ["id: invalid_type"],
			});
			expect(JSON.stringify([error.message, props])).not.toContain(
				"secret-value"
			);
		});

		it("validation error: no record keys, one line per field", async () => {
			const records = z.object({
				plan_details: z.record(
					z.string(),
					z.object({ profit: z.number() })
				),
				rows: z.array(z.object({ id: z.number() })),
			});
			mock.onGet(PLAN).reply(200, {
				plan_details: {
					"0b1e2c3d-1111-4222-8333-444455556666": { profit: "x" },
					"ffffffff-1111-4222-8333-444455556666": { profit: "y" },
				},
				rows: [{ id: "a" }, { id: "b" }, { id: "c" }],
			});

			await expect(apiService.get(PLAN, records)).rejects.toThrowError();

			expect(tracked().props?.issues).toStrictEqual([
				"plan_details.:key.profit: invalid_type",
				"rows.[].id: invalid_type",
			]);
		});

		it("validation error of a request payload", async () => {
			await expect(
				apiService.post(PLAN, { id: "nope" }, schema, schema)
			).rejects.toThrowError(/^Validation error/);

			const { error, props } = tracked();
			expect(error.name).toBe("ApiValidationError");
			expect(props).toMatchObject({
				method: "POST",
				issues: ["id: invalid_type"],
			});
		});

		it("server error", async () => {
			mock.onPut(PLAN).reply(500, { detail: "down" });

			await expect(
				apiService.put(PLAN, { id: 1 }, schema, schema)
			).rejects.toThrowError();

			const { error, props } = tracked();
			expect(error.name).toBe("ApiServerError");
			expect(error.message).toBe("PUT /planning/plan/:uuid/ 500");
			expect(props).toStrictEqual({
				path_template: "/planning/plan/:uuid/",
				method: "PUT",
				status: 500,
			});
		});

		it("network error", async () => {
			mock.onGet("/data/planet/OT-580b/").networkError();

			await expect(
				apiService.get("/data/planet/OT-580b/", schema)
			).rejects.toThrowError();

			const { error, props } = tracked();
			expect(error.name).toBe("ApiNetworkError");
			expect(props).toStrictEqual({
				path_template: "/data/planet/:planet/",
				method: "GET",
				status: undefined,
			});
		});

		it("throttled", async () => {
			mock.onDelete(PLAN).reply(429);

			await expect(apiService.delete(PLAN)).rejects.toThrowError();

			const { error, props } = tracked();
			expect(error.name).toBe("ApiClientError");
			expect(props).toMatchObject({ method: "DELETE", status: 429 });
		});

		it("401 of the token refresh", async () => {
			mock.onPost("/user/refresh/").reply(401);

			await expect(
				apiService.post("/user/refresh/", { id: 1 }, schema, schema)
			).rejects.toThrowError();

			const { error, props } = tracked();
			expect(error.name).toBe("ApiClientError");
			expect(props).toStrictEqual({
				path_template: "/user/refresh/",
				method: "POST",
				status: 401,
			});
		});

		it.each([400, 401, 403, 404])("not a %i", async (status) => {
			mock.onGet(PLAN).reply(status);

			await expect(apiService.get(PLAN, schema)).rejects.toThrowError();

			expect(trackException).not.toHaveBeenCalled();
		});

		it("not a response discarded for a previous session", async () => {
			mock.onGet(PLAN).reply(() =>
				Promise.reject(new CanceledError("discarded"))
			);

			await expect(apiService.get(PLAN, schema)).rejects.toThrowError();

			expect(trackException).not.toHaveBeenCalled();
		});
	});

	describe("get", async () => {
		it("successful call and response parsing", async () => {
			const mockData = { id: 1, name: "Test" };
			const responseSchema = z.object({
				id: z.number(),
				name: z.string(),
			});

			mock.onGet("/test").reply(200, mockData);

			const result = await apiService.get("/test", responseSchema);
			expect(result).toStrictEqual(mockData);
		});
	});

	describe("post", async () => {
		it("successfull call and reponse parsing", async () => {
			const mockPayload = { foo: "moo" };
			const payloadSchema = z.object({ foo: z.string() });

			const mockResponse = { moo: "foo" };
			const responseSchema = z.object({ moo: z.string() });

			mock.onPost("/test").reply(200, mockResponse);

			const result = await apiService.post(
				"/test",
				mockPayload,
				payloadSchema,
				responseSchema
			);

			expect(result).toStrictEqual(mockResponse);
		});
	});

	describe("put", async () => {
		it("successfull call and reponse parsing", async () => {
			const mockPayload = { foo: "moo" };
			const payloadSchema = z.object({ foo: z.string() });

			const mockResponse = { moo: "foo" };
			const responseSchema = z.object({ moo: z.string() });

			mock.onPut("/test").reply(200, mockResponse);

			const result = await apiService.put(
				"/test",
				mockPayload,
				payloadSchema,
				responseSchema
			);

			expect(result).toStrictEqual(mockResponse);
		});

		it("triggering put error", async () => {
			const mockPayload = { foo: "moo" };
			const payloadSchema = z.object({ foo: z.string() });

			const responseSchema = z.object({ moo: z.string() });

			mock.onPut("/test").timeout();

			await expect(
				apiService.put(
					"/test",
					mockPayload,
					payloadSchema,
					responseSchema
				)
			).rejects.toThrowError(/^timeout of 0ms exceeded$/);
		});
	});

	describe("patch", async () => {
		it("successfull call and reponse parsing", async () => {
			const mockPayload = { foo: "moo" };
			const payloadSchema = z.object({ foo: z.string() });

			const mockResponse = { moo: "foo" };
			const responseSchema = z.object({ moo: z.string() });

			mock.onPatch("/test").reply(200, mockResponse);

			const result = await apiService.patch(
				"/test",
				mockPayload,
				payloadSchema,
				responseSchema
			);

			expect(result).toStrictEqual(mockResponse);
		});

		it("triggering put error", async () => {
			const mockPayload = { foo: "moo" };
			const payloadSchema = z.object({ foo: z.string() });
			const responseSchema = z.object({ moo: z.string() });

			mock.onPatch("/test").timeout();

			await expect(
				apiService.patch(
					"/test",
					mockPayload,
					payloadSchema,
					responseSchema
				)
			).rejects.toThrowError(/^timeout of 0ms exceeded$/);
		});
	});

	describe("delete", async () => {
		it("successfull call and reponse parsing", async () => {
			mock.onDelete("/test").reply(200, true);

			const result = await apiService.delete("/test");

			expect(result).toBeTruthy();
		});

		it("triggering delete error", async () => {
			mock.onDelete("/test").timeout();

			await expect(apiService.delete("/test")).rejects.toThrowError(
				/^timeout of 0ms exceeded$/
			);
		});
	});
});
