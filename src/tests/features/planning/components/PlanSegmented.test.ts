import { describe, it, expect } from "vitest";

import PlanSegmented from "@/features/planning/components/PlanSegmented.vue";
import { mountComponent } from "@/tests/mountComponent";

const OPTIONS = [
	{ value: "daily", label: "Daily" },
	{ value: "area", label: "Area" },
];

describe("PlanSegmented", () => {
	it("presses the current value and emits the clicked one", async () => {
		const { wrapper, component, setProps } = await mountComponent(
			PlanSegmented,
			{ options: OPTIONS, label: "Sort by", modelValue: "daily" }
		);
		const buttons = () => wrapper.findAll("button");

		expect(wrapper.find("[role=group]").attributes("aria-label")).toBe(
			"Sort by"
		);
		expect(buttons().map((b) => [b.text(), b.attributes("aria-pressed")])).toEqual([
			["Daily", "true"],
			["Area", "false"],
		]);

		await buttons().at(1)!.trigger("click");
		expect(component.emitted("update:modelValue")).toEqual([["area"]]);

		await setProps({ modelValue: "area" });
		expect(buttons().map((b) => b.attributes("aria-pressed"))).toEqual([
			"false",
			"true",
		]);
	});
});
