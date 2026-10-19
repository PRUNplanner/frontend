import { describe, it, expect } from "vitest";

import PlanetPOPRTable from "@/features/government/components/PlanetPOPRTable.vue";
import { mountComponent } from "@/tests/mountComponent";
import { planEmptyResult } from "@/features/planning/usePlanCalculation.types";

// Types & Interfaces
import type { PopulationReport } from "@/features/api/schemas/gameData.schemas";
import type { IWorkforceRecord } from "@/features/planning/usePlanCalculation.types";

// test data
import popr from "@/tests/test_data/api_data_popr_latest.json";

const poprData = popr as PopulationReport;

function workforce(required: Record<string, number>): IWorkforceRecord {
	const record = structuredClone(planEmptyResult.workforce);
	for (const [type, amount] of Object.entries(required))
		record[type as keyof IWorkforceRecord].required = amount;
	return record;
}

describe("PlanetPOPRTable", () => {
	it("tells that the planet has no POPR data", async () => {
		const { wrapper } = await mountComponent(PlanetPOPRTable, {
			planetNaturalId: "AA-001a",
		});

		expect(wrapper.text()).toBe("government.popr_button.no_data");
		expect(wrapper.find("table").exists()).toBe(false);
	});

	it("lists population, free share and open jobs per workforce type", async () => {
		const { wrapper } = await mountComponent(PlanetPOPRTable, {
			planetNaturalId: "AA-001a",
			poprData,
		});

		expect(wrapper.text()).not.toContain("no_data");
		expect(wrapper.findAll("thead th").map((th) => th.text())).toEqual([
			"",
			"game.workforce_type.pioneer",
			"game.workforce_type.settler",
			"game.workforce_type.technician",
			"game.workforce_type.engineer",
			"game.workforce_type.scientist",
		]);

		const rows = wrapper
			.findAll("tbody tr")
			.map((tr) => tr.findAll("td").map((td) => td.text()));
		expect(rows).toEqual([
			[
				"government.popr_button.table.total_population",
				"74,034",
				"9,466",
				"146",
				"1",
				"0",
			],
			[
				"government.popr_button.table.free_population",
				"6,121",
				"3,439",
				"61",
				"1",
				"0",
			],
			[
				"government.popr_button.table.free_population_pct",
				"8.27",
				"36.34",
				"42.20",
				"100.00",
				"0.00",
			],
			[
				"government.popr_button.table.unfilled_jobs",
				"0",
				"0",
				"0",
				"0",
				"0",
			],
		]);
	});

	it("leaves out the plan comparison without workforce data", async () => {
		const { wrapper } = await mountComponent(PlanetPOPRTable, {
			planetNaturalId: "AA-001a",
			poprData,
		});

		expect(wrapper.findAll("tbody tr")).toHaveLength(4);
		expect(wrapper.text()).not.toContain("plan_need");
		expect(wrapper.find("svg").exists()).toBe(false);
	});

	it("compares the plan's need with the free workforce", async () => {
		const data: PopulationReport = {
			...poprData,
			// 61 free minus 10 unfilled leaves 51
			open_jobs_technician: 10,
		};
		const { wrapper } = await mountComponent(PlanetPOPRTable, {
			planetNaturalId: "AA-001a",
			poprData: data,
			workforceData: workforce({
				pioneer: 0, // nothing needed: always fine
				settler: 4000, // 3439 free
				technician: 51, // exactly the 51 left
				engineer: 5, // 1 free
				scientist: 0,
			}),
		});

		const rows = wrapper
			.findAll("tbody tr")
			.map((tr) => tr.findAll("td").map((td) => td.text()));
		expect(rows[4]).toEqual([
			"government.popr_button.table.plan_need",
			"0",
			"4,000",
			"51",
			"5",
			"0",
		]);

		const checks = wrapper
			.findAll("tbody tr")[5]
			.findAll("td")
			.slice(1)
			.map((td) => td.find("svg").classes());
		expect(checks.map((c) => c.includes("text-positive"))).toEqual([
			true,
			false,
			true,
			false,
			true,
		]);
		expect(checks.map((c) => c.includes("text-negative"))).toEqual([
			false,
			true,
			false,
			true,
			false,
		]);
	});

	it("does not approve a need the free workforce can't cover after open jobs", async () => {
		const { wrapper } = await mountComponent(PlanetPOPRTable, {
			planetNaturalId: "AA-001a",
			poprData: { ...poprData, open_jobs_technician: 11 },
			workforceData: workforce({ technician: 51 }),
		});

		const technician = wrapper
			.findAll("tbody tr")[5]
			.findAll("td")[3]
			.find("svg");
		expect(technician.classes()).toContain("text-negative");
		expect(technician.classes()).not.toContain("text-positive");
	});

	it("flags pioneers and scientists the planet can't staff", async () => {
		const { wrapper } = await mountComponent(PlanetPOPRTable, {
			planetNaturalId: "AA-001a",
			poprData,
			// 6,121 pioneers are free, no scientists
			workforceData: workforce({ pioneer: 6122, scientist: 1 }),
		});

		const checks = wrapper
			.findAll("tbody tr")[5]
			.findAll("td")
			.slice(1)
			.map((td) => td.find("svg").classes());
		expect(checks[0]).toContain("text-negative");
		expect(checks[0]).not.toContain("text-positive");
		expect(checks[4]).toContain("text-negative");
		expect(checks[4]).not.toContain("text-positive");
	});
});
