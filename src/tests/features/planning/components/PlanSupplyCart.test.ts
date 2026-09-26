import { describe, it, expect, beforeAll } from "vitest";
import { flushPromises, VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";

import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { usePlanningStore } from "@/stores/planningStore";
import PlanSupplyCart from "@/features/planning/components/tools/PlanSupplyCart.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// Types & Interfaces
import { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";
import fio_storage from "@/tests/test_data/api_data_fio_storage.json";

function io(
	ticker: string,
	delta: number,
	price: number,
	weight: number,
	volume: number
): IMaterialIO {
	return {
		ticker,
		input: delta < 0 ? -delta : 0,
		output: delta > 0 ? delta : 0,
		delta,
		price,
		individualWeight: weight,
		individualVolume: volume,
		totalWeight: 0,
		totalVolume: 0,
	};
}

// consumption has negative delta and price, unit prices: RAT 50, DW 50, H2O 20
const RAT = io("RAT", -100, -5000, 0.21, 0.1);
const DW = io("DW", -4, -200, 0.1, 0.1);
const H2O = io("H2O", -2.4, -48, 0.2, 0.2);
const PE = io("PE", 5, 100, 1, 1);

async function mountCart(planetNaturalId = "XX-000a", withFIO = false) {
	const pinia = createPinia();
	if (withFIO)
		// @ts-expect-error mock data
		usePlanningStore(pinia).setFIOStorageData(fio_storage);

	return mountComponent(
		PlanSupplyCart,
		{
			planetNaturalId,
			materialIO: [RAT, PE, DW, H2O],
			workforceMaterialIO: [RAT, DW],
			productionMaterialIO: [H2O],
		},
		{ pinia }
	);
}

/** summary figures: daily cost, total cost, weight, volume */
function summary(wrapper: VueWrapper) {
	const cells = wrapper.findAll(".n-data-table-tr--summary .grid > div");
	const value = (key: string) => {
		const idx = cells.findIndex(
			(c) => c.text() === `plan.tools.supply_cart.table.${key}`
		);
		expect(idx).toBeGreaterThan(-1);
		// strip the unit span
		return cells[idx + 1].text().split(" ")[0];
	};

	return {
		daily: value("daily_cost"),
		total: value("total_cost"),
		weight: value("total_weight"),
		volume: value("total_volume"),
	};
}

async function clickFilter(wrapper: VueWrapper, key: string) {
	const button = wrapper
		.findAll("button")
		.find((b) => b.text() === `plan.tools.supply_cart.buttons.${key}`);
	expect(button).toBeDefined();
	await button!.trigger("click");
	await flushPromises();
}

describe("PlanSupplyCart", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	it("lists consumed materials with 20 days of stock need", async () => {
		const { wrapper } = await mountCart();
		const rows = tableRows(wrapper);

		// produced PE is not part of the cart
		expect(rows.map((r) => r.ticker)).toEqual(["RAT", "DW", "H2O"]);
		expect(rows[0]).toMatchObject({
			delta: "100.00",
			price: "5,000.00",
			stockNeed: "2,000",
			needLeft: "2,000",
			needWeight: "420.00",
			needVolume: "200.00",
		});
		expect(rows[2]).toMatchObject({ stockNeed: "48", needLeft: "48" });

		expect(summary(wrapper)).toEqual({
			daily: "5,248.00",
			total: "104,960.00",
			weight: "437.60",
			volume: "217.60",
		});
	});

	it("rounds the stock need up for the chosen number of days", async () => {
		const { wrapper } = await mountCart();

		await wrapper.find("input").setValue("3");
		await flushPromises();

		// 2.4 * 3 = 7.2 -> 8
		expect(tableRows(wrapper).map((r) => r.stockNeed)).toEqual([
			"300",
			"12",
			"8",
		]);
	});

	it("marks and filters workforce and production materials", async () => {
		const { wrapper } = await mountCart();

		const marks = (key: "workforce" | "producton") =>
			wrapper
				.findAll(`td[data-col-key="${key}"] .picon`)
				.map((i) => i.classes("text-positive"));
		expect(marks("workforce")).toEqual([true, true, false]);
		expect(marks("producton")).toEqual([false, false, true]);

		await clickFilter(wrapper, "workforce");
		expect(tableRows(wrapper).map((r) => r.ticker)).toEqual(["RAT", "DW"]);
		expect(summary(wrapper)).toEqual({
			daily: "5,200.00",
			total: "104,000.00",
			weight: "428.00",
			volume: "208.00",
		});

		await clickFilter(wrapper, "production");
		expect(tableRows(wrapper).map((r) => r.ticker)).toEqual(["H2O"]);
		expect(summary(wrapper)).toEqual({
			daily: "48.00",
			total: "960.00",
			weight: "9.60",
			volume: "9.60",
		});

		await clickFilter(wrapper, "all");
		expect(tableRows(wrapper)).toHaveLength(3);
	});

	it("hides storage options without FIO data", async () => {
		const { wrapper } = await mountCart();

		expect(wrapper.findComponent(PSelect).exists()).toBe(false);
		expect(
			wrapper.find('th[data-col-key="stock"]').exists()
		).toBe(false);
	});

	it("subtracts the planet's FIO storage from the need", async () => {
		const { wrapper } = await mountCart("ZV-307c", true);

		expect(wrapper.findComponent(PSelect).text()).toContain("ZV-307c");

		// stored: RAT 1451, DW 1417, no H2O
		const rows = tableRows(wrapper);
		expect(rows.map((r) => [r.stock, r.needLeft])).toEqual([
			["1,451", "549"],
			["1,417", "0"],
			["0", "48"],
		]);
		expect(summary(wrapper)).toEqual({
			daily: "5,248.00",
			total: "28,410.00",
			weight: "124.89",
			volume: "64.50",
		});
	});

	it("recalculates the need for another storage", async () => {
		const { wrapper } = await mountCart("ZV-307c", true);

		// ANT warehouse stores more than enough of everything
		wrapper.findComponent(PSelect).vm.$emit("update:value", "WAR#ANT");
		await flushPromises();

		expect(tableRows(wrapper).map((r) => r.needLeft)).toEqual([
			"0",
			"0",
			"0",
		]);
		expect(summary(wrapper).total).toBe("0.00");
	});

	it("preselects no storage when the planet has none in FIO", async () => {
		const { wrapper } = await mountCart("XX-000a", true);

		expect(wrapper.findComponent(PSelect).text()).toContain(
			"No FIO Storage"
		);
	});

	it("renders an empty cart", async () => {
		const { wrapper } = await mountComponent(PlanSupplyCart, {
			planetNaturalId: "XX-000a",
			materialIO: [PE],
			workforceMaterialIO: [],
			productionMaterialIO: [],
		});

		expect(tableRows(wrapper)).toHaveLength(0);
		expect(wrapper.find(".n-data-table-empty").exists()).toBe(true);
	});
});
