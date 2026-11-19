// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// MCP
import { createBackend, ToolError } from "@/mcp/backend";
import { findEmpireCX, loadEmpireCX, resolveEmpire } from "@/mcp/context";
import { storeEmpireStates } from "@/mcp/empireState";
import {
	API_KEY,
	EMPIRE_UUID,
	fakeBackend,
	fixtures,
} from "@/tests/mcp/fakeBackend";
import { preferenceDefaults } from "@/features/preferences/userDefaults";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

const KEY_PAGE = "https://prunplanner.org/apikey";
const plan = fixtures.plan as unknown as Plan;
const empires = fixtures.empires as unknown as PlanEmpireElement[];
// an empire no CX preference uses
const RFAB = "2eac235a-9f8d-4994-8c71-933c31127423";

/** a backend whose every request answers `status` with `body` (raw text) */
function answering(status: number, body = "", headers?: HeadersInit) {
	const fetch = vi.fn(
		async (_input: RequestInfo | URL, _init?: RequestInit) =>
			new Response(body, { status, headers })
	);
	return {
		fetch,
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: fetch as unknown as typeof globalThis.fetch,
		}),
	};
}
const json = (v: unknown) => JSON.stringify(v);
const write = (b: IBackend) =>
	b.send("PUT", "/planning/plan/x/", { a: 1 }, null);
const read = (b: IBackend) => b.get("/planning/plan/", z.unknown());

afterEach(() => vi.unstubAllGlobals());

