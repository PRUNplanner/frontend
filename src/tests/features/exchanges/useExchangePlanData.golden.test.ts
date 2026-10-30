import { effectScope } from "vue";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

// Composables
import { useExchangePlanData } from "@/features/exchanges/useExchangePlanData";

// Types & Interfaces
import type { CX, CXData } from "@/features/api/schemas/cxData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { Plan } from "@/features/api/schemas/planningData.schemas";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import cx_list from "@/tests/test_data/api_data_cx_list.json";
import {
	etherwindPlan,
	setupPlanningTestData,
	smallPlan,
} from "@/tests/features/planning/usePlanCalculation.fixtures";
import { golden } from "@/tests/golden";

// every planet is Etherwind under its own id
vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);
	return {
		usePlanetData: vi.fn(() => ({
			getPlanet: vi.fn(async (id: string) => ({
				...planet_etherwind,
				planet_natural_id: id,
			})),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});

// game data is seeded, the loads the composable waits for are no-ops
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: vi.fn(() => ({ execute: async () => [] })),
}));

/**
 * Golden: the plans an Exchanges page prices (bases), their priced
 * material rows and the linked plans' COGMs, from real plan results.
 */

const linked = etherwindPlan();
// planet-level ticker rules of the preference apply on KI-446b
const other: Plan = {
	...smallPlan(),
	uuid: "8b0e6b1c-0000-4000-8000-000000000002",
	plan_name: "Small",
	planet_natural_id: "KI-446b",
};

const empires = [
	{ uuid: "E1", empire_name: "Linked", plans: [{ uuid: linked.uuid }] },
	{ uuid: "E2", empire_name: "Other", plans: [{ uuid: other.uuid }] },
] as unknown as PlanEmpireElement[];

// PRUN CX REAL: empire and planet ticker rules
const cxData = cx_list[0].cx_data as CXData;
const cx = {
	uuid: cx_list[0].uuid,
	cx_name: cx_list[0].cx_name,
	modified_at: "1",
	empires: [empires[0]],
	cx_data: cxData,
} as unknown as CX;

const settle = async () => {
	for (let i = 0; i < 20; i++) {
		await flushPromises();
		await new Promise((r) => setTimeout(r, 0));
	}
};

// the one place that calls the composable
function runExchangePlanData(includeOthers: boolean) {
	const scope = effectScope();
	const data = scope.run(() =>
		useExchangePlanData({
			plans: () => [linked, other],
			empires: () => empires,
			cx: () => cx,
			cxData: () => cxData,
			includeOthers: () => includeOthers,
		})
	)!;
	return { ...data, scope };
}

describe("useExchangePlanData (golden)", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});

	it("bases, material rows and COGMs", async () => {
		const result: Record<string, unknown> = {};
		for (const includeOthers of [false, true]) {
			const data = runExchangePlanData(includeOthers);
			try {
				await settle();
				result[includeOthers ? "with_others" : "linked_only"] = {
					bases: data.bases.value,
					materialRows: data.materialRows.value,
					materialCOGMs: [...data.materialCOGMs.value.entries()],
					planetMaterialRows: Object.fromEntries(
						["KW-688c", "KI-446b"].map((p) => [
							p,
							data.planetMaterialRows(p),
						])
					),
				};
			} finally {
				data.scope.stop();
			}
		}

		await expect(golden(result)).toMatchFileSnapshot(
			"./__snapshots__/useExchangePlanData.golden.json"
		);
	});
});
