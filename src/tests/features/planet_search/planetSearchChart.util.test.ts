import { describe, it, expect } from "vitest";

import {
	CHART_LIMIT,
	chartData,
	chartYMaterial,
} from "@/features/planet_search/planetSearchChart.util";
import { defaultFilter } from "@/features/planet_search/planetSearch.engine";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type { PlanetSearchFilter } from "@/features/planet_search/planetSearch.schemas";
import type { IPlanetSearchContext } from "@/features/planet_search/planetSearch.types";

function planet(
	id: string,
	resources: Record<string, number> = {},
	fertility = -1
): PlanetSearchIndexEntry {
	return {
		planet_natural_id: id,
		planet_name: id,
		system_id: `sys-${id}`,
		surface: true,
		gravity_type: "NORMAL",
		pressure_type: "NORMAL",
		temperature_type: "NORMAL",
		fertility,
		has_localmarket: false,
		has_chamberofcommerce: false,
		has_warehouse: false,
		has_administrationcenter: false,
		has_shipyard: false,
		cogc_program_status: null,
		cogc_programs: [],
		resources: Object.entries(resources).map(([t, daily]) => ({
			material_ticker: t,
			resource_type: "MINERAL",
			daily_extraction: daily,
			max_daily_extraction: daily,
		})),
		plots_total: null,
		plots_used: null,
		ghost_sites: null,
		supports_ghost_sites: null,
		plots_updated: null,
	} as PlanetSearchIndexEntry;
}

// jumps per reference: cx code or plan uuid → planet id → jumps
function context(jumps: Record<string, Record<string, number>>): IPlanetSearchContext {
	return {
		now: 0,
		refJumps: (ref) => {
			const table = jumps[ref.kind === "cx" ? ref.code : ref.planUuid];
			return table
				? new Map(Object.entries(table).map(([id, j]) => [`sys-${id}`, j]))
				: undefined;
		},
	};
}

const filter = (f: Partial<PlanetSearchFilter> = {}): PlanetSearchFilter => ({
	...defaultFilter(),
	...f,
});
const withH2O = filter({
	materialGroups: [{ op: "all", materials: ["H2O", "FEO"] }],
});

const A = planet("A", { H2O: 30, FEO: 5 }, 0.5);
const B = planet("B", { H2O: 20 }, 0);
const C = planet("C", { H2O: 10 });

describe("chartData X axis", () => {
	it("uses the jumps to the Distance pick", () => {
		const data = chartData(
			[A, B],
			{ ...withH2O, references: [{ kind: "cx", code: "IC1" }] },
			context({ IC1: { A: 3, B: 8 } }),
			"H2O"
		);
		expect(data.axis).toEqual({
			refs: [{ kind: "cx", code: "IC1" }],
			nearest: false,
		});
		expect(data.points.map((p) => [p.planet.planet_natural_id, p.x])).toEqual([
			["A", 3],
			["B", 8],
		]);
	});

	it("takes the farthest of several picks, and counts planets without a route", () => {
		const data = chartData(
			[A, B, C],
			{
				...withH2O,
				references: [
					{ kind: "cx", code: "IC1" },
					{ kind: "plan", planUuid: "p1" },
				],
			},
			context({ IC1: { A: 3, B: 8, C: 1 }, p1: { A: 6, B: 2 } }),
			"H2O"
		);
		expect(data.points.map((p) => p.x)).toEqual([6, 8]);
		expect(data.noRoute).toBe(1);
	});

	it("falls back to the exchange nearest to all results", () => {
		const data = chartData(
			[A, B],
			withH2O,
			context({
				AI1: { A: 10, B: 10 },
				CI1: { A: 2, B: 3 },
				IC1: { A: 1 },
				NC1: { A: 4, B: 4 },
			}),
			"H2O"
		);
		expect(data.axis).toEqual({
			refs: [{ kind: "cx", code: "CI1" }],
			nearest: true,
		});
		expect(data.points.map((p) => p.x)).toEqual([2, 3]);
	});
});

describe("chartData Y axis", () => {
	it("plots the material's daily output and counts planets without it", () => {
		const data = chartData([A, B], withH2O, context({ CI1: { A: 1, B: 1 } }), "FEO");
		expect(data.points.map((p) => p.y)).toEqual([5]);
		expect(data.noValue).toBe(1);
	});

	it("plots fertility without a material, skipping planets that aren't fertile", () => {
		const data = chartData(
			[A, B, C],
			filter(),
			context({ CI1: { A: 1, B: 1, C: 1 } }),
			null
		);
		expect(data.points.map((p) => Math.round(p.y))).toEqual([115, 100]);
		expect(data.noValue).toBe(1);
	});

	it("keeps the picked material while it is searched, else the first", () => {
		expect(chartYMaterial(withH2O, "FEO")).toBe("FEO");
		expect(chartYMaterial(withH2O, "ALO")).toBe("H2O");
		expect(chartYMaterial(withH2O, null)).toBe("H2O");
		expect(chartYMaterial(filter(), "FEO")).toBeNull();
	});
});

describe("chartData limit", () => {
	it(`plots the first ${CHART_LIMIT} results and reports the total`, () => {
		const many = Array.from({ length: CHART_LIMIT + 5 }, (_, i) =>
			planet(`P${i}`, { H2O: i })
		);
		const jumps = Object.fromEntries(many.map((p) => [p.planet_natural_id, 1]));
		const data = chartData(many, withH2O, context({ CI1: jumps }), "H2O");
		expect(data.points).toHaveLength(CHART_LIMIT);
		expect(data.points[0].planet.planet_natural_id).toBe("P0");
		expect(data.capped).toBe(CHART_LIMIT + 5);

		expect(chartData(many.slice(0, 3), withH2O, context({ CI1: jumps }), "H2O").capped).toBe(0);
	});
});
