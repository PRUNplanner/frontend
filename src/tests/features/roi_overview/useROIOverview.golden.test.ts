import { ref } from "vue";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { useROIOverview } from "@/features/roi_overview/useROIOverview";
import { usePlan } from "@/features/planning_data/usePlan";

// Static
import { optimalProduction } from "@/features/roi_overview/assets/optimalProduction";

// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import cx_definition from "@/tests/test_data/api_data_cx_definition.json";
import { setupPlanningTestData } from "@/tests/features/planning/usePlanCalculation.fixtures";
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
 * Golden: every ROI Overview row (cost, COGM, profit, ROI per optimal
 * setup and recipe), like ROIOverviewView calculates them.
 */

// the one place that calls the composable
function runROI(cxUuid: string | undefined) {
	return useROIOverview(
		ref(usePlan().createBlankDefinition("KW-688c", null)),
		ref(cxUuid)
	);
}

describe("useROIOverview (golden)", { timeout: 60_000 }, () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});

	afterEach(() => {
		usePlanningStore().cxs = {};
	});

	it("calculateItem: a few setups with a CX", async () => {
		usePlanningStore().cxs[cx_definition.uuid] =
			cx_definition as unknown as CX;
		const { calculateItem } = runROI(cx_definition.uuid);
		const rows = [];
		for (const ticker of ["TNP", "FP", "SME", "PP1"])
			rows.push(
				...(await calculateItem(
					optimalProduction.find((o) => o.ticker === ticker)!
				))
			);

		await expect(golden(rows)).toMatchFileSnapshot(
			"./__snapshots__/useROIOverview.cx.golden.json"
		);
	});
});
