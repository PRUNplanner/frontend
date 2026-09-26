import { describe, it, expect, vi } from "vitest";
import { h } from "vue";

import ResourceROITableFilters from "@/features/resource_roi_overview/components/ResourceROITableFilters.vue";
import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render: () => h("div"),
	},
}));

const PLANETS = [
	{ label: "Katoa", value: "Katoa" },
	{ label: "Montem", value: "Montem" },
];
const BUILDINGS = [{ label: "EXT", value: "EXT" }];

async function mountFilters(props: Record<string, unknown> = {}) {
	return mountComponent(ResourceROITableFilters, {
		searchedMaterial: "H2O",
		filterPositiveROI: false,
		planetOptions: PLANETS,
		buildingOptions: BUILDINGS,
		...props,
	});
}

const selects = (wrapper: Awaited<ReturnType<typeof mountFilters>>) =>
	wrapper.component.findAllComponents(PSelect);

describe("ResourceROITableFilters", () => {
	it("hands options and the current filters to the inputs", async () => {
		const mounted = await mountFilters({
			filterPlanet: "Montem",
			filterPositiveROI: true,
		});
		const [planet, building] = selects(mounted);

		expect(planet.props()).toMatchObject({
			value: "Montem",
			options: PLANETS,
		});
		// no building filter defaults to null
		expect(building.props()).toMatchObject({
			value: null,
			options: BUILDINGS,
		});
		expect(
			(
				mounted.wrapper.find("input[type=checkbox]")
					.element as HTMLInputElement
			).checked
		).toBe(true);
		expect(
			mounted.wrapper.findComponent(MaterialTile).props("ticker")
		).toBe("H2O");
	});

	it("emits each filter change", async () => {
		const mounted = await mountFilters();
		const [planet, building] = selects(mounted);

		planet.vm.$emit("update:value", "Katoa");
		building.vm.$emit("update:value", "EXT");
		building.vm.$emit("update:value", null);
		await mounted.wrapper.find("input[type=checkbox]").setValue(true);

		const emitted = mounted.component.emitted();
		expect(emitted["update:filterPlanet"]).toEqual([["Katoa"]]);
		expect(emitted["update:filterBuilding"]).toEqual([["EXT"], [null]]);
		expect(emitted["update:filterPositiveROI"]).toEqual([[true]]);
	});
});