describe("backend: error mapping", () => {
	it("a write refused for another reason than the key passes it on", async () => {
		const { backend } = answering(
			403,
			json({ detail: "You do not own this plan." })
		);
		await expect(write(backend)).rejects.toMatchObject({
			code: "tool_error",
			message:
				"PRUNplanner refused the change: You do not own this plan.",
		});
	});

	it("a 403 write without a reason: refused, no reason", async () => {
		const { backend } = answering(403, "not json");
		await expect(write(backend)).rejects.toMatchObject({
			code: "tool_error",
			message: "PRUNplanner refused the change.",
		});
	});

	it("a 403 write about the key is an auth error with the backend's text", async () => {
		const revoked = answering(
			403,
			json({ detail: "API key revoked.", code: "api_key_revoked" })
		);
		await expect(write(revoked.backend)).rejects.toMatchObject({
			code: "auth_error",
			message: "API key revoked.",
		});
		// no code, but the text names the key: the generic advice
		const named = answering(403, json({ detail: "Invalid API key." }));
		await expect(write(named.backend)).rejects.toMatchObject({
			code: "auth_error",
			message: `API key invalid or revoked. Create a new one at ${KEY_PAGE}.`,
		});
	});

	it("a 401 or 403 read: the generic key advice", async () => {
		for (const status of [401, 403]) {
			const { backend } = answering(
				status,
				json({ detail: "x", code: "api_key_invalid" })
			);
			await expect(read(backend)).rejects.toMatchObject({
				code: "auth_error",
				message: `API key invalid or revoked. Create a new one at ${KEY_PAGE}.`,
			});
		}
	});

	it("429: rate limited, with Retry-After when given", async () => {
		const withHeader = answering(429, "{}", { "Retry-After": "30" });
		await expect(read(withHeader.backend)).rejects.toMatchObject({
			code: "rate_limited",
			message:
				"PRUNplanner is limiting these requests right now (too many in a minute; retry after 30 s). Try again shortly.",
		});
		const without = answering(429);
		await expect(read(without.backend)).rejects.toMatchObject({
			code: "rate_limited",
			message:
				"PRUNplanner is limiting these requests right now (too many in a minute). Try again shortly.",
		});
	});

	it("404 and 409 on writes", async () => {
		await expect(write(answering(404).backend)).rejects.toMatchObject({
			code: "tool_error",
			message: "Not found: /planning/plan/x/",
		});
		await expect(
			write(answering(409, json({ detail: "Conflict" })).backend)
		).rejects.toMatchObject({ code: "conflict" });
	});

	it("400: a write's reasons joined, an empty body none; a read's 400 is a backend error", async () => {
		const fields = answering(
			400,
			json({ plan_name: ["Too long.", "Bad."], permits: "Too many." })
		);
		await expect(write(fields.backend)).rejects.toThrow(
			"PRUNplanner refused the change: plan_name: Too long. Bad.; permits: Too many."
		);
		await expect(
			write(answering(400, json({})).backend)
		).rejects.toMatchObject({
			code: "tool_error",
			message: "PRUNplanner refused the change.",
		});
		await expect(read(answering(400).backend)).rejects.toMatchObject({
			code: "backend_error",
			message: "PRUNplanner's API answered 400 for /planning/plan/.",
		});
	});

	it("5xx and an unreachable API are backend errors", async () => {
		await expect(
			write(answering(502, "<html>Bad gateway</html>").backend)
		).rejects.toMatchObject({
			code: "backend_error",
			message: "PRUNplanner's API answered 502 for /planning/plan/x/.",
		});
		const down = createBackend({
			apiUrl: "http://backend",
			userAgent: "test",
			fetch: (async () => {
				throw new TypeError("fetch failed");
			}) as typeof fetch,
		});
		await expect(read(down)).rejects.toMatchObject({
			code: "backend_error",
			message: "PRUNplanner's API can't be reached right now.",
		});
		expect(down.stats.calls).toBe(1);
	});

	it("a body of the wrong shape is refused before sending", async () => {
		const { backend, fetch } = answering(200, "{}");
		await expect(
			backend.send(
				"POST",
				"/planning/cx/",
				{ cx_name: 5 },
				z.object({ cx_name: z.string() })
			)
		).rejects.toMatchObject({
			code: "tool_error",
			message:
				"The change for /planning/cx/ doesn't have the shape PRUNplanner expects.",
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	it("a write sends JSON with the key; null sends no body; answers are validated", async () => {
		const { backend, fetch } = answering(200, json({ uuid: "u" }));
		const answer = await backend.send(
			"POST",
			"/planning/cx/",
			{ cx_name: "x" },
			z.object({ cx_name: z.string() }),
			z.object({ uuid: z.string() })
		);
		expect(answer).toEqual({ uuid: "u" });
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe("http://backend/planning/cx/");
		expect(init).toMatchObject({
			method: "POST",
			body: json({ cx_name: "x" }),
			headers: {
				Authorization: `Api-Key ${API_KEY}`,
				"Content-Type": "application/json",
			},
		});
		await backend.send("DELETE", "/planning/cx/u/", null, null);
		const [, del] = fetch.mock.calls[1];
		expect(del?.body).toBeUndefined();
		expect(del?.headers).not.toHaveProperty("Content-Type");
		await expect(
			backend.send(
				"POST",
				"/planning/cx/",
				{},
				null,
				z.object({ other: z.string() })
			)
		).rejects.toThrow(
			"Unexpected data from PRUNplanner's API for /planning/cx/."
		);
	});

	it("without its own fetch it uses the global one; public reads send no key", async () => {
		const global = vi.fn(async () => new Response(json([1])));
		vi.stubGlobal("fetch", global);
		const backend = createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "agent",
		});
		expect(
			await backend.get("/data/materials/", z.array(z.number()), false)
		).toEqual([1]);
		expect(global).toHaveBeenCalledWith("http://backend/data/materials/", {
			method: "GET",
			headers: {
				Accept: "application/json",
				"User-Agent": "agent",
				"X-Forwarded-Proto": "https",
			},
			body: undefined,
		});
		expect(backend.stats.calls).toBe(1);
	});
});

/** a keyed backend over the fake, with extra GET routes */
function keyed(routes: [RegExp, unknown][] = [], status?: number) {
	const fake = fakeBackend(status, routes);
	return {
		fake,
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: fake.fetch,
		}),
	};
}

