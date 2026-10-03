import { describe, it, expect, vi, beforeEach } from "vitest";

import config from "@/lib/config";

const fetchMock = vi.fn<typeof fetch>();

const REPORT = {
	kind: "server",
	method: "GET",
	path_template: "/planning/plan/:uuid/",
	status: 500,
	failed_request_id: "0b1e2c3d-1111-4222-8333-444455556666",
	client_ms: 12,
} as const;

// module state (dedupe, cap) is per tab, so each case loads a fresh copy
async function load() {
	vi.resetModules();
	return await import("@/lib/clientErrors");
}

const sentBodies = () =>
	fetchMock.mock.calls.map(([, init]) => JSON.parse(init?.body as string));

describe("reportClientError", () => {
	beforeEach(() => {
		fetchMock.mockReset().mockResolvedValue(new Response(null));
		vi.stubGlobal("fetch", fetchMock);
		vi.stubEnv("DEV", false);
	});

	it("sends nothing outside production builds", async () => {
		vi.stubEnv("DEV", true);
		const { reportClientError } = await load();

		reportClientError(REPORT);

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("posts the report with keepalive and no token", async () => {
		const { reportClientError, setClientErrorRoute } = await load();
		const { correlationId } = await import("@/lib/requestIds");
		setClientErrorRoute("plan");

		reportClientError(REPORT);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(`${config.API_BASE_URL}/client-errors/`);
		expect(init).toMatchObject({ method: "POST", keepalive: true });
		expect(init?.headers).toStrictEqual({
			"Content-Type": "application/json",
			"X-Correlation-ID": correlationId(),
		});
		expect(sentBodies()[0]).toStrictEqual(
			JSON.parse(
				JSON.stringify({
					...REPORT,
					release: __APP_VERSION__,
					route_name: "plan",
				})
			)
		);
	});

	it("clips issues to the backend's bounds", async () => {
		const { reportClientError } = await load();

		reportClientError({
			...REPORT,
			kind: "validation",
			issues: Array.from({ length: 25 }, (_, i) => `${i}`.repeat(300)),
		});

		const { issues } = sentBodies()[0];
		expect(issues).toHaveLength(20);
		expect(issues[0]).toHaveLength(200);
	});

	it("sends the same error once a minute", async () => {
		vi.useFakeTimers();
		const { reportClientError } = await load();

		for (let i = 0; i < 10; i++) reportClientError(REPORT);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		// another path is another error
		reportClientError({ ...REPORT, path_template: "/user/" });
		expect(fetchMock).toHaveBeenCalledTimes(2);

		vi.advanceTimersByTime(60_000);
		reportClientError(REPORT);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("sends at most 20 reports per tab", async () => {
		const { reportClientError } = await load();

		for (let i = 0; i < 30; i++)
			reportClientError({ ...REPORT, path_template: `/p${i}/` });

		expect(fetchMock).toHaveBeenCalledTimes(20);
	});

	it("swallows a failing report without reporting it", async () => {
		fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
		const { reportClientError } = await load();

		reportClientError(REPORT);
		await new Promise((resolve) => setTimeout(resolve));

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("swallows fetch throwing", async () => {
		fetchMock.mockImplementation(() => {
			throw new TypeError("no fetch");
		});
		const { reportClientError } = await load();

		expect(() => reportClientError(REPORT)).not.toThrow();
	});
});
