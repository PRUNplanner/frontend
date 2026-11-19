// @vitest-environment node
import { createServer, type Server } from "node:http";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	Client,
	StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

// MCP
import { createHandler, testEnvironment } from "@/mcp/app";
import { TOOLS } from "@/mcp/tools";
import {
	API_KEY,
	PLAN_UUID,
	fakeBackend,
	type IFakeBackend,
} from "@/tests/mcp/fakeBackend";

// Types & Interfaces
import type { IncomingMessage, ServerResponse } from "node:http";

let backend: IFakeBackend;
let lines: Record<string, unknown>[];
const handler = (appUrl: string) =>
	createHandler({
		apiUrl: "http://backend",
		appUrl,
		version: "9.9.9",
		fetch: (...args) => backend.fetch(...args),
	});

// the production app's server: results without the test marker
let server: Server;
let base: string;
beforeAll(async () => {
	const prod = handler("https://prunplanner.org");
	server = createServer((req, res) => prod(req, res));
	await new Promise<void>((resolve) => server.listen(0, resolve));
	const address = server.address();
	base = `http://127.0.0.1:${typeof address === "object" ? address!.port : 0}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
	backend = fakeBackend();
	lines = [];
	vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
		lines.push(JSON.parse(String(chunk)));
		return true;
	});
});
afterEach(() => vi.restoreAllMocks());

async function connect(): Promise<Client> {
	const client = new Client({ name: "vitest-client", version: "1.2.3" });
	await client.connect(
		new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
			requestInit: { headers: { Authorization: `Api-Key ${API_KEY}` } },
		})
	);
	return client;
}

const post = (body: string, userAgent = "raw-client/0.1 (test)") =>
	fetch(`${base}/mcp`, {
		method: "POST",
		body,
		headers: {
			Authorization: `Api-Key ${API_KEY}`,
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
			"User-Agent": userAgent,
		},
	});

describe("MCP HTTP handler in production", () => {
	it("results and errors carry no test-environment marker", async () => {
		const client = await connect();
		const ok = await client.callTool({
			name: "get_plan",
			arguments: { plan_uuid: PLAN_UUID },
		});
		expect(ok.isError).toBeFalsy();
		expect(ok.structuredContent).not.toHaveProperty("environment");
		const text = (ok.content as { text: string }[])[0].text;
		expect(text).not.toContain("[Test environment");
		expect(text).toContain(`"uuid":"${PLAN_UUID}"`);

		// a known tool error: its message, unmarked
		const known = await client.callTool({
			name: "get_xit_action",
			arguments: { kind: "supply" },
		});
		expect(known.isError).toBe(true);
		expect((known.content as { text: string }[])[0].text).toBe(
			"kind supply needs plan_uuid."
		);
		await client.close();
	});

	it("an unexpected failure: a generic message, logged as internal_error", async () => {
		const planTool = TOOLS.find((t) => t.name === "get_plan")!;
		vi.spyOn(planTool, "run").mockRejectedValue(new Error("boom"));
		const client = await connect();
		const result = await client.callTool({
			name: "get_plan",
			arguments: { plan_uuid: PLAN_UUID },
		});
		expect(result.isError).toBe(true);
		expect((result.content as { text: string }[])[0].text).toBe(
			"The calculation failed unexpectedly."
		);
		expect(JSON.stringify(result.content)).not.toContain("boom");
		expect(lines.find((l) => l.event === "mcp_tool_called")).toMatchObject({
			tool: "get_plan",
			outcome: "tool_error",
			error_code: "internal_error",
			level: "warning",
		});
		await client.close();
	});

	it("a batch with a bare initialize: client from the user agent", async () => {
		const res = await post(
			JSON.stringify([
				{ jsonrpc: "2.0", id: 1, method: "initialize" },
				null,
			]),
			"raw-client/0.1 (test)"
		);
		// the transport answers the malformed batch itself
		expect(res.status).toBeGreaterThanOrEqual(200);
		expect(
			lines.find((l) => l.event === "mcp_session_started")
		).toMatchObject({
			client_name: "raw-client",
			client_version: null,
			protocol_version: null,
			api_key_prefix: "abcd1234",
		});
	});

	it("a body that isn't JSON: 400 parse error", async () => {
		const res = await post("{not json");
		expect(res.status).toBe(400);
		expect((await res.json()).error).toEqual({
			code: -32700,
			message: "Parse error",
		});
		expect(lines[0]).toMatchObject({
			event: "mcp_request_rejected",
			reason: "bad_request",
			client_name: "raw-client",
		});
	});

	it("healthz answers GET only; a request without a url is the bare domain", async () => {
		const res = await fetch(`${base}/healthz`, { method: "POST" });
		expect(res.status).toBe(404);

		// a request without a url: the bare domain, still needing a key
		const sent: { status?: number; body?: string } = {};
		const response = {
			writeHead: (status: number) => {
				sent.status = status;
				return response;
			},
			end: (body: string) => {
				sent.body = body;
			},
		};
		await handler("https://prunplanner.org")(
			{ method: "GET", headers: {} } as IncomingMessage,
			response as unknown as ServerResponse
		);
		expect(sent.status).toBe(401);
		expect(JSON.parse(sent.body!).error.message).toContain("Api-Key");
	});

	it("test environments: local hosts and .test, not malformed urls", () => {
		expect(testEnvironment("http://127.0.0.1:5180")).toBe(true);
		expect(testEnvironment("http://[::1]:5180")).toBe(true);
		expect(testEnvironment("http://app.localhost")).toBe(true);
		expect(testEnvironment("https://staging.example.com")).toBe(false);
		expect(testEnvironment("not a url")).toBe(false);
	});
});
