import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, type Pinia, setActivePinia } from "pinia";

import StorageData from "@/features/profile/components/StorageData.vue";
import {
	materialsStore,
	buildingsStore,
	recipesStore,
	planetsStore,
	exchangesStore,
} from "@/database/stores";
import { usePlanningStore } from "@/stores/planningStore";
import { mountComponent } from "@/tests/mountComponent";

describe("StorageData", () => {
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("lists every store with records and size, summed in the summary", async () => {
		vi.spyOn(materialsStore, "statistics").mockResolvedValue({
			records: 1200,
			sizeMB: 1.5,
		});
		vi.spyOn(buildingsStore, "statistics").mockResolvedValue({
			records: 30,
			sizeMB: 0.25,
		});
		vi.spyOn(recipesStore, "statistics").mockResolvedValue({
			records: 70,
			sizeMB: 0.25,
		});
		vi.spyOn(planetsStore, "statistics").mockResolvedValue({
			records: 5000,
			sizeMB: 10,
		});
		vi.spyOn(exchangesStore, "statistics").mockResolvedValue({
			records: 100,
			sizeMB: 2,
		});
		vi.spyOn(usePlanningStore(), "getStoreSize").mockResolvedValue([
			{ name: "Plans", records: 2, sizeMB: 0.5 },
		]);

		const { wrapper } = await mountComponent(
			StorageData,
			{},
			{
				pinia,
				messages: {
					profile: {
						storage_data: { total: "{records} records, {size} MB" },
					},
				},
			}
		);
		await vi.waitFor(() => {
			expect(wrapper.findAll("tbody tr")).toHaveLength(6);
		});

		const cells = wrapper
			.findAll("tbody tr")
			.map((tr) => tr.findAll("td").map((td) => td.text()));
		expect(cells).toEqual([
			["Materials", "1,200", "1.50 MB"],
			["Buildings", "30", "0.25 MB"],
			["Recipes", "70", "0.25 MB"],
			["Planets", "5,000", "10.00 MB"],
			["Exchanges", "100", "2.00 MB"],
			["Plans", "2", "0.50 MB"],
		]);
		expect(wrapper.find("summary").text()).toBe("6,402 records, 14.50 MB");
	});

	it("shows the plain title until the statistics arrived", async () => {
		vi.spyOn(materialsStore, "statistics").mockReturnValue(
			new Promise(() => {})
		);

		const { wrapper } = await mountComponent(StorageData, {}, { pinia });

		expect(wrapper.find("summary").text()).toBe(
			"profile.storage_data.title"
		);
		expect(wrapper.findAll("tbody tr")).toHaveLength(0);
	});
});
