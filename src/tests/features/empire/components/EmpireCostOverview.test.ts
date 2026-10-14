import { describe, it, expect } from "vitest";

import EmpireCostOverview from "@/features/empire/components/EmpireCostOverview.vue";
import { mountComponent } from "@/tests/mountComponent";

const costOverview = {
	totalProfit: 500,
	totalRevenue: 1000,
	totalCost: 500,
	totalAreaUsed: 100,
};

// 1000 revenue: 300 inputs, 100 workforce, 100 degradation, 500 profit
const split = {
	revenue: 1000,
	inputs: 300,
	workforce: 100,
	degradation: 100,
	profit: 500,
};

const shippingDemand = {
	dailyWeightImport: 12.5,
	dailyWeightExport: 30,
	dailyVolumeImport: 40,
	dailyVolumeExport: 8,
	dailyWeight: 31.5,
	dailyVolume: 42.25,
};

describe("EmpireCostOverview", () => {
	it("shows the shipping tiles with the import and export split", async () => {
		const { wrapper } = await mountComponent(EmpireCostOverview, {
			costOverview,
			shippingDemand,
			split,
		});
		const text = wrapper.text();

		expect(text).toContain("terms.revenue");
		expect(text).toContain("terms.profit_per_area");
		expect(text).toContain(
			"empire.cost_overview.shipping (plan.components.storage.table.weight)"
		);
		expect(text).toContain("31.50");
		expect(text).toContain("12.50");
		expect(text).toContain(
			"empire.cost_overview.shipping (plan.components.storage.table.volume)"
		);
		expect(text).toContain("42.25");
		expect(text).toContain("plan.components.storage.table.export");
	});

	it("splits revenue into inputs, workforce, degradation and profit", async () => {
		const { wrapper } = await mountComponent(EmpireCostOverview, {
			costOverview,
			shippingDemand,
			split,
		});
		const parts = wrapper.findAll("[role=img] [data-key]");

		expect(parts.map((p) => p.attributes("data-key"))).toEqual([
			"inputs",
			"workforce",
			"degradation",
			"profit",
		]);
		expect(parts[0].attributes("style")).toContain("flex: 30 1 0%");
		expect(parts[3].attributes("style")).toContain("flex: 50 1 0%");
		expect(wrapper.find("[data-key=hatch]").exists()).toBe(false);
	});

	it("hatches the cost revenue does not cover when the empire loses money", async () => {
		const { wrapper } = await mountComponent(EmpireCostOverview, {
			costOverview,
			shippingDemand,
			split: { ...split, revenue: 250, profit: -250 },
		});

		// 250 of 500 cost not covered: hatched from 50 %
		expect(wrapper.find("[data-key=profit]").exists()).toBe(false);
		expect(wrapper.find("[data-key=hatch]").attributes("style")).toContain(
			"left: 50%"
		);
		expect(wrapper.text()).toContain("empire.analysis.kpi_split.uncovered");
	});
});
