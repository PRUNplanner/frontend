import { describe, it, expect, beforeAll, beforeEach, onTestFinished, vi } from "vitest";
import { z } from "zod";
import { apiService } from "@/lib/apiService";
import AxiosMockAdapter from "axios-mock-adapter";
import axiosSetup from "@/util/axiosSetup";
import { createPinia, setActivePinia } from "pinia";
import { CanceledError } from "axios";
import { trackException } from "@/lib/analytics/useAnalytics";
import { reportClientError } from "@/lib/clientErrors";
import config from "@/lib/config";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackException: vi.fn(),
	trackContext: vi.fn(),
}));
vi.mock("@/lib/clientErrors", () => ({ reportClientError: vi.fn() }));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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

	describe("request ids", () => {
		const echoHeaders = (cfg: { headers?: unknown }) =>
			[200, { ...(cfg.headers as object) }] as [number, object];

		it("sets a new request id and the session id on API calls", async () => {
			mock.onGet("/ids").reply(echoHeaders);
			const anyHeaders = z.record(z.string(), z.unknown());

			const first = await apiService.get("/ids", anyHeaders);
			const second = await apiService.get("/ids", anyHeaders);

			expect(first["X-Request-ID"]).toMatch(UUID);
			expect(second["X-Request-ID"]).toMatch(UUID);
			expect(second["X-Request-ID"]).not.toBe(first["X-Request-ID"]);
			expect(first["X-Correlation-ID"]).toMatch(UUID);
			expect(second["X-Correlation-ID"]).toBe(first["X-Correlation-ID"]);
		});

		it("sets them on absolute API URLs, not on other origins", async () => {
			mock.onGet(`${config.API_BASE_URL}/ids`).reply(echoHeaders);
			mock.onGet("https://other.example/ids").reply(echoHeaders);

			const api = await apiService.client.get(`${config.API_BASE_URL}/ids`);
			const other = await apiService.client.get("https://other.example/ids");

			expect(api.data["X-Request-ID"]).toMatch(UUID);
			expect(other.data).not.toHaveProperty("X-Request-ID");
			expect(other.data).not.toHaveProperty("X-Correlation-ID");
		});
	});

	describe("error tracking", () => {
		const PLAN = "/planning/plan/0b1e2c3d-1111-4222-8333-444455556666/";
		const schema = z.object({ id: z.number() });

		beforeEach(() => {
			vi.mocked(trackException).mockClear();
			vi.mocked(reportClientError).mockClear();
		});

		const reported = () => vi.mocked(reportClientError).mock.calls[0][0];

		const tracked = () => {
			const [error, props] = vi.mocked(trackException).mock.calls[0];
			return { error: error as Error, props };
		};

		it("validation error: issue paths and codes, no values", async () => {
			let requestId: unknown;
			mock.onGet(PLAN).reply((cfg) => {
				requestId = cfg.headers?.["X-Request-ID"];
				return [200, { id: "secret-value" }];
			});

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
				request_id: requestId,
			});
			expect(requestId).toMatch(UUID);
			expect(JSON.stringify([error.message, props])).not.toContain(
				"secret-value"
			);

			expect(reportClientError).toHaveBeenCalledTimes(1);
			expect(reported()).toStrictEqual({
				kind: "validation",
				method: "GET",
				path_template: "/planning/plan/:uuid/",
				failed_request_id: requestId,
				issues: ["id: invalid_type"],
				client_ms: expect.any(Number),
			});
			expect(JSON.stringify(reported())).not.toContain("secret-value");
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
				// @ts-expect-error invalid payload on purpose
				apiService.post(PLAN, { id: "nope" }, schema, schema)
			).rejects.toThrowError(/^Validation error/);

			const { error, props } = tracked();
			expect(error.name).toBe("ApiValidationError");
			expect(props).toMatchObject({
				method: "POST",
				issues: ["id: invalid_type"],
			});
			// no call was made
			expect(reported()).toMatchObject({
				kind: "validation",
				failed_request_id: undefined,
				client_ms: undefined,
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
				request_id: expect.stringMatching(UUID),
			});
			expect(reported()).toStrictEqual({
				kind: "server",
				method: "PUT",
				path_template: "/planning/plan/:uuid/",
				status: 500,
				failed_request_id: props?.request_id,
				client_ms: expect.any(Number),
			});
		});

		it("network error: a lone GET one is not reported", async () => {
			mock.onGet("/data/storage/").networkError();

			await expect(
				apiService.get("/data/storage/", schema)
			).rejects.toThrowError();

			expect(trackException).not.toHaveBeenCalled();
			expect(reportClientError).not.toHaveBeenCalled();
		});

		it("network error: a lone GET one long after the last", async () => {
			const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
			onTestFinished(() => now.mockRestore());
			mock.onGet("/data/fio/").networkError();
			const get = () => apiService.get("/data/fio/", schema);

			await expect(get()).rejects.toThrowError();
			now.mockReturnValue(1_000_000 + 10 * 60_000);
			await expect(get()).rejects.toThrowError();

			expect(trackException).not.toHaveBeenCalled();
			expect(reportClientError).not.toHaveBeenCalled();
		});

		it("server error: a GET one is reported at once", async () => {
			mock.onGet("/data/storage/500/").reply(500);

			await expect(
				apiService.get("/data/storage/500/", schema)
			).rejects.toThrowError();

			expect(tracked().error.name).toBe("ApiServerError");
			expect(reported()).toMatchObject({ kind: "server", method: "GET" });
		});

		it("network error: a POST one is reported at once", async () => {
			mock.onPost(PLAN).networkError();

			await expect(
				apiService.post(PLAN, { id: 1 }, schema, schema)
			).rejects.toThrowError();

			expect(tracked().error.name).toBe("ApiNetworkError");
			expect(reported()).toMatchObject({ kind: "network", method: "POST" });
		});

		it("network error: a repeated GET one", async () => {
			const now = vi.spyOn(Date, "now").mockReturnValue(2_000_000);
			onTestFinished(() => now.mockRestore());
			mock.onGet("/data/planet/OT-580b/").networkError();

			await expect(
				apiService.get("/data/planet/OT-580b/", schema)
			).rejects.toThrowError();
			// same path, within ten minutes
			now.mockReturnValue(2_000_000 + 60_000);
			await expect(
				apiService.get("/data/planet/OT-580b/", schema)
			).rejects.toThrowError();

			expect(trackException).toHaveBeenCalledOnce();
			const { error, props } = tracked();
			expect(error.name).toBe("ApiNetworkError");
			expect(props).toStrictEqual({
				path_template: "/data/planet/:planet/",
				method: "GET",
				status: undefined,
				request_id: expect.stringMatching(UUID),
				code: undefined,
			});
			expect(reported()).toMatchObject({
				kind: "network",
				failed_request_id: props?.request_id,
			});
		});

		describe("network error: planets/multiple, a read sent as POST", () => {
			const PLANETS = "/data/planets/multiple/";
			const ids = z.array(z.string());
			const post = () =>
				apiService.post(PLANETS, ["OT-580b"], ids, z.array(schema));

			it("a lone one and its burst are not reported", async () => {
				const now = vi.spyOn(Date, "now").mockReturnValue(10_000_000);
				onTestFinished(() => now.mockRestore());
				mock.onPost(PLANETS).networkError();

				await expect(post()).rejects.toThrowError();
				// parallel chunks, other expired queries of the same wake
				now.mockReturnValue(10_000_000 + 400);
				await expect(post()).rejects.toThrowError();
				now.mockReturnValue(10_000_000 + 4_000);
				await expect(post()).rejects.toThrowError();

				expect(trackException).not.toHaveBeenCalled();
				expect(reportClientError).not.toHaveBeenCalled();
			});

			it("a later blip is reported once, with the error code", async () => {
				const now = vi.spyOn(Date, "now").mockReturnValue(20_000_000);
				onTestFinished(() => now.mockRestore());
				mock.onPost(PLANETS).timeout();

				await expect(post()).rejects.toThrowError();
				now.mockReturnValue(20_000_000 + 60_000);
				await expect(post()).rejects.toThrowError();
				now.mockReturnValue(20_000_000 + 61_000);
				await expect(post()).rejects.toThrowError();

				expect(trackException).toHaveBeenCalledOnce();
				expect(tracked().props).toMatchObject({
					method: "POST",
					code: "ECONNABORTED",
				});
				expect(reportClientError).toHaveBeenCalledOnce();
				expect(reported()).not.toHaveProperty("code");
			});

			it("not while offline", async () => {
				const now = vi.spyOn(Date, "now").mockReturnValue(30_000_000);
				const onLine = vi
					.spyOn(navigator, "onLine", "get")
					.mockReturnValue(false);
				onTestFinished(() => {
					now.mockRestore();
					onLine.mockRestore();
				});
				mock.onPost(PLANETS).networkError();

				await expect(post()).rejects.toThrowError();
				now.mockReturnValue(30_000_000 + 60_000);
				await expect(post()).rejects.toThrowError();

				expect(trackException).not.toHaveBeenCalled();
				expect(reportClientError).not.toHaveBeenCalled();
			});
		});

		it("throttled", async () => {
			mock.onDelete(PLAN).reply(429);

			await expect(apiService.delete(PLAN)).rejects.toThrowError();

			const { error, props } = tracked();
			expect(error.name).toBe("ApiClientError");
			expect(props).toMatchObject({ method: "DELETE", status: 429 });
			expect(reportClientError).not.toHaveBeenCalled();
		});

		it("not a 401 of the token refresh", async () => {
			mock.onPost("/user/refresh/").reply(401);

			await expect(
				apiService.post("/user/refresh/", { id: 1 }, schema, schema)
			).rejects.toThrowError();

			expect(trackException).not.toHaveBeenCalled();
			expect(reportClientError).not.toHaveBeenCalled();
		});

		it.each([400, 401, 403, 404])("not a %i", async (status) => {
			mock.onGet(PLAN).reply(status);

			await expect(apiService.get(PLAN, schema)).rejects.toThrowError();

			expect(trackException).not.toHaveBeenCalled();
			expect(reportClientError).not.toHaveBeenCalled();
		});

		it("not a response discarded for a previous session", async () => {
			mock.onGet(PLAN).reply(() =>
				Promise.reject(new CanceledError("discarded"))
			);

			await expect(apiService.get(PLAN, schema)).rejects.toThrowError();

			expect(trackException).not.toHaveBeenCalled();
			expect(reportClientError).not.toHaveBeenCalled();
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
