import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import RepairBuildingDetail from "@/features/repair_analysis/components/RepairBuildingDetail.vue";
import RepairMaterialList from "@/features/repair_analysis/components/RepairMaterialList.vue";
import PButton from "@/ui/components/PButton.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	materialList,
	repairBuilding,
} from "@/tests/features/repair_analysis/components/repairFixtures";

import plan from "@/locales/en_US/plan.json";

// fake tickers, the tile only renders
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render: () => h("div"),
	},
}));

const building = repairBuilding();

async function mountDetail(props: Record<string, unknown> = {}) {
	const onInterval = vi.fn();
	const onBack = vi.fn();
	const mounted = await mountComponent(
		RepairBuildingDetail,
		{
			building,
			interval: building.best,
			materials: materialList(8),
			"onUpdate:interval": onInterval,
			onBack,
			...props,
		},
		{ messages: { plan } }
	);
	return { ...mounted, onInterval, onBack };
}

const presets = (wrapper: Awaited<ReturnType<typeof mountDetail>>["wrapper"]) =>
	wrapper
		.find("[role=group]")
		.findAllComponents(PButton)
		.map((b: VueWrapper) => [b.text(), b.attributes("aria-pressed") === "true"]);

describe("RepairBuildingDetail", () => {
	it("shows the type's profit, bill and condition at the interval", async () => {
		const { wrapper } = await mountDetail();

		expect(wrapper.find("h2").text()).toBe("2× FRM");
		expect(wrapper.text()).toContain("Farm · values for all 2");
		expect(wrapper.text()).toContain(`Profit every ${building.best} d`);
		expect(wrapper.text()).toContain("best for this building");
		// materialList(8): 800 + 700 + ... + 100
		expect(wrapper.text()).toContain("3,600");
		expect(wrapper.text()).toContain("Condition at repair");
	});

	it("presses the preset of the current interval", async () => {
		const { wrapper } = await mountDetail();

		expect(presets(wrapper)).toEqual([
			[`Best · ${building.best} d`, true],
			["30 d", false],
			["60 d", false],
			["90 d", false],
		]);
	});

	it("emits the interval from a preset, the slider and the field", async () => {
		const { wrapper, onInterval } = await mountDetail();

		await wrapper.find("[role=group]").findAllComponents(PButton)[2].trigger("click");
		expect(onInterval).toHaveBeenLastCalledWith(60, "preset");

		const slider = wrapper.find("input[type=range]");
		await slider.setValue("120");
		expect(onInterval).toHaveBeenLastCalledWith(120, "slider");

		wrapper.findComponent(PInputNumber).vm.$emit("update:value", 75);
		expect(onInterval).toHaveBeenLastCalledWith(75, "input");

		// an emptied field keeps the interval
		wrapper.findComponent(PInputNumber).vm.$emit("update:value", null);
		expect(onInterval).toHaveBeenCalledTimes(3);
	});

	it("is a native range slider 1-180 that keyboards can move", async () => {
		const { wrapper } = await mountDetail({ interval: 42 });
		const slider = wrapper.find("input[type=range]");

		expect(slider.attributes()).toMatchObject({
			min: "1",
			max: "180",
			step: "1",
			"aria-valuetext": "42 days",
		});
		expect((slider.element as HTMLInputElement).value).toBe("42");
	});

	it("warns outside the good range, in amber", async () => {
		const outside = building.range[1] + 30;
		const { wrapper } = await mountDetail({ interval: outside });

		expect(wrapper.findComponent(PInputNumber).props("status")).toBe(
			"warning"
		);
		const delta = wrapper.find("[data-testid=repair-detail-delta]");
		expect(delta.classes()).toContain("text-warning");
		expect(delta.text()).toContain(`vs. ${building.best} d`);
	});

	it("shows the change against the best inside the range without a warning", async () => {
		const inside =
			building.best < building.range[1] ? building.best + 1 : building.best - 1;
		const { wrapper } = await mountDetail({ interval: inside });

		expect(wrapper.findComponent(PInputNumber).props("status")).toBe(
			undefined
		);
		const delta = wrapper.find("[data-testid=repair-detail-delta]");
		expect(delta.classes()).not.toContain("text-warning");
		expect(delta.text()).toContain("in good range");
	});

	it("on phones has a back button and shows the top 6 materials", async () => {
		const { wrapper, onBack } = await mountDetail({ back: true });

		await wrapper.find("[aria-label='Back to buildings']").trigger("click");
		expect(onBack).toHaveBeenCalled();
		expect(wrapper.findComponent(RepairMaterialList).props("limit")).toBe(6);
	});

	it("shows all materials on wider screens", async () => {
		const { wrapper } = await mountDetail();

		expect(wrapper.find("[aria-label='Back to buildings']").exists()).toBe(
			false
		);
		expect(wrapper.findAll("[data-testid=repair-material]")).toHaveLength(8);
	});
});
