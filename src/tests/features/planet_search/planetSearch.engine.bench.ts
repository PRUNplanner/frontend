import { bench, describe } from "vitest";

// Engine
import {
	defaultFilter,
	facetCounts,
	filterPlanets,
	indexMaterials,
	nameSearchNote,
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
 * One full recompute of the planet search (results + every facet count)
 * on the production-size index, run with `pnpm vitest bench --run`.
 * Budget: under 50 ms per recompute.
 */

const index = fixture as PlanetSearchIndexEntry[];
const materials = indexMaterials(index);

// 32 plans, like a large empire
const plans = Object.fromEntries(
	index.slice(0, 32).map((p, i) => [`plan-${i}`, p.planet_natural_id])
);
const ctx = createSearchContext(index, plans, 1790694000000);
const refs: PlanetSearchReference[] = [
	...Object.keys(plans).map((planUuid) => ({ kind: "plan" as const, planUuid })),
	...SEARCH_CX.map((code) => ({ kind: "cx" as const, code })),
];

function recompute(filter: PlanetSearchFilter) {
	filterPlanets(index, filter, ctx);
	facetCounts(index, filter, ctx, materials, refs);
}

describe("planet search recompute", () => {
	bench("wide: one material, everything accepted", () => {
		recompute({
			...defaultFilter(),
			materialGroups: [{ op: "any", materials: ["H2O"] }],
			surface: ["rocky", "gaseous"],
			acceptedExtras: [...SEARCH_EXTRAS],
		});
	});

	bench('name: "KI-" with the default filters, and its note', () => {
		const filter = { ...defaultFilter(), text: "KI-" };
		recompute(filter);
		nameSearchNote(index, filter, ctx);
	});

	bench("heavy: two groups, two plans and NC1", () => {
		recompute({
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
		});
	});
});
