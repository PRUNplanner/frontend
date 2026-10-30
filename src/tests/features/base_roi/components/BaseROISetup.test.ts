import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import BaseROISetup from "@/features/base_roi/components/BaseROISetup.vue";
import { mountComponent } from "@/tests/mountComponent";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";
import PModal from "@/ui/components/PModal.vue";
import PSelect from "@/ui/components/PSelect.vue";

// Types & Interfaces
import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";

vi.mock("@/features/exchanges/components/CXPreferenceSelector.vue", () => ({
	default: {
		name: "CXPreferenceSelector",
		props: ["cxUuid"],
		render: () => null,
	},
}));

async function mountSetup(settings = defaultBaseROISettings()) {
	const updates: BaseROISettings[] = [];
	const shows: boolean[] = [];
	const { wrapper } = await mountComponent(
		BaseROISetup,
		{
			show: true,
			settings,
			cxUuid: undefined,
			"onUpdate:settings": (v: BaseROISettings) => updates.push(v),
			"onUpdate:show": (v: boolean) => shows.push(v),
		},
		{ attach: true }
	);
	await flushPromises();
	const dialog = () => document.body.querySelector('[role="dialog"]')!;
	const button = (label: string) =>
		[...dialog().querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === label
		)!;
	const preset = (p: string) =>
		dialog().querySelector<HTMLInputElement>(`input[value="${p}"]`)!;
	return { wrapper, updates, shows, dialog, button, preset };
}

describe("BaseROISetup (criterion 13)", () => {
	afterEach(() => (document.body.innerHTML = ""));

	it("Standard (preselected) writes the LCB and Knottly's limits", async () => {
		const { updates, shows, button } = await mountSetup({
			...defaultBaseROISettings(),
			ship: "TCB",
			minMarketCapacity: 0.2,
		});
		button("base_roi.setup.start").click();
		await flushPromises();
		expect(updates.at(-1)).toMatchObject({
			logistics: "ship",
			ship: "LCB",
			minMarketCapacity: 0.7,
			bufferDays: 9,
		});
		expect(shows).toEqual([false]);
	});

	it("Rookie writes the SCB", async () => {
		const { updates, button, preset } = await mountSetup();
		preset("rookie").click();
		await flushPromises();
		button("base_roi.setup.start").click();
		await flushPromises();
		expect(updates.at(-1)).toMatchObject({
			ship: "SCB",
			logistics: "ship",
		});
	});

	it("Veteran: no limit preselected, any market capacity, or a chosen ship", async () => {
		const { wrapper, updates, button, preset } = await mountSetup();
		preset("veteran").click();
		await flushPromises();
		button("base_roi.setup.start").click();
		await flushPromises();
		expect(updates.at(-1)).toMatchObject({
			logistics: "none",
			minMarketCapacity: 0,
		});

		preset("veteran").click();
		await flushPromises();
		const ship = wrapper.findAllComponents(PSelect)[0];
		ship.vm.$emit("update:value", "HCB");
		await flushPromises();
		button("base_roi.setup.start").click();
		await flushPromises();
		expect(updates.at(-1)).toMatchObject({
			logistics: "ship",
			ship: "HCB",
		});
	});

	it("days between visits and the starting columns are written", async () => {
		const { wrapper, updates, dialog, button } = await mountSetup();
		const visits = wrapper.findAllComponents(PSelect).at(-1)!;
		visits.vm.$emit("update:value", 5);
		const cargo = [...dialog().querySelectorAll("label")].find((l) =>
			l.textContent?.includes("base_roi.columns.cargo")
		)!;
		cargo.querySelector("input")!.click();
		await flushPromises();
		button("base_roi.setup.start").click();
		await flushPromises();
		expect(updates.at(-1)).toMatchObject({
			visitDays: 5,
			hiddenColumns: ["cargo"],
		});
	});

	it("Skip keeps the settings and stores them", async () => {
		const settings = {
			...defaultBaseROISettings(),
			bufferDays: 3 as const,
		};
		const { updates, button } = await mountSetup(settings);
		button("base_roi.setup.skip").click();
		await flushPromises();
		expect(updates).toHaveLength(1);
		expect(updates[0]).toEqual(settings);
	});

	it("Esc closes it like Skip", async () => {
		const { wrapper, updates, dialog } = await mountSetup();
		expect(wrapper.findComponent(PModal).exists()).toBe(true);
		dialog().dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
		);
		await flushPromises();
		expect(updates).toHaveLength(1);
	});
});
