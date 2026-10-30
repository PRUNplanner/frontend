import { describe, it, expect } from "vitest";

import { planetPlots } from "@/features/planet_search/planetPlots.util";

const TS = "2026-10-24T17:37:45.416641Z";

function fields(
	total: number | null,
	used: number | null,
	ghost: number | null = 0,
	ghostAllowed: boolean | null = false
) {
	return {
		plots_total: total,
		plots_used: used,
		ghost_sites: ghost,
		supports_ghost_sites: ghostAllowed,
		plots_updated: TS,
	};
}

describe("planetPlots", () => {
	it("free plots", () => {
		expect(planetPlots(fields(395, 63))).toEqual({
			free: 332,
			total: 395,
			full: false,
			blocked: false,
			ghost: 0,
			ghostAllowed: false,
			updated: TS,
		});
	});

	it("full without ghost sites blocks a new base", () => {
		expect(planetPlots(fields(10, 10))).toMatchObject({
			free: 0,
			full: true,
			blocked: true,
		});
		// more sites than plots: still full, never negative
		expect(planetPlots(fields(10, 12))).toMatchObject({
			free: 0,
			full: true,
		});
	});

	it("full with ghost sites can still take bases", () => {
		expect(planetPlots(fields(418, 418, 96, true))).toMatchObject({
			free: 0,
			full: true,
			blocked: false,
			ghost: 96,
			ghostAllowed: true,
		});
	});

	it("unknown without totals, a planet or the fields", () => {
		expect(planetPlots(fields(null, null))).toBeNull();
		expect(planetPlots(fields(418, null))).toBeNull();
		expect(planetPlots(undefined)).toBeNull();
		// a planet cached before the fields existed
		expect(planetPlots({} as ReturnType<typeof fields>)).toBeNull();
	});

	it("missing ghost fields read as none", () => {
		expect(
			planetPlots({
				...fields(5, 1),
				ghost_sites: null,
				supports_ghost_sites: null,
				plots_updated: null,
			})
		).toMatchObject({ ghost: 0, ghostAllowed: false, updated: null });
	});
});
