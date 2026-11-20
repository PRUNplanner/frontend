// @vitest-environment node
import { createServer, type Server } from "node:http";
import {
	afterAll,
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
import {
	clientName,
	createHandler,
	parseAuth,
	testEnvironment,
} from "@/mcp/app";
import {
	API_KEY,
	PLAN_UUID,
	fakeBackend,
	type IFakeBackend,
} from "@/tests/mcp/fakeBackend";

let server: Server;
let base: string;
let backend: IFakeBackend;
let lines: Record<string, unknown>[];

beforeAll(async () => {
	server = createServer((req, res) =>
		createHandler({
			apiUrl: "http://backend",
			appUrl: "https://app.test",
			version: "9.9.9",
			fetch: (...args) => backend.fetch(...args),
		})(req, res)
	);
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

async function connect(key = API_KEY, path = "/mcp"): Promise<Client> {
	const client = new Client({ name: "vitest-client", version: "1.2.3" });
	await client.connect(
		new StreamableHTTPClientTransport(new URL(`${base}${path}`), {
			requestInit: { headers: { Authorization: `Api-Key ${key}` } },
		})
	);
	return client;
}

describe("MCP HTTP handler", () => {
	it("healthz needs no key", async () => {
		const res = await fetch(`${base}/healthz`);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("ok");
	});

	it("answers on /mcp and the bare domain, 404 elsewhere", async () => {
		const client = await connect(API_KEY, "/");
		expect((await client.listTools()).tools).toHaveLength(33);
		await client.close();
		const res = await fetch(`${base}/sse`, { method: "POST", body: "{}" });
		expect(res.status).toBe(404);
		expect((await res.json()).error.message).toContain("/mcp");
	});

	it("401 with the key hint without or with a malformed Authorization", async () => {
		const missing = await fetch(`${base}/mcp`, {
			method: "POST",
			body: "{}",
		});
		expect(missing.status).toBe(401);
		expect((await missing.json()).error.message).toContain(
			"https://prunplanner.org/apikey"
		);
		const malformed = await fetch(`${base}/mcp`, {
			method: "POST",
			body: "{}",
			headers: { Authorization: "Bearer x" },
		});
		expect(malformed.status).toBe(401);
		expect(lines.map((l) => l.reason)).toEqual([
			"missing_auth",
			"malformed_auth",
		]);
		expect(lines[0]).toMatchObject({
			event: "mcp_request_rejected",
			service: "mcp",
			level: "warning",
		});
	});

	it("lists the 33 tools with their hints and logs the session start", async () => {
		const client = await connect();
		const { tools } = await client.listTools();
		expect(tools).toHaveLength(33);
		// clients ask before a write; deletes and overwrites are destructive
		const hints = Object.fromEntries(
			tools.map((t) => [
				t.name,
				[t.annotations?.readOnlyHint, t.annotations?.destructiveHint],
			])
		);
		expect(hints.get_plan).toEqual([true, undefined]);
		expect(hints.save_plan).toEqual([false, true]);
		expect(hints.share_plan).toEqual([false, false]);
		expect(hints.copy_shared_plan).toEqual([false, false]);
		expect(hints.delete).toEqual([false, true]);
		expect(
			tools.filter((t) => !t.annotations?.readOnlyHint).map((t) => t.name)
		).toHaveLength(8);
		// clients that load every definition pay for all of it in each
		// conversation: keep the list lean (56.5k on 2026-11-20, after
		// tools that take another tool's arguments stopped embedding its
		// schema: argsOf) and uuid fields free of z.uuid()'s long pattern
		const definitions = JSON.stringify(tools);
		expect(definitions.length).toBeLessThan(60_000);
		expect(definitions).not.toContain("[89abAB]");
		// Claude Code cuts server instructions at 4,096 characters; the
		// shared argument formats the field descriptions point to come first
		const instructions = client.getInstructions()!;
		expect(instructions.length).toBeLessThanOrEqual(4096);
		for (const section of [
			"per day",
			"price_basis:",
			"buildings[]:",
			"storage_days:",
		])
			expect(instructions).toContain(section);
		// the entry points load at once where tools load on demand
		expect(
			tools
				.filter((t) => t._meta?.["anthropic/alwaysLoad"])
				.map((t) => t.name)
				.sort()
		).toEqual(["get_plan", "list_empires", "list_plans"]);
		// a tool taking another's arguments lists them as a plain object
		const check = tools.find((t) => t.name === "check_plan_market")!;
		expect(check.inputSchema.properties!.variant).toMatchObject({
			type: "object",
			properties: {},
		});
		// the icon clients show next to the server
		expect(client.getServerVersion()).toMatchObject({
			title: "PRUNplanner",
			icons: [{ src: expect.stringMatching(/^data:image\/png;base64,/) }],
		});
		expect(
			lines.find((l) => l.event === "mcp_session_started")
		).toMatchObject({
			client_name: "vitest-client",
			client_version: "1.2.3",
			api_key_prefix: "abcd1234",
			protocol_version: expect.any(String),
		});
		await client.close();
	});

	it("a tool call: structured result, one log line without the key", async () => {
		const client = await connect();
		const result = await client.callTool({
			name: "get_plan",
			arguments: { plan_uuid: PLAN_UUID },
		});
		expect(result.isError).toBeFalsy();
		expect(result.structuredContent).toMatchObject({
			plan: { uuid: PLAN_UUID },
		});
		// app.test is a test host: every result says so
		expect(result.structuredContent).toMatchObject({
			environment: { production: false },
		});
		// clients that only show the text block still get the data
		const text = (result.content as { text: string }[])[0].text;
		expect(text).toContain(`"uuid":"${PLAN_UUID}"`);
		const called = lines.filter((l) => l.event === "mcp_tool_called");
		expect(called).toHaveLength(1);
		expect(called[0]).toMatchObject({
			tool: "get_plan",
			write: false,
			outcome: "ok",
			error_code: null,
			api_key_prefix: "abcd1234",
			backend_calls: expect.any(Number),
			duration_ms: expect.any(Number),
			backend_ms: expect.any(Number),
			backend_wall_ms: expect.any(Number),
			client_name: expect.any(String),
		});
		// never the secret, the header or the arguments
		const logged = JSON.stringify(lines);
		expect(logged).not.toContain("secret-part");
		expect(logged).not.toContain("Api-Key");
		expect(logged).not.toContain(PLAN_UUID);
		// the backend sees MCP traffic by its user agent
		expect(backend.requests[0].headers.get("User-Agent")).toMatch(
			/^PRUNplanner-MCP\/9\.9\.9 \(/
		);
		await client.close();
	});

	it("a revoked key: tool error, logged as auth_error", async () => {
		backend = fakeBackend(403);
		const client = await connect();
		const result = await client.callTool({
			name: "list_empires",
			arguments: {},
		});
		expect(result.isError).toBe(true);
		expect(JSON.stringify(result.content)).toContain("invalid or revoked");
		expect(JSON.stringify(result.content)).toContain(
			"[Test environment, not production]"
		);
		expect(lines.find((l) => l.event === "mcp_tool_called")).toMatchObject({
			outcome: "auth_error",
			error_code: "auth_error",
			level: "warning",
		});
		await client.close();
	});

	it("a write with a read-only key: tool error, logged as read_only_key", async () => {
		backend = fakeBackend(undefined, [], () => ({
			status: 403,
			body: { detail: "read-only", code: "api_key_read_only" },
		}));
		const client = await connect();
		const result = await client.callTool({
			name: "set_preferences",
			arguments: { buy_items_from_cx: true },
		});
		expect(result.isError).toBe(true);
		expect(JSON.stringify(result.content)).toContain("read-write key");
		expect(lines.find((l) => l.event === "mcp_tool_called")).toMatchObject({
			tool: "set_preferences",
			write: true,
			outcome: "read_only_key",
			level: "warning",
		});
		await client.close();
	});

	it("offers the four workflow prompts", async () => {
		const client = await connect();
		const { prompts } = await client.listPrompts();
		expect(prompts.map((p) => p.name)).toEqual([
			"review_plan",
			"review_empire",
			"vertical_chain",
			"load_lists",
		]);
		const prompt = await client.getPrompt({
			name: "vertical_chain",
			arguments: { material: "AL", exchange: "CI1" },
		});
		const text = (prompt.messages[0].content as { text: string }).text;
		expect(text).toContain("AL at 100 per day");
		expect(text).toContain("near_exchange CI1");
		expect(text).toContain("let me choose");
		await client.close();
	});

	it("parses keys and client names", () => {
		expect(parseAuth("Api-Key ab.cd")).toEqual({
			key: "ab.cd",
			prefix: "ab",
		});
		expect(parseAuth("Api-Key abcd")).toBe("malformed");
		expect(parseAuth(undefined)).toBe("missing");
		expect(clientName("claude-code/2.1 (cli)")).toBe("claude-code");
		expect(clientName(undefined)).toBe("unknown");
		expect(testEnvironment("http://localhost:5181")).toBe(true);
		expect(testEnvironment("https://prunplanner.org")).toBe(false);
	});
});
