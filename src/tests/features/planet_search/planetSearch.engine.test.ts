import { describe, it, expect } from "vitest";

// Engine
import {
	activeChips,
	activeProgram,
	applySortClick,
	addMaterial,
	defaultFilter,
	defaultSort,
	facetCounts,
	fertilityPercent,
	filteredMaterials,
	foundMaterials,
	materialMax,
	planetInfrastructure,
	rankValues,
	filterPlanets,
	indexMaterials,
	parseRefKey,
	planetJumps,
	refKey,
	SEARCH_COGC,
	SEARCH_CX,
	SEARCH_EXTRAS,
	SEARCH_INFRASTRUCTURE,
	SEARCH_SURFACES,
	setGroups,
	sortPlanets,
	toggle,
	toggleReference,
	zeroResultHints,
} from "@/features/planet_search/planetSearch.engine";
import {
	environmentExtras,
	planetBuckets,
} from "@/features/planet_search/environmentExtras.util";
import { createSearchContext } from "@/features/planet_search/planetSearchContext.util";
import { getPlanetSpecialMaterials } from "@/features/planning/engine/buildings";

// Types & Interfaces
import type {
	Planet,
	PlanetEnvironmentType,
	PlanetSearchIndexEntry,
} from "@/features/api/schemas/gameData.schemas";
import type { IPlanetSearchContext } from "@/features/planet_search/planetSearch.types";
import type {
	PlanetSearchFilter,
	PlanetSearchReference,
} from "@/features/planet_search/planetSearch.schemas";

// test data
import fixture from "@/tests/test_data/api_data_planet_search_index.json";

const index = fixture as PlanetSearchIndexEntry[];
// the fixture only holds programs running at or after this time
const NOW = 1790694000000;

function planet(
	id: string,
	overrides: Partial<PlanetSearchIndexEntry> = {},
	resources: Record<string, number> = {}
): PlanetSearchIndexEntry {
	return {
		planet_natural_id: id,
		planet_name: `Name ${id}`,
		system_id: `sys-${id}`,
		surface: true,
		gravity_type: "NORMAL",
		pressure_type: "NORMAL",
		temperature_type: "NORMAL",
		fertility: -1,
		has_localmarket: false,
		has_chamberofcommerce: false,
		has_warehouse: false,
		has_administrationcenter: false,
		has_shipyard: false,
		cogc_program_status: null,
		cogc_programs: [],
		resources: Object.entries(resources).map(([t, d]) => ({
			material_ticker: t,
			resource_type: "MINERAL",
			daily_extraction: d,
			max_daily_extraction: 50,
		})),
		...overrides,
	};
}

const ctx: IPlanetSearchContext = { now: NOW, refJumps: () => undefined };

function filter(overrides: Partial<PlanetSearchFilter>): PlanetSearchFilter {
	return {
		...defaultFilter(),
		surface: ["rocky", "gaseous"],
		acceptedExtras: [...SEARCH_EXTRAS],
		...overrides,
	};
}

const ids = (list: PlanetSearchIndexEntry[]) =>
	list.map((p) => p.planet_natural_id);

