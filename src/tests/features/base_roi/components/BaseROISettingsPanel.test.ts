import { describe, expect, it } from "vitest";
import { flushPromises } from "@vue/test-utils";

import BaseROISettingsPanel from "@/features/base_roi/components/BaseROISettingsPanel.vue";
import PSelect from "@/ui/components/PSelect.vue";
import PSegmented from "@/ui/components/PSegmented.vue";
import PCheckbox from "@/ui/components/PCheckbox.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import { mountComponent } from "@/tests/mountComponent";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";

// Types & Interfaces
import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";

async function mountPanel(settings: BaseROISettings = defaultBaseROISettings()) {
	const updates: BaseROISettings[] = [];
	const setups: unknown[] = [];
	const { wrapper } = await mountComponent(BaseROISettingsPanel, {
		settings,
		expertiseOptions: ["CHEMISTRY", "MANUFACTURING"],
		buildingOptions: ["CHP", "PP1"],
		exchanges: ["AI1"],
		"onUpdate:settings": (v: BaseROISettings) => updates.push(v),
		onSetup: () => setups.push(true),
	});
	await flushPromises();
	return { wrapper, updates, setups };
}

/** the select whose aria-label is the key */
const select = (wrapper: Awaited<ReturnType<typeof mountPanel>>["wrapper"], key: string) =>
	wrapper
		.findAllComponents(PSelect)
		.find((s) => s.attributes("aria-label") === `base_roi.settings.${key}`)!;

describe("BaseROISettingsPanel (criterion 3)", () => {
	it("every control writes its setting", async () => {
		const { wrapper, updates } = await mountPanel();
		const cases: [string, keyof BaseROISettings, unknown][] = [
			["experts", "experts", 3],
			["buffer", "bufferDays", 14],
			["min_market_capacity", "minMarketCapacity", 0.2],
			["target_permit", "targetPermit", 10],
			["round_trip", "roundTripHours", 8],
			["ship", "ship", "WCB"],
			["visit_days", "visitDays", 5],
			["all_expertise", "expertise", "CHEMISTRY"],
			["all_buildings", "building", "CHP"],
		];
		for (const [label, key, value] of cases) {
			select(wrapper, label).vm.$emit("update:value", value);
			expect(updates.at(-1)![key]).toBe(value);
		}
		select(wrapper, "all_expertise").vm.$emit("update:value", null);
		expect(updates.at(-1)!.expertise).toBe("");
		select(wrapper, "all_buildings").vm.$emit("update:value", undefined);
		expect(updates.at(-1)!.building).toBe("");

		const [cogc, logistics] = wrapper.findAllComponents(PSegmented);
		cogc.vm.$emit("update:value", "none");
		expect(updates.at(-1)!.cogc).toBe("none");
		logistics.vm.$emit("update:value", "manual");
		expect(updates.at(-1)!.logistics).toBe("manual");

		const [resources, recipes, negative] = wrapper.findAllComponents(PCheckbox);
		resources.vm.$emit("update:checked", false);
		expect(updates.at(-1)!.showResources).toBe(false);
		recipes.vm.$emit("update:checked", false);
		expect(updates.at(-1)!.showRecipes).toBe(false);
		negative.vm.$emit("update:checked", true);
		expect(updates.at(-1)!.showNegative).toBe(true);

		const jumps = wrapper.findAllComponents(PInputNumber).at(-1)!;
		jumps.vm.$emit("update:value", 4.6);
		expect(updates.at(-1)!.maxJumps).toBe(5);
		jumps.vm.$emit("update:value", null);
		expect(updates.at(-1)!.maxJumps).toBe(0);
	});

	it("manual logistics: t and m³ per day", async () => {
		const { wrapper, updates } = await mountPanel({
			...defaultBaseROISettings(),
			logistics: "manual",
		});
		const [weight, volume] = wrapper.findAllComponents(PInputNumber);
		weight.vm.$emit("update:value", 800);
		expect(updates.at(-1)!.manualWeight).toBe(800);
		volume.vm.$emit("update:value", null);
		expect(updates.at(-1)!.manualVolume).toBe(0);
		expect(wrapper.text()).toContain("base_roi.settings.logistics_manual");
	});

	it("summarises the closed panel and toggles it", async () => {
		const { wrapper, updates } = await mountPanel({
			...defaultBaseROISettings(),
			panelOpen: false,
			experts: 2,
			bufferDays: 0,
			cogc: "none",
			logistics: "none",
		});
		expect(wrapper.find("#base-roi-settings").isVisible()).toBe(false);
		await wrapper.find("button[aria-expanded]").trigger("click");
		expect(updates.at(-1)!.panelOpen).toBe(true);
		expect(wrapper.text()).toContain("base_roi.settings.summary");
	});

	it("Run setup again and Reset to defaults (keeps columns and drawer)", async () => {
		const { wrapper, updates, setups } = await mountPanel({
			...defaultBaseROISettings(),
			bufferDays: 21,
			hiddenColumns: ["cargo"],
			chartOpen: true,
		});
		const button = (label: string) =>
			wrapper.findAll("button").find((b) => b.text() === label)!;
		await button("base_roi.settings.run_setup").trigger("click");
		expect(setups).toHaveLength(1);
		await button("base_roi.settings.reset").trigger("click");
		expect(updates.at(-1)).toEqual({
			...defaultBaseROISettings(),
			hiddenColumns: ["cargo"],
			chartOpen: true,
		});
	});
});
