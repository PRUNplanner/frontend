import { describe, it, expect } from "vitest";
import { createPinia } from "pinia";

import ChainSettings from "@/features/production_chain/components/ChainSettings.vue";
import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";
import { mountComponent } from "@/tests/mountComponent";

async function mountSettings() {
	const updates: Record<string, unknown[]> = {};
	const on = (key: string) => (v: unknown) => (updates[key] ??= []).push(v);
	const { wrapper } = await mountComponent(
		ChainSettings,
		{
			efficiency: 100,
			rawSource: "buy",
			byproducts: "cover",
			cxUuid: undefined,
			followDefault: false,
			"onUpdate:efficiency": on("efficiency"),
			"onUpdate:rawSource": on("rawSource"),
			"onUpdate:byproducts": on("byproducts"),
			"onUpdate:cxUuid": on("cxUuid"),
		},
		{ pinia: createPinia() }
	);
	return { wrapper, updates };
}

const button = (
	wrapper: Awaited<ReturnType<typeof mountSettings>>["wrapper"],
	text: string
) => wrapper.findAll("button").find((b) => b.text() === text)!;

describe("ChainSettings", () => {
	it("sets efficiency, ignoring an empty field", async () => {
		const { wrapper, updates } = await mountSettings();
		const input = wrapper.find("input");
		await input.setValue("");
		expect(updates.efficiency).toBeUndefined();
		await input.setValue("120");
		expect(updates.efficiency).toEqual([120]);
	});

	it("switches raw resources and byproducts", async () => {
		const { wrapper, updates } = await mountSettings();
		await button(wrapper, "production_chains.settings.extract").trigger(
			"click"
		);
		await button(wrapper, "production_chains.settings.sell").trigger(
			"click"
		);
		expect(updates.rawSource).toEqual(["extract"]);
		expect(updates.byproducts).toEqual(["sell"]);
	});

	it("hands the CX through and follows the link's CX", async () => {
		const { wrapper, updates } = await mountSettings();
		const selector = wrapper.findComponent(CXPreferenceSelector);
		expect(selector.props("followDefault")).toBe(false);
		selector.vm.$emit("update:cxUuid", "cx-1");
		expect(updates.cxUuid).toEqual(["cx-1"]);
	});
});
