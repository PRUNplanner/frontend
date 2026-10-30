import { ref } from "vue";
import { describe, it, expect, beforeEach } from "vitest";
import AxiosMockAdapter from "axios-mock-adapter";

// Services
import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";

// Stores
import { planetsStore } from "@/database/stores";
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { useResourceROIOverview } from "@/features/resource_roi_overview/useResourceROIOverview";

// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import planet_search from "@/tests/test_data/api_data_planet_search.json";
import cx_definition from "@/tests/test_data/api_data_cx_definition.json";
import { setupPlanningTestData } from "@/tests/features/planning/usePlanCalculation.fixtures";
import { golden } from "@/tests/golden";

const mock = new AxiosMockAdapter(apiService.client);

/**
 * Golden: the Resource ROI rows (yield, share of the best yield, COGM,
 * profit, ROI, environment, distances) for real planets.
 */

// the one place that calls the composable
function runResourceROI(cxUuid: string | undefined, ticker: string) {
	return useResourceROIOverview(ref(cxUuid)).calculate(ticker);
}

describe("useResourceROIOverview (golden)", { timeout: 60_000 }, () => {
	beforeEach(async () => {
		mock.reset();
		axiosSetup();
		await setupPlanningTestData();
	});

	it("N on the planet search fixture, Universe prices", async () => {
		// @ts-expect-error mock data
		await planetsStore.setMany(planet_search);
		mock.onPost("/data/planets/search/").reply(200, planet_search);

		await expect(
			golden(await runResourceROI(undefined, "N"))
		).toMatchFileSnapshot(
			"./__snapshots__/useResourceROIOverview.golden.json"
		);
	});

	it("H2O, SIO and O on Etherwind with a CX", async () => {
		// @ts-expect-error mock data
		await planetsStore.setMany([planet_etherwind]);
		mock.onPost("/data/planets/search/").reply(200, [planet_etherwind]);
		usePlanningStore().cxs[cx_definition.uuid] =
			cx_definition as unknown as CX;

		const result: Record<string, unknown> = {};
		for (const ticker of ["H2O", "SIO", "O"])
			result[ticker] = await runResourceROI(cx_definition.uuid, ticker);

		await expect(golden(result)).toMatchFileSnapshot(
			"./__snapshots__/useResourceROIOverview.cx.golden.json"
		);
	});
});
