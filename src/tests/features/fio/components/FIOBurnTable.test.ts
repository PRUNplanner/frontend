import { describe, it, expect } from "vitest";

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
		{ ticker: "RAT", input: 10, output: 0, delta: -10, stock: 40, exhaustion: 4 },
	],
};

describe("FIOBurnTable", () => {
	it("names the expand button and shows the materials when expanded", async () => {
		const { wrapper } = await mountComponent(FIOBurnTable, {
			burnTable: [ROW],
		});
		const button = wrapper.find("tbody button[aria-expanded]");

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
});
