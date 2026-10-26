import { describe } from "vitest";
import { bench } from "@/tests/bench";
import { ref, type Ref } from "vue";

import { useDB } from "@/database/composables/useDB";

// Types & Interfaces
import type { Material } from "@/features/api/schemas/gameData.schemas";

// test data
import materials from "@/tests/test_data/api_data_materials.json";

/**
 * Material select options and the ticker → material map, built from game
 * data as useMaterialData does: deep `ref` (before) against useDB's
 * `shallowRef`. Run with `pnpm vitest bench --run`.
 */

const shallow = useDB<Material, "ticker">({
	keyPath: "ticker",
} as unknown as Parameters<typeof useDB<Material, "ticker">>[0]);
shallow.fill(structuredClone(materials) as Material[], true);
const deep: Ref<Material[]> = ref(structuredClone(materials) as Material[]);

function derive(rows: Material[]) {
	rows.map((m) => ({ label: m.ticker, value: m.ticker }));
	rows.reduce(
		(acc, m) => {
			acc[m.ticker] = m;
			return acc;
		},
		{} as Record<string, Material>
	);
}

describe("material options and ticker map", () => {
	bench("deep ref", () => derive(deep.value));
	bench("shallowRef (useDB)", () => derive(shallow.allData.value));
});
