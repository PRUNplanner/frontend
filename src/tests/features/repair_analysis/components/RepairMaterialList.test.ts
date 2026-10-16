import { describe, it, expect, vi } from "vitest";
import { h } from "vue";

import RepairMaterialList from "@/features/repair_analysis/components/RepairMaterialList.vue";
import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";
import { mountComponent } from "@/tests/mountComponent";
import { materialList } from "@/tests/features/repair_analysis/components/repairFixtures";

import plan from "@/locales/en_US/plan.json";

// fake tickers, the tile only renders
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render: () => h("div"),
	},
}));

async function mountList(props: Record<string, unknown> = {}) {
	return mountComponent(
		RepairMaterialList,
		{ list: materialList(8), title: "One repair", ...props },
		{ messages: { plan } }
	);
}

describe("RepairMaterialList", () => {
	it("lists every material with its share of the cost and the totals", async () => {
		const { wrapper } = await mountList();
		const rows = wrapper.findAll("[data-testid=repair-material]");

		expect(rows).toHaveLength(8);
		// the most expensive one fills the bar
		expect(rows[0].find("[style]").attributes("style")).toContain(
			"width: 100%"
		);
		expect(rows[7].find("[style]").attributes("style")).toContain(
			"width: 12.5%"
		);
		expect(wrapper.text()).toContain("Total 3,600 ȼ");
		expect(wrapper.text()).toContain("8.0 t");
		expect(wrapper.text()).toContain("16.0 m³");
	});

	it("hands every material to the XIT transfer", async () => {
		const { wrapper } = await mountList();

		expect(
			wrapper.findComponent(XITTransferActionButton).props("elements")
		).toHaveLength(8);
		expect(
			wrapper.findComponent(XITTransferActionButton).props("transferName")
		).toBe("Repair");
	});

	it("shows the top ones first and all of them on request", async () => {
		const { wrapper } = await mountList({ limit: 6 });
		const toggle = wrapper.find("button[aria-expanded]");

		expect(wrapper.findAll("[data-testid=repair-material]")).toHaveLength(6);
		expect(toggle.text()).toBe("Show all 8 materials");
		expect(toggle.attributes("aria-expanded")).toBe("false");

		await toggle.trigger("click");
		expect(wrapper.findAll("[data-testid=repair-material]")).toHaveLength(8);
		expect(toggle.attributes("aria-expanded")).toBe("true");
		// the XIT always covers all of them
		expect(
			wrapper.findComponent(XITTransferActionButton).props("elements")
		).toHaveLength(8);
	});

	it("needs no toggle when everything fits", async () => {
		const { wrapper } = await mountList({ list: materialList(4), limit: 6 });

		expect(wrapper.find("button[aria-expanded]").exists()).toBe(false);
	});
});
