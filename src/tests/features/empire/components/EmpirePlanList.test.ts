import { describe, it, expect, beforeAll, vi } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import { planetsStore } from "@/database/stores";
import { usePlanetData } from "@/database/services/usePlanetData";
import EmpirePlanList from "@/features/empire/components/EmpirePlanList.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// Types & Interfaces
import type { IEmpirePlanListData } from "@/features/empire/empire.types";

// test data
import planets from "@/tests/test_data/api_data_planets.json";

const plan = (
	uuid: string,
	name: string,
	planet: string,
	profit: number
): IEmpirePlanListData => ({
	uuid,
	name,
	planet,
	permits: 1,
	cogc: "---",
	profit,
	revenue: 0,
	inputs: 0,
	workforce: 0,
	degradation: 0,
});

// KW-020d is Kakrafoon Kappa: first by name, last by id
const PLANS = [
	plan("a", "Plan A", "KW-020a", 10),
	plan("c", "Plan C", "KW-020c", 30),
	plan("d", "Plan D", "KW-020d", 20),
];
const KAKRAFOON = "Kakrafoon Kappa (KW-020d)";
const MILLIWAYS = "Milliways (KW-020c)";

const column = (wrapper: VueWrapper, key: string) =>
	tableRows(wrapper).map((r) => r[key]);
const sort = (wrapper: VueWrapper, key: string) =>
	wrapper.find(`th[data-col-key="${key}"] button`).trigger("click");

describe("EmpirePlanList", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await planetsStore.setMany(planets);
		await usePlanetData().reload();
	});

	it("lists the plans by name and sums the permits", async () => {
		const { wrapper } = await mountComponent(EmpirePlanList, {
			planListData: [PLANS[2], PLANS[0], PLANS[1]],
		});

		expect(column(wrapper, "name")).toEqual(["Plan A", "Plan C", "Plan D"]);
		expect(wrapper.find("tfoot").text()).toContain(
			"empire.plan_list.permits_planned"
		);
	});

	it("sorts the planet column by the name shown, not the id", async () => {
		const { wrapper } = await mountComponent(EmpirePlanList, {
			planListData: PLANS,
		});
		await vi.waitFor(() =>
			expect(column(wrapper, "planet")).toContain(KAKRAFOON)
		);

		await sort(wrapper, "planet");
		expect(column(wrapper, "planet")).toEqual([
			MILLIWAYS,
			"KW-020a",
			KAKRAFOON,
		]);
		await sort(wrapper, "planet");
		expect(column(wrapper, "planet")).toEqual([
			KAKRAFOON,
			"KW-020a",
			MILLIWAYS,
		]);
	});

	it("sorts by profit, highest first", async () => {
		const { wrapper } = await mountComponent(EmpirePlanList, {
			planListData: PLANS,
		});

		await sort(wrapper, "profit");
		expect(column(wrapper, "name")).toEqual(["Plan C", "Plan D", "Plan A"]);
	});
});