describe("context: picking the empire", () => {
	it("findEmpireCX without an empire: none", () => {
		expect(findEmpireCX(fixtures.cxs as never, undefined)).toBeUndefined();
		expect(findEmpireCX(fixtures.cxs as never, EMPIRE_UUID)?.cx_name).toBe(
			"PRUN CX REAL"
		);
	});

	it("loadEmpireCX: a default empire without a CX preference", async () => {
		const { backend } = keyed([
			[
				/^\/user\/preferences\/$/,
				{ ...preferenceDefaults, defaultEmpireUuid: RFAB },
			],
		]);
		const picked = await loadEmpireCX(backend, undefined);
		expect(picked.empire?.uuid).toBe(RFAB);
		expect(picked.cx).toBeUndefined();
		expect(picked.note).toBe(
			'Calculated in your default empire "RFab Plan" (MORIA, no CX preference: Universe VWAP 30D). Pass empire_uuid to price in another empire.'
		);
	});

	it("loadEmpireCX: no empires and no single CX: Universe prices, no choices", async () => {
		const { backend } = keyed([
			[/^\/planning\/empire\/$/, []],
			[/^\/planning\/cx\/$/, []],
		]);
		expect(await loadEmpireCX(backend, undefined)).toEqual({
			note: "No empire: priced at Universe VWAP 30D without a faction bonus.",
			choices: undefined,
		});
	});

	it("loadEmpireCX: an unknown requested empire is refused", async () => {
		const { backend } = keyed();
		await expect(
			loadEmpireCX(backend, "00000000-0000-4000-8000-000000000000")
		).rejects.toBeInstanceOf(ToolError);
	});

	it("resolveEmpire: a plan in no empire for a user without empires", () => {
		expect(
			resolveEmpire({ ...plan, empires: undefined }, [], undefined)
		).toEqual({
			empire: undefined,
			note: "The plan is in no empire and you have none: no faction bonus, Universe VWAP 30D prices.",
		});
	});

	it("resolveEmpire: the plan's empire missing from the list", () => {
		const others = empires.filter(
			(e) => !plan.empires!.some((p) => p.uuid === e.uuid)
		);
		expect(resolveEmpire(plan, others, undefined)).toEqual({
			empire: undefined,
			note: "The plan's empire couldn't be loaded: no faction bonus, Universe VWAP 30D prices.",
		});
	});

	it("resolveEmpire: a plan in one empire needs no note", () => {
		const one = { ...plan, empires: [plan.empires![1]] };
		expect(resolveEmpire(one, empires, undefined)).toEqual({
			empire: empires.find((e) => e.uuid === plan.empires![1].uuid),
			note: undefined,
		});
	});
});

describe("empireState: what is stored", () => {
	it("no empire: nothing loaded or stored", async () => {
		const { backend, fake } = keyed();
		expect(
			await storeEmpireStates(backend, [undefined, undefined])
		).toBeUndefined();
		expect(fake.requests).toHaveLength(0);
	});

	it("data that can't be loaded: the stale note, nothing stored", async () => {
		const { backend, fake } = keyed([], 500);
		expect(await storeEmpireStates(backend, [EMPIRE_UUID])).toContain(
			"update when the empire is opened"
		);
		expect(fake.requests.filter((r) => r.method !== "GET")).toEqual([]);
	});

	it("an unknown empire is skipped, the known one stored once", async () => {
		const { backend, fake } = keyed();
		expect(
			await storeEmpireStates(backend, [
				"00000000-0000-4000-8000-000000000000",
				EMPIRE_UUID,
				EMPIRE_UUID,
			])
		).toBeUndefined();
		expect(
			fake.requests
				.filter((r) => r.method !== "GET")
				.map((r) => `${r.method} ${r.path}`)
		).toEqual([`PATCH /planning/empire/${EMPIRE_UUID}/state/`]);
	});
});
