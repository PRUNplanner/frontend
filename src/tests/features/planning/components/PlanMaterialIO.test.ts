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
			expect(th.classes(), key).toContain("numeric");
			expect(td.classes(), key).toContain("numeric");
		}
		expect(wrapper.find('th[data-col-key="ticker"]').classes()).not.toContain(
			"numeric"
		);
	});

	it("names the ticker sort button, though its title is empty", async () => {
		const { wrapper } = await mountTable();

		expect(
			wrapper.find('th[data-col-key="ticker"] button .sr-only').text()
		).toBe("terms.material_ticker");
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

	it("limits the body under its header when given a max height", async () => {
		const box = ".p-data-table-box";

		expect(
			(await mountTable()).wrapper.find(box).attributes("style") ?? ""
		).not.toContain("max-height");
		expect(
			(await mountTable({ maxHeight: "300px" })).wrapper
				.find(box)
				.attributes("style")
		).toContain("max-height: calc(302px)");
	});
});
