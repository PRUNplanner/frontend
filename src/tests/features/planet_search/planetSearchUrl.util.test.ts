import { describe, it, expect } from "vitest";

import {
	decodeSearch,
	encodeSearch,
} from "@/features/planet_search/planetSearchUrl.util";
import {
	defaultFilter,
	SEARCH_COGC,
	SEARCH_CX,
	SEARCH_EXTRAS,
	SEARCH_INFRASTRUCTURE,
	SEARCH_SURFACES,
} from "@/features/planet_search/planetSearch.engine";

// Types & Interfaces
import type { IPlanetSearchState } from "@/features/planet_search/planetSearch.types";
import type { PlanetSearchFilter } from "@/features/planet_search/planetSearch.schemas";

// seeded, so a failure reproduces
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = <T>(list: readonly T[], p: number): T[] =>
	list.filter(() => rnd() < p);
const TICKERS = ["FEO", "H2O", "MAG", "O", "HE3", "N", "LST", "AR"];

function randomState(): IPlanetSearchState {
	const groups = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => ({
		op: rnd() < 0.5 ? ("any" as const) : ("all" as const),
		materials: pick(TICKERS, 0.3),
	}));
	const used = [...new Set(groups.flatMap((g) => g.materials))];
	const surface = pick(SEARCH_SURFACES, 0.6);
	const filter: PlanetSearchFilter = {
		text: rnd() < 0.3 ? "Mont em & co?" : "",
		materialGroups: groups,
		groupsOp: rnd() < 0.5 ? "any" : "all",
		minDaily: Object.fromEntries(
			pick(used, 0.5).map((t) => [t, Math.round(rnd() * 400) / 10])
		),
		cogc: pick(SEARCH_COGC, 0.1),
		infrastructure: pick(SEARCH_INFRASTRUCTURE, 0.3),
		fertile: rnd() < 0.5,
		surface: surface.length ? surface : ["gaseous"],
		acceptedExtras: pick(SEARCH_EXTRAS, 0.4),
		references: [
			...pick(["6f1c2a4e-8d9b-4c3a-9e2f-1a2b3c4d5e6f", "abc"], 0.5).map(
				(planUuid) => ({ kind: "plan" as const, planUuid })
			),
			...pick(SEARCH_CX, 0.3).map((code) => ({ kind: "cx" as const, code })),
		],
		maxJumps: Math.floor(rnd() * 31),
	};
	const sorts = [{ key: "name", dir: "asc" as const }, { key: "mat:FEO", dir: "desc" as const }, { key: "ref:cx:NC1", dir: "asc" as const }, { key: "ref:plan:abc", dir: "desc" as const }, { key: "fert", dir: "desc" as const }];
	return {
		filter,
		// a random chain of up to 4 distinct keys
		sort: pick(sorts, 0.35).slice(0, 4),
		view: rnd() < 0.5 ? "list" : "matrix",
		pins: pick(["OT-580b", "KW-688c", "UV-351a", "ZV-759d"], 0.4),
	};
}

describe("planet search url", () => {
	it("round trips random states", () => {
		for (let i = 0; i < 300; i++) {
			const state = randomState();
			expect(decodeSearch(encodeSearch(state))).toEqual(state);
		}
	});

	it("leaves defaults out of the url", () => {
		expect(
			encodeSearch({
				filter: defaultFilter(),
				sort: [],
				view: "list",
				pins: [],
			})
		).toEqual({});
	});

	it("uses readable params", () => {
		expect(
			encodeSearch({
				filter: {
					...defaultFilter(),
					materialGroups: [
						{ op: "any", materials: ["FEO", "MAG"] },
						{ op: "all", materials: ["H2O"] },
					],
					groupsOp: "any",
					minDaily: { FEO: 15 },
					surface: ["rocky", "gaseous"],
					references: [
						{ kind: "plan", planUuid: "u1" },
						{ kind: "cx", code: "NC1" },
					],
					maxJumps: 4,
				},
				sort: [
					{ key: "ref:cx:NC1", dir: "asc" },
					{ key: "mat:FEO", dir: "desc" },
				],
				view: "matrix",
				pins: ["OT-580b"],
			})
		).toEqual({
			m: "any:FEO|MAG,all:H2O",
			g: "any",
			d: "FEO:15",
			surf: "rg",
			ref: "plan:u1,cx:NC1",
			j: "4",
			sort: "ref:cx:NC1:asc,mat:FEO:desc",
			view: "matrix",
			pin: "OT-580b",
		});
	});

	it("drops invalid values without throwing", () => {
		const state = decodeSearch({
			q: ["first", "second"],
			m: "some:FEO,any:FEO|bad ticker|FEO|H2O,all:",
			g: "maybe",
			d: "FEO:-1,H2O:abc,MAG:3,H2O:",
			cogc: "WORKFORCE_PIONEERS,Invalid,NOPE",
			infra: "LM,XX,LM",
			fert: "yes",
			surf: "xyz",
			x: "MGC,FOO",
			ref: "plan:,cx:XX1,cx:AI1,foo",
			j: "31",
			sort: "mat:toolong:desc",
			view: "grid",
			pin: "OT-580b,<script>,KW-688c,A,B,C",
		});
		expect(state).toEqual({
			filter: {
				...defaultFilter(),
				text: "first",
				materialGroups: [
					{ op: "any", materials: ["FEO", "H2O"] },
					{ op: "all", materials: [] },
				],
				cogc: ["WORKFORCE_PIONEERS"],
				infrastructure: ["LM"],
				acceptedExtras: ["MGC"],
				references: [{ kind: "cx", code: "AI1" }],
			},
			sort: [],
			view: "list",
			pins: ["OT-580b", "KW-688c", "A", "B"],
		});

		expect(decodeSearch({ j: "2.5", sort: "name:up" }).filter.maxJumps).toBe(10);
		expect(decodeSearch({ sort: "ref:cx:ZZ9:asc" }).sort).toEqual([]);
		expect(decodeSearch({ sort: "fert:asc" }).sort).toEqual([{ key: "fert", dir: "asc" }]);
		// chains: invalid parts and repeated keys drop, at most 4 keys
		expect(
			decodeSearch({
				sort: "mat:FEO:desc,bad,mat:FEO:asc,name:asc,fert:desc,ref:cx:AI1:asc,ref:cx:NC1:asc",
			}).sort
		).toEqual([
			{ key: "mat:FEO", dir: "desc" },
			{ key: "name", dir: "asc" },
			{ key: "fert", dir: "desc" },
			{ key: "ref:cx:AI1", dir: "asc" },
		]);
		expect(decodeSearch({ q: null, m: [null] }).filter).toEqual(defaultFilter());
	});
});
