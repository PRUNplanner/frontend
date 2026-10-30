import { effectScope, ref } from "vue";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { useRepairAnalysis } from "@/features/repair_analysis/useRepairAnalysis";
import { usePlanContext } from "@/features/planning/usePlanContext";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";

// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { IPlanRepairAnalysisDataProp } from "@/features/planning/components/tools/planRepairAnalysis.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import cx_definition from "@/tests/test_data/api_data_cx_definition.json";
import {
	etherwindPlan,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";
import { golden } from "@/tests/golden";

vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);

	return {
		usePlanetData: vi.fn(() => ({
			getPlanet: vi.fn().mockResolvedValue(planet_etherwind),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});

/**
 * Golden: repair curves, best days, good ranges and repair materials of
 * the Etherwind plan's building types, the props PlanView hands over.
 */

// what PlanView passes to PlanRepairAnalysis
async function repairData(
	cxUuid: string | undefined
): Promise<IPlanRepairAnalysisDataProp[]> {
	const plan = etherwindPlan();
	const { loadGameData, createContext } = usePlanContext();
	const { result } = calculatePlan(
		{ plan, empire: undefined, cxUuid },
		await createContext(
			await loadGameData(),
			plan.planet_natural_id,
			cxUuid
		)
	);
	return result.production.buildings.map((b) => ({
		name: b.name,
		amount: b.amount,
		dailyRevenue: b.dailyRevenue,
		workforceDailyCost: b.workforceDailyCost,
		constructionCost: b.constructionCost,
		constructionMaterials: b.constructionMaterials,
	}));
}

// the one place that calls the composable
async function runRepair(cxUuid: string | undefined) {
	const data = await repairData(cxUuid);
	const scope = effectScope();
	const analysis = scope.run(() =>
		useRepairAnalysis(ref(data), ref(cxUuid), ref("KW-688c"))
	)!;
	await vi.waitFor(() =>
		expect(analysis.buildings.value.length).toBeGreaterThan(0)
	);
	return { ...analysis, scope };
}

async function snapshot(cxUuid: string | undefined) {
	const { buildings, materialsFor, materialsForAll, scope } =
		await runRepair(cxUuid);
	try {
		const best = Object.fromEntries(
			buildings.value.map((b) => [b.ticker, b.best])
		);
		return {
			// the curves are left out, the engine snapshots cover them
			buildings: buildings.value.map((b) => ({
				...b,
				curve: undefined,
				split: undefined,
			})),
			materials: buildings.value.map((b) => ({
				ticker: b.ticker,
				best: materialsFor(b, b.best),
				day30: materialsFor(b, 30),
				day90: materialsFor(b, 90),
			})),
			all: {
				best: materialsForAll((t) => best[t]),
				day45: materialsForAll(() => 45),
				day180: materialsForAll(() => 180),
			},
		};
	} finally {
		scope.stop();
	}
}

describe("useRepairAnalysis (golden)", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});

	afterEach(() => {
		usePlanningStore().cxs = {};
	});

	it("Etherwind with a CX", async () => {
		usePlanningStore().cxs[cx_definition.uuid] =
			cx_definition as unknown as CX;

		await expect(
			golden(await snapshot(cx_definition.uuid))
		).toMatchFileSnapshot(
			"./__snapshots__/useRepairAnalysis.cx.golden.json"
		);
	});
});
