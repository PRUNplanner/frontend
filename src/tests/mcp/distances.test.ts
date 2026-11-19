// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// MCP
import { createBackend } from "@/mcp/backend";
import { TOOLS } from "@/mcp/tools";
import { EXCHANGE_SYSTEMS } from "@/mcp/tools/shared";
import {
	API_KEY,
	PLAN_UUID,
	fakeBackend,
	fixtures,
} from "@/tests/mcp/fakeBackend";
import { pathfinder } from "@/features/pathfinding/pathfinder";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";

let env: IToolEnv;
beforeEach(() => {
	env = {
		appUrl: "https://app.test",
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: fakeBackend().fetch,
		}),
	};
});
const run = (args: Record<string, unknown>): Promise<any> =>
	TOOLS.find((t) => t.name === "get_distances")!
		.run(args, env)
		.then((r) => r.data);

const system = fixtures.planet.system_id;
const pf = pathfinder();

describe("get_distances", () => {
	it("jumps between a planet, a plan and exchanges, as the pathfinder counts", async () => {
		const data = await run({
			places: ["KW-688c", PLAN_UUID, "ai1", "NC1"],
		});
		expect(data.places.map((p: { kind: string }) => p.kind)).toEqual([
			"planet",
			"plan",
			"exchange",
			"exchange",
		]);
		const pair = (from: string, to: string) =>
			data.pairs.find(
				(p: { from: string; to: string }) =>
					p.from.includes(from) && p.to.includes(to)
			).jumps;
		// the plan sits on the same planet: the first pair, planet ↔ plan
		expect(data.pairs[0]).toMatchObject({
			from: "Etherwind (KW-688c)",
			to: `${fixtures.plan.plan_name} (KW-688c)`,
			jumps: 0,
		});
		expect(pair("Etherwind", "AI1")).toBe(
			pf.getPathBetweenLength(system, EXCHANGE_SYSTEMS.AI1)
		);
		expect(pair("AI1", "NC1")).toBe(
			pf.getJumpsFrom(EXCHANGE_SYSTEMS.AI1).get(EXCHANGE_SYSTEMS.NC1)
		);
		expect(data.pairs).toHaveLength(6);
		// visiting in the order given: planet, plan (0), AI1, NC1
		expect(data.order_jumps).toBe(
			pair("Etherwind", "AI1") + pair("AI1", "NC1")
		);
		expect(data.places[0].nearest_exchanges).toHaveLength(2);
	});

	it("path lists the systems along the route", async () => {
		const data = await run({ places: ["KW-688c", "CI1"], path: true });
		const [pair] = data.pairs;
		expect(pair.route).toHaveLength(pair.jumps + 1);
		expect(pair.route[0]).toBe(pf.getSystemName(system));
	});

	it("refuses unknown places and long paths", async () => {
		await expect(
			run({ places: Array(7).fill("AI1"), path: true })
		).rejects.toThrow("up to 6 places");
		await expect(
			run({ places: ["AI1", "Nowhere Prime"] })
		).rejects.toThrow();
	});
});
