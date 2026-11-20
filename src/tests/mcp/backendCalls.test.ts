// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// MCP
import {
	API_KEY,
	EMPIRE_UUID,
	fakeBackend,
	fixtures,
} from "@/tests/mcp/fakeBackend";

/**
 * How many backend requests list_plans and get_empire make for an empire
 * of 16 plans on 16 planets, so a request per plan or planet can't come
 * back; the output is snapshotted so batching changes no number
 */

const PLANS = 16;
const planetId = (i: number) => `AB-${String(100 + i)}c`;
const plans = Array.from({ length: PLANS }, (_, i) => ({
	...fixtures.plan,
	uuid: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
	plan_name: `Base ${i}`,
	planet_natural_id: planetId(i),
}));
const planetFor = (id: string) => ({
	...fixtures.planet,
	planet_natural_id: id,
});

let paths: string[];
let inFlight: number;
let maxInFlight: number;

async function setup() {
	// a cold server: game data and planets aren't cached yet
	vi.resetModules();
	const { TOOLS } = await import("@/mcp/tools");
	const { createBackend } = await import("@/mcp/backend");
	const base = fakeBackend(undefined, [
		[/^\/planning\/plan\/$/, plans],
		[
			/^\/planning\/empire\/[^/]+\/plans\/$/,
			plans.map((p) => ({ ...p, empires: undefined })),
		],
	]);
	const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const path = new URL(String(input)).pathname;
		paths.push(path);
		inFlight++;
		maxInFlight = Math.max(maxInFlight, inFlight);
		// answered a tick later, so concurrent requests overlap
		await new Promise((r) => setTimeout(r, 1));
		inFlight--;
		const single = /^\/data\/planet\/([^/]+)\/$/.exec(path);
		if (single) return new Response(JSON.stringify(planetFor(single[1])));
		if (path === "/data/planets/multiple/")
			return new Response(
				JSON.stringify(
					(JSON.parse(String(init?.body)) as string[]).map(planetFor)
				)
			);
		return base.fetch(input, init);
	}) as typeof globalThis.fetch;
	const backend = createBackend({
		apiUrl: "http://backend",
		apiKey: API_KEY,
		userAgent: "test",
		fetch,
	});
	const run = (name: string, args: Record<string, unknown> = {}) =>
		TOOLS.find((t) => t.name === name)!.run(args, {
			appUrl: "https://app.test",
			backend,
		});
	return { run, backend };
}

beforeEach(() => {
	paths = [];
	inFlight = 0;
	maxInFlight = 0;
});

describe("MCP backend calls per tool call", () => {
	it("list_plans: a constant number of requests, however many plans", async () => {
		const { run, backend } = await setup();
		const result = await run("list_plans");
		expect(result).toMatchSnapshot();
		expect(result.data).toMatchObject({ total: PLANS });
		expect(paths.filter((p) => p.startsWith("/data/planet"))).toEqual([
			"/data/planets/multiple/",
		]);
		// plans, empires, CX preferences, preferences (a plan in 2 empires),
		// 4 game data, 1 planet batch
		expect(backend.stats.calls).toBe(9);
		expect(backend.stats.calls).toBe(paths.length);

		// warm: game data and planets come from the server's cache
		paths = [];
		const warm = await setup().then(async (s) => {
			await s.run("list_plans");
			paths = [];
			const again = await s.run("list_plans");
			return { again, calls: paths.length };
		});
		expect(warm.again).toEqual(result);
		expect(warm.calls).toBe(4);
	});

	it("get_empire: a constant number of requests, however many plans", async () => {
		const { run, backend } = await setup();
		const result = await run("get_empire", { empire_uuid: EMPIRE_UUID });
		expect(result).toMatchSnapshot();
		expect(paths.filter((p) => p.startsWith("/data/planet"))).toEqual([
			"/data/planets/multiple/",
		]);
		// empires, CX preferences, the empire's plans, 4 game data, 1 batch
		expect(backend.stats.calls).toBe(8);
	});

	it("caps concurrent backend requests per tool call", async () => {
		const { run, backend } = await setup();
		// the planet requests of a tool without batching run through the cap
		await Promise.all(
			plans.map((p) =>
				run("get_planet", { planet_natural_id: p.planet_natural_id })
			)
		);
		expect(maxInFlight).toBeLessThanOrEqual(6);
		expect(backend.stats.wallMs).toBeLessThanOrEqual(backend.stats.ms);
	});
});
