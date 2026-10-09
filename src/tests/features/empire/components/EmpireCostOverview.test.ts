import { describe, it, expect } from "vitest";

import EmpireCostOverview from "@/features/empire/components/EmpireCostOverview.vue";
import { mountComponent } from "@/tests/mountComponent";

const costOverview = {
	totalProfit: 500,
	totalRevenue: 1000,
	totalCost: 500,
	totalAreaUsed: 100,
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
});
