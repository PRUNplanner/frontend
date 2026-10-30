import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { usePlanningStore } from "@/stores/planningStore";
import { useUserStore } from "@/stores/userStore";
import PlanConstructionCart from "@/features/planning/components/tools/PlanConstructionCart.vue";
import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";
import { fioProfile } from "@/tests/features/cx/cx.fixtures";
import { usePlanContext } from "@/features/planning/usePlanContext";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";

// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";

// test data
import fio_storage from "@/tests/test_data/api_data_fio_storage.json";
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import cx_list from "@/tests/test_data/api_data_cx_list.json";
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

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

/**
 * Golden: the construction cart of the Etherwind plan at twice its size,
 * on the FIO base that already has it once: the building/material matrix,
 * the need after stock and an override, and both totals.
 */

const mock = new AxiosMockAdapter(apiService.client);

// PRUN CX REAL: empire and Etherwind ticker rules
const CX = cx_list[0] as unknown as CX;

// what PlanView hands the cart, from the engine
async function cartProps() {
	const plan = etherwindPlan();
	plan.plan_data.buildings.forEach((b) => (b.amount *= 2));
	plan.plan_data.infrastructure.forEach((i) => (i.amount *= 2));
	const { loadGameData, createContext } = usePlanContext();
	const { result } = calculatePlan(
		{ plan, empire: undefined, cxUuid: CX.uuid },
		await createContext(
			await loadGameData(),
			plan.planet_natural_id,
			CX.uuid
		)
	);
	return {
		planetNaturalId: plan.planet_natural_id,
		cxUuid: CX.uuid,
		constructionData: result.constructionMaterials,
		productionBuildingData: result.production.buildings,
		infrastructureData: result.infrastructure,
	};
}

// the one place that mounts the component
async function mountCart() {
	const props = await cartProps();
	const pinia = createPinia();
	useUserStore(pinia).profile = fioProfile();
	usePlanningStore(pinia).setCXs([CX]);
	mock.onGet(/data\/storage\/$/).reply(200, fio_storage);
	const { wrapper } = await mountComponent(PlanConstructionCart, props, {
		pinia,
	});
	await flushPromises();
	return wrapper;
}

const tables = (wrapper: VueWrapper) => wrapper.findAll("table");
const cellText = (c: { find: VueWrapper["find"]; text: () => string }) =>
	c.find("input").exists()
		? (c.find("input").element as HTMLInputElement).value
		: c.text();

/** what the cart shows and hands its XIT buttons */
function rendered(wrapper: VueWrapper) {
	const [buildings, materials] = tables(wrapper);
	return {
		matrix: {
			header: buildings.findAll("thead th").map((th) => th.text()),
			rows: buildings
				.findAll("tbody tr")
				.map((tr) => tr.findAll("th, td").map(cellText)),
		},
		need: materials
			.findAll("tbody tr")
			.map((tr) => tr.findAll("td").map(cellText)),
		totals: wrapper
			.findAll("dl")
			.map((dl) => dl.findAll("dd").map((dd) => dd.text())),
		xit: wrapper
			.findAllComponents(XITTransferActionButton)
			.map((b) => b.props("elements")),
	};
}

async function setOverride(wrapper: VueWrapper, ticker: string, value: number) {
	const row = tables(wrapper)[1]
		.findAll("tbody tr")
		.find((tr) => tr.find("td").text() === ticker)!;
	await row.find("input").setValue(String(value));
	await flushPromises();
}

describe("PlanConstructionCart (golden)", () => {
	beforeEach(async () => {
		axiosSetup();
		mock.reset();
		await setupPlanningTestData();
	});

	it("matrix, need and totals: planet storage, warehouse, override", async () => {
		const wrapper = await mountCart();
		const planet = rendered(wrapper);

		wrapper.findComponent(PSelect).vm.$emit("update:value", "WAR#ANT");
		await flushPromises();
		const warehouse = rendered(wrapper);

		await setOverride(wrapper, "BSE", 150);
		await setOverride(wrapper, "LBH", 0);
		const override = rendered(wrapper);

		await expect(
			golden({ planet, warehouse, override })
		).toMatchFileSnapshot("./__snapshots__/PlanConstructionCart.golden.json");
	});
});
