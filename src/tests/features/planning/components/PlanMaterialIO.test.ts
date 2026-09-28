import { describe, it, expect, vi } from "vitest";
import { h } from "vue";

import PlanMaterialIO from "@/features/planning/components/PlanMaterialIO.vue";
import { mountComponent } from "@/tests/mountComponent";
import planMessages from "@/locales/en_US/plan.json";

// Types & Interfaces
import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render: () => h("div"),
	},
}));

const ROWS: IMaterialIO[] = [
	{
		ticker: "RAT",
		input: 10,
		output: 0,
		delta: -10,
		price: -1234.5,
		individualWeight: 0.21,
		individualVolume: 0.1,
		totalWeight: -2.1,
		totalVolume: -1,
	},
];

const NUMERIC = ["input", "output", "delta", "price"];

async function mountTable(props: Record<string, unknown> = {}) {
	return mountComponent(PlanMaterialIO, {
		materialIOData: ROWS,
		showBasked: false,
		...props,
	});
}

describe("PlanMaterialIO", () => {
	it("right-aligns every numeric column, header and cells", async () => {
		const { wrapper } = await mountTable();

		for (const key of NUMERIC) {
			const th = wrapper.find(`th[data-col-key="${key}"]`);
			const td = wrapper.find(`td[data-col-key="${key}"]`);
			expect(th.attributes("style"), key).toContain("text-align: right");
			expect(td.attributes("style"), key).toContain("text-align: right");
		}
		expect(
			wrapper.find('th[data-col-key="ticker"]').attributes("style") ?? ""
		).not.toContain("text-align: right");
	});

	it("keeps the unit in the header, the cell holds the number", async () => {
		const { wrapper } = await mountTable();

		expect(planMessages.components.materialio.table.cost_day).toContain(
			"ȼ"
		);
		expect(wrapper.find('th[data-col-key="price"]').text()).toBe(
			"plan.components.materialio.table.cost_day"
		);
		expect(wrapper.find('td[data-col-key="price"]').text()).toBe(
			"-1,234.50"
		);
	});

	it("renders a fixed header when given a max height", async () => {
		const header = ".n-data-table-base-table-header";

		expect((await mountTable()).wrapper.find(header).exists()).toBe(false);
		expect(
			(await mountTable({ maxHeight: "300px" })).wrapper.find(header)
				.exists()
		).toBe(true);
	});
});
