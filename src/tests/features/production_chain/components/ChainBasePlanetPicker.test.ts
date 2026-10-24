import { describe, it, expect, beforeAll } from "vitest";
import { DOMWrapper } from "@vue/test-utils";

import ChainBasePlanetPicker from "@/features/production_chain/components/ChainBasePlanetPicker.vue";
import { PCheckbox, PInput } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import { rankPlanets } from "@/features/production_chain/engine/chainBases";
import {
	FARM_PLANET,
	FOOD_PLANET,
	chainInput,
	index,
	seedGameData,
	splitInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

import type { IChainInput } from "@/features/production_chain/engine/chainSolver.types";

const ctx = testContext();

async function mountPicker(
	input: IChainInput,
	baseId: string,
	myPlanets: string[] = []
) {
	const result = solveChain(input, ctx);
	const { wrapper, component } = await mountComponent(ChainBasePlanetPicker, {
		show: true,
		baseId,
		result,
		input,
		ctx,
		index,
		loading: false,
		error: false,
		defaultCX: "AI1",
		myPlanets: new Set(myPlanets),
	});
	const body = new DOMWrapper(document.body);
	const rows = () => body.findAll("[data-testid='chain-base-picker-row']");
	const names = () => rows().map((r) => r.find("td").text());
	const checkbox = (testid: string) =>
		wrapper
			.findAllComponents(PCheckbox)
			.find((c) => c.attributes("data-testid") === testid)!;
	return { wrapper, component, body, rows, names, checkbox, result };
}

describe("ChainBasePlanetPicker", () => {
	beforeAll(seedGameData);

	it("ranks a farm base by buildings, then area, on fertile planets (AC 7)", async () => {
		const input = splitInput([null, null]);
		const { rows, body, result } = await mountPicker(input, "A");
		const fits = rankPlanets(result, input, ctx, "A", index).filter(
			(f) => !f.missing.length && !f.noFarming
		);
		expect(body.text()).toContain("production_chains.base_picker.count");
		// cut to the first 100
		expect(rows().length).toBe(Math.min(100, fits.length));
		const built = rows().map((r) =>
			Number(r.findAll("td")[1].text().split(/\s/)[0])
		);
		expect(built).toEqual([...built].sort((a, b) => a - b));
		// fewer buildings than now (the chain efficiency, no planet)
		expect(rows()[0].findAll("td")[1].text()).toContain("−");
	});

	it("filters to planets with my plans and marks them (AC 18)", async () => {
		const input = splitInput([null, null]);
		const { wrapper, rows, names, checkbox } = await mountPicker(
			input,
			"A",
			[FARM_PLANET, FOOD_PLANET]
		);
		checkbox("chain-base-picker-mine").vm.$emit("update:checked", true);
		await wrapper.vm.$nextTick();
		// the food planet can't farm, so the needs filter drops it
		expect(rows().length).toBe(1);
		expect(names()[0]).toContain("production_chains.base_picker.your_plan");

		checkbox("chain-base-picker-needs").vm.$emit("update:checked", false);
		await wrapper.vm.$nextTick();
		expect(rows().length).toBe(2);
		expect(names().join()).toContain("production_chains.table.no_farming");
	});

	it("names missing resources for an extracting base and clears the planet", async () => {
		const input = chainInput([["H2O", 50]]);
		const { wrapper, component, body, names, checkbox } = await mountPicker(
			input,
			"A"
		);
		checkbox("chain-base-picker-needs").vm.$emit("update:checked", false);
		wrapper
			.findComponent(PInput)
			.vm.$emit("update:value", FOOD_PLANET.toLowerCase());
		await wrapper.vm.$nextTick();
		expect(names()[0]).toContain(
			"production_chains.base_picker.no_resource"
		);

		await body
			.find("[data-testid='chain-base-no-planet']")
			.trigger("click");
		expect(component.emitted("use")).toEqual([[null]]);
	});
});
