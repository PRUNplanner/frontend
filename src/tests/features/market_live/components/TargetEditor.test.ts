import { describe, it, expect } from "vitest";
import { flushPromises } from "@vue/test-utils";

import TargetEditor from "@/features/market_live/components/TargetEditor.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { ComparisonTarget } from "@/features/market_live/cxDetectors.types";

async function mountEditor(
	modelValue: ComparisonTarget,
	fieldType: "string" | "number" | "array" = "number",
	operator = "eq"
) {
	const { wrapper, component, setProps } = await mountComponent(TargetEditor, {
		modelValue,
		fieldType,
		operator,
	});

	/** last emitted target */
	const lastTarget = () =>
		component.emitted("update:modelValue")?.at(-1)?.[0] as
			| ComparisonTarget
			| undefined;

	return { wrapper, component, setProps, lastTarget };
}

describe("TargetEditor", () => {
	it("offers the target type select unless the operator is 'matches'", async () => {
		const { wrapper } = await mountEditor({ type: "static", value: 1 });
		expect(wrapper.findComponent(PSelect).exists()).toBe(true);
		expect(wrapper.text()).not.toContain("market_live.rule_type.text");

		const { wrapper: matches } = await mountEditor(
			{ type: "static", value: "abc" },
			"string",
			"matches"
		);
		expect(matches.findComponent(PSelect).exists()).toBe(false);
		expect(matches.text()).toContain("market_live.rule_type.text");
	});

	it("forces a static target when the operator switches to 'matches'", async () => {
		const { setProps, lastTarget } = await mountEditor(
			{ type: "previous" },
			"string"
		);

		await setProps({ operator: "matches" });
		expect(lastTarget()).toEqual({ type: "static", value: "" });
	});

	it("keeps a static target when switching to 'matches'", async () => {
		const { component, setProps } = await mountEditor(
			{ type: "static", value: "x" },
			"string"
		);

		await setProps({ operator: "matches" });
		expect(component.emitted("update:modelValue")).toBeUndefined();
	});

	it.each([
		["static", "number", { type: "static", value: 0 }],
		["static", "string", { type: "static", value: "" }],
		["previous", "number", { type: "previous" }],
		["previous_pct", "number", { type: "previous_pct", offset: 0 }],
	] as const)(
		"selecting type %s on a %s field emits its default",
		async (type, fieldType, expected) => {
			const { wrapper, lastTarget } = await mountEditor(
				{ type: "previous" },
				fieldType
			);

			wrapper.findComponent(PSelect).vm.$emit("update:value", type);
			await flushPromises();

			expect(lastTarget()).toEqual(expected);
		}
	);

	it("emits a typed number for static number targets", async () => {
		const { wrapper, lastTarget } = await mountEditor({
			type: "static",
			value: 1,
		});

		const input = wrapper.find("input");
		expect(input.element.value).toBe("1");
		await input.setValue("42");

		expect(lastTarget()).toEqual({ type: "static", value: 42 });
	});

	it("falls back to 0 when a static number is cleared", async () => {
		const { wrapper, lastTarget } = await mountEditor({
			type: "static",
			value: 7,
		});

		await wrapper.find("input").setValue("");
		expect(lastTarget()).toEqual({ type: "static", value: 0 });
	});

	it("emits text for static string targets", async () => {
		const { wrapper, lastTarget } = await mountEditor(
			{ type: "static", value: "" },
			"string"
		);

		await wrapper.find("input").setValue("RAT");
		expect(lastTarget()).toEqual({ type: "static", value: "RAT" });
	});

	it("edits the offset of percentage targets", async () => {
		const { wrapper, lastTarget } = await mountEditor({
			type: "previous_pct",
			offset: 5,
		});

		const input = wrapper.find("input");
		expect(input.element.value).toBe("5");
		await input.setValue("-10");

		expect(lastTarget()).toEqual({ type: "previous_pct", offset: -10 });
	});

	it("falls back to 0 when a percentage offset is cleared", async () => {
		const { wrapper, lastTarget } = await mountEditor({
			type: "previous_pct",
			offset: 5,
		});

		await wrapper.find("input").setValue("");
		expect(lastTarget()).toEqual({ type: "previous_pct", offset: 0 });
	});

	it("shows no input for 'previous' targets", async () => {
		const { wrapper } = await mountEditor({ type: "previous" });

		expect(wrapper.find("input").exists()).toBe(false);
		expect(wrapper.text()).toContain(
			"market_live.components.alert_manager.form.previous_datapoint"
		);
	});
});
