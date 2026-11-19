// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// MCP
import { createBackend } from "@/mcp/backend";
import { TOOLS } from "@/mcp/tools";
import { API_KEY, fakeBackend, fixtures } from "@/tests/mcp/fakeBackend";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";

// two planets of our own, found by name: a rocky one with free plots and
// a COGC program running for years, and a gaseous one without plot data
const [template] = fixtures.searchIndex;
const entry = (over: Record<string, unknown>) => ({
	...template,
	surface: true,
	gravity_type: "NORMAL",
	pressure_type: "NORMAL",
	temperature_type: "NORMAL",
	resources: [],
	cogc_programs: [],
	...over,
});
const ROCKY = entry({
	planet_natural_id: "ZZ-001a",
	planet_name: "Zzplans Rock",
	plots_total: 10,
	plots_used: 4,
	cogc_programs: [
		{
			program_type: "ADVERTISING_METALLURGY",
			start_epochms: 0,
			end_epochms: 9e15,
		},
	],
});
const GAS = entry({
	planet_natural_id: "ZZ-002b",
	planet_name: "Zzplans Gas",
	surface: false,
});
const FULL = entry({
	planet_natural_id: "ZZ-003c",
	planet_name: "Zzplans Full",
	plots_total: 10,
	plots_used: 9,
});

let env: IToolEnv;
beforeEach(() => {
	env = {
		appUrl: "https://app.test",
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: fakeBackend(undefined, [
				[
					/^\/data\/planets\/search-index\/$/,
					[...fixtures.searchIndex, ROCKY, GAS, FULL],
				],
			]).fetch,
		}),
	};
});
const run = (args: Record<string, unknown>): Promise<any> =>
	TOOLS.find((t) => t.name === "find_planets")!.run(args as never, env);

describe("find_planets: surfaces, plots and programs", () => {
	it("gaseous planets on request: nothing hidden as gaseous", async () => {
		const { data } = await run({
			name: "Zzplans",
			surface: ["rocky", "gaseous"],
		});
		expect(
			data.planets.map(
				(p: { planet_natural_id: string }) => p.planet_natural_id
			)
		).toEqual(expect.arrayContaining(["ZZ-001a", "ZZ-002b", "ZZ-003c"]));
		expect(data.hidden_by_default_filter.gaseous).toBe(0);
		const gas = data.planets.find(
			(p: { planet_natural_id: string }) =>
				p.planet_natural_id === "ZZ-002b"
		);
		expect(gas.surface).toBe("gaseous");
		expect(gas.plots).toBeNull();
		const rock = data.planets.find(
			(p: { planet_natural_id: string }) =>
				p.planet_natural_id === "ZZ-001a"
		);
		expect(rock.surface).toBe("rocky");
		expect(rock.cogc_program).toBe("ADVERTISING_METALLURGY");
		expect(rock.cogc_boost).toMatch(/^\+25 % for METALLURGY buildings: /);
	});

	it("free_plots keeps planets with enough known free plots", async () => {
		const { data, text } = await run({
			name: "Zzplans",
			surface: ["rocky", "gaseous"],
			free_plots: 3,
		});
		// the gaseous one has no plot data, the full one 1 free plot
		expect(
			data.planets.map(
				(p: { planet_natural_id: string }) => p.planet_natural_id
			)
		).toEqual(["ZZ-001a"]);
		expect(data.planets[0].plots.free).toBe(6);
		expect(text).toBe("1 planet match.");
	});
});
