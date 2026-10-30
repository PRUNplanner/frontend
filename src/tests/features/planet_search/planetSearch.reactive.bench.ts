import { describe } from "vitest";
import { bench } from "@/tests/bench";
import { reactive, shallowRef } from "vue";

// Engine
import {
	defaultFilter,
	facetCounts,
	filterPlanets,
	indexMaterials,
	SEARCH_CX,
	SEARCH_EXTRAS,
} from "@/features/planet_search/planetSearch.engine";
import { createSearchContext } from "@/features/planet_search/planetSearchContext.util";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type {
	PlanetSearchFilter,
	PlanetSearchReference,
} from "@/features/planet_search/planetSearch.schemas";

// test data
import fixture from "@/tests/test_data/api_data_planet_search_index.json";

/**
 * One planet search recompute (results + facet counts) on the index as the
 * page holds it: raw, deep reactive (a `ref`) and a `shallowRef`. The
 * filters match planetSearch.engine.bench.ts. Run with
 * `pnpm vitest bench --run`; the shallow case should stay within 15 % of raw.
 */

const raw = fixture as PlanetSearchIndexEntry[];
const plans = Object.fromEntries(
	raw.slice(0, 32).map((p, i) => [`plan-${i}`, p.planet_natural_id])
);
const refs: PlanetSearchReference[] = [
	...Object.keys(plans).map((planUuid) => ({
		kind: "plan" as const,
		planUuid,
	})),
	...SEARCH_CX.map((code) => ({ kind: "cx" as const, code })),
];

// like the page: context and materials are derived from the held index
function holder(index: PlanetSearchIndexEntry[]) {
	return {
		index,
		ctx: createSearchContext(index, plans, 1790694000000),
		materials: indexMaterials(index),
	};
}
const variants = {
	raw: holder(raw),
	"deep reactive": holder(reactive(structuredClone(raw))),
	shallowRef: holder(shallowRef(structuredClone(raw)).value),
};

const filters: Record<string, PlanetSearchFilter> = {
	"wide: one material, everything accepted": {
		...defaultFilter(),
		materialGroups: [{ op: "any", materials: ["H2O"] }],
		surface: ["rocky", "gaseous"],
		acceptedExtras: [...SEARCH_EXTRAS],
	},
	'name: "KI-" with the default filters': { ...defaultFilter(), text: "KI-" },
	"heavy: two groups, two plans and NC1": {
		...defaultFilter(),
		materialGroups: [
			{ op: "all", materials: ["FEO", "H2O"] },
			{ op: "all", materials: ["MAG", "O"] },
		],
		groupsOp: "any",
		minDaily: { FEO: 15 },
		surface: ["rocky", "gaseous"],
		acceptedExtras: [...SEARCH_EXTRAS],
		references: [refs[0], refs[1], refs[refs.length - 1]],
		maxJumps: 8,
	},
};

for (const [name, filter] of Object.entries(filters))
	describe(`planet search recompute, ${name}`, () => {
		for (const [variant, { index, ctx, materials }] of Object.entries(
			variants
		))
			bench(variant, () => {
				filterPlanets(index, filter, ctx);
				facetCounts(index, filter, ctx, materials, refs);
			});
	});
