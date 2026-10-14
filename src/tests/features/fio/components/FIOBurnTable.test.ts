import { describe, it, expect, vi } from "vitest";

import FIOBurnTable from "@/features/fio/components/FIOBurnTable.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { IFIOBurnTableElement } from "@/features/fio/useFIOBurn.types";

const ROW: IFIOBurnTableElement = {
	key: "plan-a",
	planUuid: "plan-a",
	planName: "Plan A",
	planetId: "KW-020a",
	hasStorage: true,
	minDays: 4,
	burnMaterials: [
		{
			ticker: "RAT",
			input: 10,
			output: 0,
			delta: -10,
			stock: 40,
			exhaustion: 4,
		},
		{
			ticker: "DW",
			input: 10,
			output: 0,
			delta: -10,
			stock: 80,
			exhaustion: 8,
		},
		{
			ticker: "FE",
			input: 0,
			output: 5,
			delta: 5,
			stock: 0,
			exhaustion: Infinity,
		},
	],
};

const MESSAGES = {
	fio: {
		burn: {
			components: {
				plans: {
					runs_out_first: "runs out first, in {days} days",
					more_under: "{n} more under {days} d",
					produced: "{n} produced here",
					produced_here: "produced here",
				},
			},
		},
	},
};

async function mountExpanded() {
	const { wrapper } = await mountComponent(
		FIOBurnTable,
		{ burnTable: [ROW] },
		{ messages: MESSAGES }
	);
	const button = wrapper.find("tbody button[aria-expanded]");
	return { wrapper, button };
}

describe("FIOBurnTable", () => {
	it("names the expand button and shows the materials when expanded", async () => {
		const { wrapper, button } = await mountExpanded();

		expect(button.attributes("aria-label")).toBe(
			"fio.burn.components.plans.expand_row"
		);
		expect(button.attributes("aria-expanded")).toBe("false");

		await button.trigger("click");
		expect(button.attributes("aria-expanded")).toBe("true");
		expect(
			wrapper.find('.p-data-table-expand td[data-col-key="stock"]').text()
		).toBe("40");
	});

	it("says what runs out first and draws a runway per material", async () => {
		const { wrapper, button } = await mountExpanded();
		await button.trigger("click");

		const expand = wrapper.find(".p-data-table-expand");
		expect(expand.text()).toContain("runs out first, in 4.0 days");
		expect(expand.text()).toContain("1 more under 10 d · 1 produced here");

		const runways = expand.findAll('td[data-col-key="runway"] [role=img]');
		expect(runways).toHaveLength(3);
		// 4 of 30 days, red
		expect(runways[0].find(".bg-negative").attributes("style")).toContain(
			"width: 13.333"
		);
		expect(runways[2].text()).toBe("produced here");
	});

	it("drops consumption and production below 1600 px", async () => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			}))
		);
		const { wrapper, button } = await mountExpanded();
		await button.trigger("click");

		const keys = wrapper
			.findAll(".p-data-table-expand th[data-col-key]")
			.map((th) => th.attributes("data-col-key"));
		expect(keys).toEqual([
			"ticker",
			"delta",
			"stock",
			"runway",
			"exhaustion",
		]);
		vi.unstubAllGlobals();
	});
});
