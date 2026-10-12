import { describe, it, expect } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import FIOBurnPlanTable from "@/features/fio/components/FIOBurnPlanTable.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// Types & Interfaces
import type { IFIOBurnPlanetTableElement } from "@/features/fio/useFIOBurn.types";

// the ids sort the other way round than the names
const PLANS: IFIOBurnPlanetTableElement[] = [
	{ planUuid: "a-uuid", planName: "Zeta", planetId: "KW-020a", minDays: 3 },
	{ planUuid: "z-uuid", planName: "Alpha", planetId: "KW-020a", minDays: 9 },
	{ planUuid: "m-uuid", planName: "Mid", planetId: "KW-020a", minDays: 1 },
];

const plans = (wrapper: VueWrapper) =>
	tableRows(wrapper).map((r) => r.planUuid);
const sort = (wrapper: VueWrapper, key: string) =>
	wrapper.find(`th[data-col-key="${key}"] button`).trigger("click");

describe("FIOBurnPlanTable", () => {
	it("sorts the plan column by the plan name, not its id", async () => {
		const { wrapper } = await mountComponent(FIOBurnPlanTable, {
			planTable: PLANS,
		});
		expect(plans(wrapper)).toEqual(["Zeta", "Alpha", "Mid"]);

		await sort(wrapper, "planUuid");
		expect(plans(wrapper)).toEqual(["Zeta", "Mid", "Alpha"]);
		await sort(wrapper, "planUuid");
		expect(plans(wrapper)).toEqual(["Alpha", "Mid", "Zeta"]);
	});

	it("sorts by burn days and has no sort on the planet", async () => {
		const { wrapper } = await mountComponent(FIOBurnPlanTable, {
			planTable: PLANS,
		});

		await sort(wrapper, "minDays");
		expect(plans(wrapper)).toEqual(["Alpha", "Zeta", "Mid"]);
		expect(
			wrapper.find('th[data-col-key="planetId"] button').exists()
		).toBe(false);
	});
});
