import { describe, it, expect } from "vitest";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";

import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

const GROUPED = [
	{
		label: "Popular",
		value: "POPULAR",
		children: [{ label: "CHP (Chemical plant)", value: "POPULAR#CHP", badge: "58 %" }],
	},
	{
		label: "All",
		value: "ALL",
		children: [
			{ label: "AML (Alloy smelter)", value: "AML" },
			{ label: "CHP (Chemical plant)", value: "CHP" },
		],
	},
];

const body = () => new DOMWrapper(document.body);
const highlighted = () => body().find("[data-pselect-dropdown] .bg-gray-700");

async function mountSelect(options: unknown[]) {
	const picked: unknown[] = [];
	const mounted = await mountComponent(PSelect, {
		value: undefined,
		options,
		searchable: true,
		"onUpdate:value": (v: unknown) => picked.push(v),
	});
	return { ...mounted, picked };
}

async function key(wrapper: VueWrapper, name: string) {
	await wrapper.find('[role="combobox"]').trigger("keydown", { key: name });
	await flushPromises();
}

describe("PSelect", () => {
	it("moves through group children, not headers, and picks with Enter", async () => {
		const { wrapper, picked } = await mountSelect(GROUPED);

		await key(wrapper, "ArrowDown");
		expect(highlighted().text()).toContain("CHP");
		expect(highlighted().text()).toContain("58 %");

		await key(wrapper, "ArrowDown");
		expect(highlighted().text()).toContain("AML");
		await key(wrapper, "ArrowDown");
		await key(wrapper, "ArrowDown");
		// stops at the last entry
		expect(highlighted().text()).toContain("CHP (Chemical plant)");
		expect(highlighted().text()).not.toContain("58 %");

		await key(wrapper, "Enter");
		expect(picked).toEqual(["CHP"]);
	});

	it("searches by label, not badge, in both groups", async () => {
		const { wrapper, picked } = await mountSelect(GROUPED);
		await key(wrapper, "ArrowDown");

		await wrapper.find("input").setValue("chp");
		await flushPromises();
		const entries = body()
			.findAll("[data-pselect-dropdown] .pl-3.grow")
			.map((e) => e.text());
		expect(entries).toEqual(["CHP (Chemical plant)", "CHP (Chemical plant)"]);

		await wrapper.find("input").setValue("58");
		await flushPromises();
		expect(body().text()).toContain("common.ui.select.no_results");

		await wrapper.find("input").setValue("chp");
		await flushPromises();
		await key(wrapper, "ArrowDown");
		await key(wrapper, "Enter");
		expect(picked).toEqual(["CHP"]);
	});

	it("keeps keyboard picking for flat options", async () => {
		const { wrapper, picked } = await mountSelect([
			{ label: "A", value: "a" },
			{ label: "B", value: "b" },
		]);

		await key(wrapper, "ArrowDown");
		expect(highlighted().text()).toBe("A");
		await key(wrapper, "ArrowDown");
		await key(wrapper, "Enter");
		expect(picked).toEqual(["b"]);
	});
});
