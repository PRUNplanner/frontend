import { describe, expect, it } from "vitest";
import { flushPromises } from "@vue/test-utils";

import BaseROIColumnsMenu from "@/features/base_roi/components/BaseROIColumnsMenu.vue";
import PCheckbox from "@/ui/components/PCheckbox.vue";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { BaseROIColumn } from "@/features/base_roi/baseROI.schemas";

async function mountMenu(hiddenColumns: BaseROIColumn[] = []) {
	const updates: BaseROIColumn[][] = [];
	const { wrapper } = await mountComponent(
		BaseROIColumnsMenu,
		{
			hiddenColumns,
			"onUpdate:hiddenColumns": (v: BaseROIColumn[]) => updates.push(v),
		},
		{ attach: true }
	);
	await flushPromises();
	await wrapper.find("button").trigger("click");
	await flushPromises();
	return { wrapper, updates };
}

describe("BaseROIColumnsMenu (criterion 14)", () => {
	it("hides and shows every column but the product", async () => {
		const { wrapper, updates } = await mountMenu(["cargo"]);
		expect(wrapper.text()).toContain("base_roi.columns.button");
		const boxes = wrapper.findAllComponents(PCheckbox);
		// product first, always on and disabled
		expect(boxes[0].props("disabled")).toBe(true);
		expect(boxes).toHaveLength(11);

		boxes[1].vm.$emit("update:checked", false);
		expect(updates.at(-1)).toEqual(["cargo", "expertise"]);
		const cargo = boxes.find((b) => b.text() === "base_roi.columns.cargo")!;
		cargo.vm.$emit("update:checked", true);
		expect(updates.at(-1)).toEqual([]);
	});

	it("Reset shows them all", async () => {
		const { wrapper, updates } = await mountMenu(["cargo", "workforce"]);
		// the popover's panel is teleported: find it as a component
		const reset = wrapper
			.findAllComponents(PButton)
			.find((b) => b.text() === "base_roi.columns.reset")!;
		reset.vm.$emit("click");
		expect(updates.at(-1)).toEqual([]);
	});
});