describe("planet search engine", () => {
	describe("materials (AC3, AC4)", () => {
		const small = [
			planet("FEO+H2O", {}, { FEO: 20, H2O: 5 }),
			planet("MAG+H2O", {}, { MAG: 10, H2O: 5 }),
			planet("FEO", {}, { FEO: 20 }),
			planet("MAG+O", {}, { MAG: 10, O: 3 }),
			planet("H2O", {}, { H2O: 5 }),
		];

		it("any-of group AND all-of group", () => {
			const f = filter({
				materialGroups: [
					{ op: "any", materials: ["FEO", "MAG"] },
					{ op: "all", materials: ["H2O"] },
				],
				groupsOp: "all",
			});
			expect(ids(filterPlanets(small, f, ctx))).toEqual([
				"FEO+H2O",
				"MAG+H2O",
			]);
		});

		it("all-of pairs combined with any group", () => {
			const f = filter({
				materialGroups: [
					{ op: "all", materials: ["FEO", "H2O"] },
					{ op: "all", materials: ["MAG", "O"] },
				],
				groupsOp: "any",
			});
			expect(ids(filterPlanets(small, f, ctx))).toEqual([
				"FEO+H2O",
				"MAG+O",
			]);
		});

		it("more than 3 materials and empty groups", () => {
			const f = filter({
				materialGroups: [
					{ op: "any", materials: ["FEO", "MAG", "O", "H2O"] },
					{ op: "all", materials: [] },
				],
			});
			expect(filterPlanets(small, f, ctx)).toHaveLength(5);
		});

		it("minimum daily extraction", () => {
			const f = filter({
				materialGroups: [{ op: "all", materials: ["FEO"] }],
				minDaily: { FEO: 15 },
			});
			const planets = [
				planet("low", {}, { FEO: 14.9 }),
				planet("at", {}, { FEO: 15 }),
			];
			expect(ids(filterPlanets(planets, f, ctx))).toEqual(["at"]);
		});

		it("minimums hold on the fixture", () => {
			const f = filter({
				materialGroups: [{ op: "all", materials: ["FEO"] }],
				minDaily: { FEO: 15 },
			});
			const result = filterPlanets(index, f, ctx);
			expect(result.length).toBeGreaterThan(0);
			for (const p of result)
				expect(
					p.resources.find((r) => r.material_ticker === "FEO")!
						.daily_extraction
				).toBeGreaterThanOrEqual(15);
		});
	});

	describe("environment (AC5)", () => {
		it("rocky + accepted MGC only allows MCG and MGC", () => {
			const f = filter({ surface: ["rocky"], acceptedExtras: ["MGC"] });
			const result = filterPlanets(index, f, ctx);
			expect(result.length).toBeGreaterThan(0);
			for (const p of result)
				expect(
					environmentExtras(p).every((e) =>
						["MCG", "MGC"].includes(e.ticker)
					)
				).toBe(true);
		});

		it("matches the plan engine for every bucket combination", () => {
			const types: PlanetEnvironmentType[] = ["LOW", "NORMAL", "HIGH"];
			const values = {
				gravity: { LOW: 0.1, NORMAL: 1, HIGH: 3 },
				pressure: { LOW: 0.1, NORMAL: 1, HIGH: 3 },
				temperature: { LOW: -50, NORMAL: 20, HIGH: 100 },
			};
			let combinations = 0;
			for (const surface of [true, false])
				for (const g of types)
					for (const pr of types)
						for (const t of types) {
							const full = {
								surface,
								gravity: values.gravity[g],
								pressure: values.pressure[pr],
								temperature: values.temperature[t],
							} as Planet;
							const buckets = planetBuckets(full);
							expect(buckets).toEqual({
								surface,
								gravity_type: g,
								pressure_type: pr,
								temperature_type: t,
							});
							expect(
								environmentExtras(buckets).map((e) => e.ticker)
							).toEqual(
								getPlanetSpecialMaterials(full, 1).map(
									(m) => m.ticker
								)
							);
							combinations++;
						}
			expect(combinations).toBe(54);
		});

		it("surface filter", () => {
			const planets = [
				planet("rock"),
				planet("gas", { surface: false }),
			];
			expect(
				ids(filterPlanets(planets, filter({ surface: ["gaseous"] }), ctx))
			).toEqual(["gas"]);
			expect(
				filterPlanets(planets, filter({ surface: [] }), ctx)
			).toHaveLength(0);
		});
	});

	describe("cogc, infrastructure, fertility, text", () => {
		const programs = [
			planet("ended", {
				cogc_programs: [
					{
						program_type: "WORKFORCE_PIONEERS",
						start_epochms: NOW - 2000,
						end_epochms: NOW - 1000,
					},
				],
			}),
			planet("running", {
				cogc_programs: [
					{
						program_type: "WORKFORCE_PIONEERS",
						start_epochms: NOW - 1000,
						end_epochms: NOW + 1000,
					},
				],
			}),
		];

		it("an ended program doesn't match (AC6)", () => {
			const f = filter({ cogc: ["WORKFORCE_PIONEERS"] });
			expect(ids(filterPlanets(programs, f, ctx))).toEqual(["running"]);
			expect(activeProgram(programs[0], NOW)).toBeNull();
			expect(activeProgram(programs[1], NOW)).toBe("WORKFORCE_PIONEERS");
		});

		it("infrastructure is all-of", () => {
			const planets = [
				planet("lm", { has_localmarket: true }),
				planet("lm+war", { has_localmarket: true, has_warehouse: true }),
			];
			const f = filter({ infrastructure: ["LM", "WAR"] });
			expect(ids(filterPlanets(planets, f, ctx))).toEqual(["lm+war"]);
		});

		it("fertile and text", () => {
			const planets = [
				planet("AB-001a", { fertility: 0.2, planet_name: "Montem" }),
				planet("AB-002b"),
			];
			expect(
				ids(filterPlanets(planets, filter({ fertile: true }), ctx))
			).toEqual(["AB-001a"]);
			expect(
				ids(filterPlanets(planets, filter({ text: " monT " }), ctx))
			).toEqual(["AB-001a"]);
			expect(
				ids(filterPlanets(planets, filter({ text: "002" }), ctx))
			).toEqual(["AB-002b"]);
		});
	});

	describe("references (AC7)", () => {
		const planets = [
			planet("near-both", { system_id: "s1" }),
			planet("near-one", { system_id: "s2" }),
			planet("unreachable", { system_id: "s3" }),
		];
		const a: PlanetSearchReference = { kind: "plan", planUuid: "a" };
		const b: PlanetSearchReference = { kind: "plan", planUuid: "b" };
		const jumps: Record<string, Map<string, number>> = {
			"plan:a": new Map([
				["s1", 2],
				["s2", 3],
			]),
			"plan:b": new Map([
				["s1", 4],
				["s2", 5],
			]),
		};
		const refCtx: IPlanetSearchContext = {
			now: NOW,
			refJumps: (r) => jumps[refKey(r)],
		};

		it("must be within max jumps of every reference", () => {
			const f = filter({ references: [a, b], maxJumps: 4 });
			expect(ids(filterPlanets(planets, f, refCtx))).toEqual([
				"near-both",
			]);
		});

		it("unknown references are ignored", () => {
			const f = filter({
				references: [{ kind: "plan", planUuid: "other" }],
				maxJumps: 0,
			});
			expect(filterPlanets(planets, f, refCtx)).toHaveLength(3);
		});

		it("real jumps from CX and plans", () => {
			const target = index[0];
			const real = createSearchContext(
				index,
				{ mine: target.planet_natural_id },
				NOW
			);
			expect(
				planetJumps(target, { kind: "plan", planUuid: "mine" }, real)
			).toBe(0);
			expect(
				planetJumps(target, { kind: "plan", planUuid: "gone" }, real)
			).toBe(-1);
			const f = filter({
				references: [{ kind: "cx", code: "NC1" }],
				maxJumps: 3,
			});
			const result = filterPlanets(index, f, real);
			expect(result.length).toBeGreaterThan(0);
			for (const p of result) {
				const j = planetJumps(p, { kind: "cx", code: "NC1" }, real);
				expect(j).toBeGreaterThanOrEqual(0);
				expect(j).toBeLessThanOrEqual(3);
			}
		});
	});

	describe("facet counts (AC8)", () => {
		const realCtx = createSearchContext(
			index,
			{ p1: index[10].planet_natural_id, p2: index[500].planet_natural_id },
			NOW
		);
		const materials = indexMaterials(index);
		const refs: PlanetSearchReference[] = [
			{ kind: "plan", planUuid: "p1" },
			{ kind: "plan", planUuid: "p2" },
			...SEARCH_CX.map((code) => ({ kind: "cx" as const, code })),
		];

		// seeded, so a failure reproduces
		let seed = 42;
		const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
		const pick = <T>(list: T[], p: number) =>
			list.filter(() => rnd() < p);

		function randomFilter(): PlanetSearchFilter {
			const groups = Array.from({ length: 1 + Math.floor(rnd() * 2) }, () => ({
				op: rnd() < 0.5 ? ("any" as const) : ("all" as const),
				materials: pick(materials, 0.04),
			}));
			const used = groups.flatMap((g) => g.materials);
			return {
				text: rnd() < 0.1 ? "a" : "",
				materialGroups: groups,
				groupsOp: rnd() < 0.5 ? "any" : "all",
				minDaily: Object.fromEntries(
					pick(used, 0.3).map((t) => [t, Math.floor(rnd() * 20)])
				),
				cogc: pick(SEARCH_COGC, 0.1),
				infrastructure: pick(SEARCH_INFRASTRUCTURE, 0.1),
				fertile: rnd() < 0.2,
				surface: pick(SEARCH_SURFACES, 0.7),
				acceptedExtras: pick(SEARCH_EXTRAS, 0.6),
				references: pick(refs, 0.15),
				maxJumps: Math.floor(rnd() * 31),
			};
		}

		const count = (f: PlanetSearchFilter) =>
			filterPlanets(index, f, realCtx).length;

		it("every count equals the toggled filter's result count", () => {
			for (let run = 0; run < 8; run++) {
				const f = randomFilter();
				const facets = facetCounts(index, f, realCtx, materials, refs);

				facets.materials.forEach((byTicker, gi) =>
					Object.entries(byTicker)
						.filter(() => rnd() < 0.15)
						.forEach(([t, n]) =>
							expect(n).toBe(count(addMaterial(f, gi, t)))
						)
				);
				for (const s of SEARCH_SURFACES)
					expect(facets.surface[s]).toBe(
						count({ ...f, surface: toggle(f.surface, s) })
					);
				expect(facets.fertile).toBe(count({ ...f, fertile: !f.fertile }));
				for (const e of SEARCH_EXTRAS)
					expect(facets.extras[e]).toBe(
						count({ ...f, acceptedExtras: toggle(f.acceptedExtras, e) })
					);
				for (const c of SEARCH_COGC)
					expect(facets.cogc[c]).toBe(
						count({ ...f, cogc: toggle(f.cogc, c) })
					);
				for (const v of SEARCH_INFRASTRUCTURE)
					expect(facets.infrastructure[v]).toBe(
						count({ ...f, infrastructure: toggle(f.infrastructure, v) })
					);
				for (const r of refs)
					expect(facets.references[refKey(r)]).toBe(
						count(toggleReference(f, r))
					);
			}
		});

		it("zero result hints (AC9)", () => {
			const f = filter({
				materialGroups: [{ op: "all", materials: ["HE3"] }],
				surface: ["rocky"],
				acceptedExtras: [],
				references: [{ kind: "cx", code: "NC1" }],
				maxJumps: 0,
			});
			expect(count(f)).toBe(0);

			const hints = zeroResultHints(index, f, realCtx);
			expect(hints.length).toBeGreaterThan(0);
			expect(hints.length).toBeLessThanOrEqual(3);
			for (let i = 1; i < hints.length; i++)
				expect(hints[i - 1].count).toBeGreaterThanOrEqual(hints[i].count);
			for (const h of hints) expect(count(h.filter)).toBe(h.count);
		});

		it("hints are empty when nothing relaxes to results", () => {
			const f = filter({ text: "no such planet" });
			const hints = zeroResultHints(index, f, realCtx);
			expect(hints.map((h) => h.kind)).toEqual(["chip"]);
			expect(zeroResultHints([], f, realCtx)).toEqual([]);
		});
	});

	describe("chips", () => {
		it("lists every active constraint with its removal", () => {
			const f: PlanetSearchFilter = {
				text: "foo",
				materialGroups: [
					{ op: "any", materials: ["FEO", "MAG"] },
					{ op: "all", materials: [] },
					{ op: "all", materials: ["H2O"] },
				],
				groupsOp: "all",
				minDaily: { FEO: 15, H2O: 2 },
				cogc: ["WORKFORCE_PIONEERS"],
				infrastructure: ["LM", "WAR"],
				fertile: true,
				surface: ["rocky", "gaseous"],
				acceptedExtras: ["MGC"],
				references: [{ kind: "cx", code: "AI1" }],
				maxJumps: 4,
			};
			const chips = activeChips(f);
			expect(chips.map((c) => c.key)).toEqual([
				"text",
				"group:0",
				"group:2",
				"cogc",
				"infra:LM",
				"infra:WAR",
				"fertile",
				"surface",
				"extras",
				"references",
			]);
			const group2 = chips.find((c) => c.key === "group:2")!.remove;
			expect(group2.materialGroups).toHaveLength(2);
			expect(group2.minDaily).toEqual({ FEO: 15 });
			expect(chips.find((c) => c.key === "infra:LM")!.remove.infrastructure).toEqual(["WAR"]);
			expect(activeChips(defaultFilter())).toEqual([]);
		});

		it("any-group searches are one chip", () => {
			const f = filter({
				materialGroups: [
					{ op: "all", materials: ["FEO", "H2O"] },
					{ op: "all", materials: ["MAG", "O"] },
				],
				groupsOp: "any",
				minDaily: { FEO: 3 },
			});
			const chips = activeChips(f);
			expect(chips[0].kind).toBe("groups_any");
			expect(chips[0].remove.materialGroups).toEqual([
				{ op: "any", materials: [] },
			]);
			expect(chips[0].remove.minDaily).toEqual({});
		});
	});

	describe("sorting and helpers", () => {
		const planets = [
			planet("B", { planet_name: "", fertility: 0.3, system_id: "s2" }, { FEO: 5 }),
			planet("A", { planet_name: "Alpha", system_id: "s1" }, { FEO: 9 }),
			planet("C", { planet_name: "Charlie", fertility: 0.1, system_id: "s3" }),
		];
		const sortCtx: IPlanetSearchContext = {
			now: NOW,
			refJumps: () =>
				new Map([
					["s1", 3],
					["s2", 1],
				]),
		};

		it("sorts by name, fertility, material and jumps; absent last", () => {
			expect(ids(sortPlanets(planets, [{ key: "name", dir: "asc" }], ctx))).toEqual(["A", "B", "C"]);
			expect(ids(sortPlanets(planets, [{ key: "name", dir: "desc" }], ctx))).toEqual(["C", "B", "A"]);
			expect(ids(sortPlanets(planets, [{ key: "fert", dir: "desc" }], ctx))).toEqual(["B", "C", "A"]);
			expect(ids(sortPlanets(planets, [{ key: "mat:FEO", dir: "desc" }], ctx))).toEqual(["A", "B", "C"]);
			expect(ids(sortPlanets(planets, [{ key: "mat:FEO", dir: "asc" }], ctx))).toEqual(["B", "A", "C"]);
			expect(ids(sortPlanets(planets, [{ key: "ref:cx:NC1", dir: "asc" }], sortCtx))).toEqual(["B", "A", "C"]);
			expect(ids(sortPlanets(planets, [{ key: "ref:bogus", dir: "asc" }], sortCtx))).toEqual(["B", "A", "C"]);
		});

		it("default sort", () => {
			expect(defaultSort(defaultFilter())).toEqual({ key: "name", dir: "asc" });
			expect(
				defaultSort(filter({ references: [{ kind: "cx", code: "IC1" }] }))
			).toEqual({ key: "ref:cx:IC1", dir: "asc" });
			expect(
				defaultSort(
					filter({
						materialGroups: [{ op: "any", materials: ["MAG", "FEO"] }],
						references: [{ kind: "cx", code: "IC1" }],
					})
				)
			).toEqual({ key: "mat:MAG", dir: "desc" });
		});

		it("reference keys", () => {
			expect(parseRefKey("plan:abc")).toEqual({ kind: "plan", planUuid: "abc" });
			expect(parseRefKey("cx:NC1")).toEqual({ kind: "cx", code: "NC1" });
			expect(parseRefKey("cx:XX1")).toBeUndefined();
			expect(parseRefKey("plan:")).toBeUndefined();
			expect(parseRefKey("nothing")).toBeUndefined();
		});

		it("groups and materials", () => {
			const f = addMaterial(defaultFilter(), 0, "FEO");
			expect(addMaterial(f, 0, "FEO")).toEqual(f);
			expect(setGroups(f, []).materialGroups).toEqual([
				{ op: "any", materials: [] },
			]);
			expect(indexMaterials([planet("x", {}, { O: 1, AR: 2 })])).toEqual(["AR", "O"]);
		});
	});

	describe("display helpers", () => {
		it("fertility, maxima, found and filtered materials, infrastructure", () => {
			expect(fertilityPercent(planet("x"))).toBeNull();
			expect(fertilityPercent(planet("x", { fertility: 0 }))).toBe(100);
			expect(fertilityPercent(planet("x", { fertility: 0.33 }))).toBeCloseTo(110);

			const planets = [
				planet("a", {}, { FEO: 5 }),
				planet("b", {}, { FEO: 9, O: 1 }),
			];
			planets[1].resources[0].max_daily_extraction = 60;
			expect(materialMax(planets)).toEqual({ FEO: 60, O: 50 });
			// data without maxima (0) scales against the best planet
			const noMax = [planet("c", {}, { FEO: 7 }), planet("d", {}, { FEO: 12 })];
			for (const p of noMax) p.resources[0].max_daily_extraction = 0;
			expect(materialMax(noMax)).toEqual({ FEO: 12 });
			expect(foundMaterials(planets)).toEqual({ FEO: 2, O: 1 });
			expect(
				filteredMaterials(
					filter({
						materialGroups: [
							{ op: "any", materials: ["O", "FEO"] },
							{ op: "all", materials: ["FEO"] },
						],
					})
				)
			).toEqual(["O", "FEO"]);
			expect(
				planetInfrastructure(
					planet("x", {
						has_localmarket: true,
						has_chamberofcommerce: true,
						has_warehouse: true,
						has_administrationcenter: true,
						has_shipyard: true,
					})
				)
			).toEqual(["LM", "COGC", "WAR", "ADM", "SHY"]);
		});

		it("ranks compare values", () => {
			expect(rankValues([5], true)).toEqual([null]);
			expect(rankValues([1, 3, 2], true)).toEqual([0, 1, 0.5]);
			expect(rankValues([1, 3, 2], false)).toEqual([1, 0, 0.5]);
			expect(rankValues([4, 4], true)).toEqual([1, 1]);
			// a missing value is worst, the others scale from 0.4
			expect(rankValues([1, null, 3], true)).toEqual([0.4, 0, 1]);
		});
	});

	describe("sort chains", () => {
		const planets = [
			planet("far-rich", { system_id: "s2" }, { FEO: 30 }),
			planet("near-poor", { system_id: "s1" }, { FEO: 5 }),
			planet("near-rich", { system_id: "s1" }, { FEO: 20 }),
			planet("far-none", { system_id: "s2" }),
		];
		const chainCtx: IPlanetSearchContext = {
			now: NOW,
			refJumps: () =>
				new Map([
					["s1", 1],
					["s2", 3],
				]),
		};

		it("each next key breaks the ties before it", () => {
			expect(
				ids(
					sortPlanets(
						planets,
						[
							{ key: "ref:cx:NC1", dir: "asc" },
							{ key: "mat:FEO", dir: "desc" },
						],
						chainCtx
					)
				)
			).toEqual(["near-rich", "near-poor", "far-rich", "far-none"]);
			// no keys keeps the order
			expect(ids(sortPlanets(planets, [], chainCtx))).toEqual(ids(planets));
		});

		it("clicks: plain replaces or flips, shift adds, flips, removes", () => {
			const one = [{ key: "name", dir: "asc" as const }];
			expect(applySortClick(one, "name", "asc", false)).toEqual([
				{ key: "name", dir: "desc" },
			]);
			expect(applySortClick(one, "mat:FEO", "desc", false)).toEqual([
				{ key: "mat:FEO", dir: "desc" },
			]);

			const added = applySortClick(one, "mat:FEO", "desc", true);
			expect(added).toEqual([...one, { key: "mat:FEO", dir: "desc" }]);
			const flipped = applySortClick(added, "mat:FEO", "desc", true);
			expect(flipped[1]).toEqual({ key: "mat:FEO", dir: "asc" });
			expect(applySortClick(flipped, "mat:FEO", "desc", true)).toEqual(one);
			// a plain click on a key of a longer chain sorts by it alone
			expect(applySortClick(added, "mat:FEO", "desc", false)).toEqual([
				{ key: "mat:FEO", dir: "desc" },
			]);

			const full = ["a", "b", "c", "d"].map((k) => ({
				key: `mat:${k}`,
				dir: "desc" as const,
			}));
			expect(applySortClick(full, "fert", "desc", true)).toBe(full);
		});
	});
});
