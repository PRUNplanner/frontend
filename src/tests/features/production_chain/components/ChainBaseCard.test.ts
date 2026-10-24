import { describe, it, expect, beforeAll } from "vitest";

import ChainBaseCard from "@/features/production_chain/components/ChainBaseCard.vue";
import { PInput, PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import { cogcFits } from "@/features/production_chain/engine/chainBases";
import {
	FOOD_PLANET,
	seedGameData,
	splitInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

import type { PSelectOption } from "@/ui/ui.types";
import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";

const ctx = testContext();

async function mountCard(planets: [string | null, string | null], id = "B") {
	const input = splitInput(planets);
	const result = solveChain(input, ctx);
	const base = result.bases.find((b) => b.id === id)!;
	const tickers = base.buildingTypes.map((b) => b.ticker);
	return mountComponent(ChainBaseCard, {
		base,
		choice: input.bases.find((b) => b.id === id)!,
		efficiency: 1,
		removable: true,
		fits: (p: PlanCOGCProgram) => cogcFits(ctx, p, tickers),
	});
}

describe("ChainBaseCard", () => {
	beforeAll(seedGameData);

	it("renames, removes and opens the planet picker", async () => {
		const { wrapper, component } = await mountCard([null, null]);
		wrapper.findComponent(PInput).vm.$emit("update:value", "Kitchen");
		await wrapper
			.find("[aria-label='production_chains.bases.remove']")
			.trigger("click");
		await wrapper
			.find("[data-testid='chain-base-planet-B']")
			.trigger("click");
		expect(component.emitted("rename")).toEqual([["Kitchen"]]);
		expect(component.emitted("remove")).toHaveLength(1);
		expect(component.emitted("planet")).toHaveLength(1);
		expect(wrapper.text()).toContain("production_chains.bases.pick_planet");
	});

	it("offers every program, fitting ones first, others not running (AC 16)", async () => {
		const { wrapper, component } = await mountCard([null, FOOD_PLANET]);
		const options = wrapper
			.findComponent(PSelect)
			.props("options") as PSelectOption[];
		expect(options.slice(0, 2).map((o) => o.value)).toEqual([
			"auto",
			"none",
		]);
		expect(options[0].label).toBe("production_chains.bases.cogc_running");
		// FP employs pioneers and settlers, food industries fits
		const programs = options.slice(2);
		expect(programs.length).toBe(14);
		const fitting = programs.filter((o) => o.badge?.includes("bonus"));
		expect(fitting.map((o) => o.value)).toContain("FOOD_INDUSTRIES");
		expect(programs.indexOf(fitting[fitting.length - 1])).toBe(
			fitting.length - 1
		);
		const food = programs.find((o) => o.value === "FOOD_INDUSTRIES")!;
		expect(food.badge).not.toContain("not_running");
		const agri = programs.find((o) => o.value === "AGRICULTURE")!;
		expect(agri.badge).toBe("production_chains.bases.not_running");

		wrapper.findComponent(PSelect).vm.$emit("update:value", "AGRICULTURE");
		expect(component.emitted("cogc")).toEqual([["AGRICULTURE"]]);
		// the running program fits: a line says so
		expect(wrapper.text()).toContain("production_chains.bases.cogc_fits");
	});

	it("shows the base's footprint and warnings (AC 5)", async () => {
		const { wrapper } = await mountCard([FOOD_PLANET, null], "A");
		const warnings = wrapper.find("[data-testid='chain-base-warnings-A']");
		expect(warnings.text()).toContain("production_chains.bases.no_farming");
		expect(wrapper.text()).toContain("production_chains.bases.permits");
		expect(
			wrapper.find("[data-testid='chain-base-buildings-A']").text()
		).toContain("STO");
	});
});
