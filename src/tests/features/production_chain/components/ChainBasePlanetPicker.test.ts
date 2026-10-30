import { describe, it, expect, beforeAll } from "vitest";
import { DOMWrapper } from "@vue/test-utils";

import ChainBasePlanetPicker from "@/features/production_chain/components/ChainBasePlanetPicker.vue";
import { PCheckbox, PInput, PInputNumber } from "@/ui";
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

	it("shows the plots chip on every ranked planet, next to your plan", async () => {
		const input = splitInput([null, null]);
		const { rows } = await mountPicker(input, "A", [FARM_PLANET]);
		expect(rows().length).toBeGreaterThan(0);
		for (const row of rows())
			expect(row.find("td [data-testid='planet-plots']").exists()).toBe(
				true
			);
		const mine = rows().find((r) =>
			r.find("[data-testid='chain-your-plan']").exists()
		);
		// Saladin, 332 of 395 plots free in the recorded index
		expect(mine!.find("[data-testid='planet-plots']").text()).toBe(
			"planet_search.plots.free"
		);
	});

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

describe("ChainBasePlanetPicker sorting and filters", () => {
	beforeAll(seedGameData);

	const header = (
		body: DOMWrapper<Element>,
		key: string
	): DOMWrapper<Element> =>
		body
			.findAll("thead button")
			.find((b) =>
				b.text().startsWith(`production_chains.base_picker.col_${key}`)
			)!;
	const checkboxByText = (
		wrapper: Awaited<ReturnType<typeof mountPicker>>["wrapper"],
		key: string
	) =>
		wrapper
			.findAllComponents(PCheckbox)
			.find((c) => c.text() === `production_chains.${key}`)!;

	it("sorts by every column, both ways", async () => {
		const { body, names, rows } = await mountPicker(
			splitInput([null, null]),
			"A"
		);
		await header(body, "name").trigger("click");
		const asc = names().map((n) => n.split(/\s/)[0]);
		expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b)));
		await header(body, "name").trigger("click");
		expect(names()[0]).not.toBe(asc[0]);
		for (const key of [
			"built",
			"area",
			"cogc",
			"fert",
			"extras",
			"jumps",
		]) {
			await header(body, key).trigger("click");
			expect(rows().length).toBeGreaterThan(0);
			expect(header(body, key).text()).toMatch(/[↑↓]/);
		}
	});

	it("narrows by program, fertility, extras, market and jumps", async () => {
		const { wrapper, body, rows, names } = await mountPicker(
			splitInput([null, null]),
			"A"
		);
		const all = rows().length;
		for (const key of [
			"base_picker.fertile",
			"planet_picker.no_extras",
			"planet_picker.local_market",
		]) {
			checkboxByText(wrapper, key).vm.$emit("update:checked", true);
			await wrapper.vm.$nextTick();
		}
		expect(rows().length).toBeLessThan(all);
		expect(
			names().every((n) =>
				n.includes("production_chains.planet_picker.lm")
			)
		).toBe(true);

		checkboxByText(wrapper, "base_picker.cogc").vm.$emit(
			"update:checked",
			true
		);
		wrapper.findComponent(PInputNumber).vm.$emit("update:value", 0);
		await wrapper.vm.$nextTick();
		expect(rows().length).toBe(0);
		expect(body.text()).toContain("production_chains.planet_picker.none");
	});

	it("marks the planet in use and falls back to the first base", async () => {
		const input = splitInput([FARM_PLANET, null]);
		const { wrapper, body } = await mountPicker(input, "Z");
		wrapper
			.findComponent(PInput)
			.vm.$emit("update:value", FARM_PLANET.toLowerCase());
		await wrapper.vm.$nextTick();
		const use = body.find("[data-testid='chain-base-picker-row'] button");
		expect(use.attributes("aria-current")).toBe("true");
		expect(use.text()).toBe("production_chains.planet_picker.in_use");
	});

	it("shows loading and error states", async () => {
		const input = splitInput([null, null]);
		const result = solveChain(input, ctx);
		for (const [loading, text] of [
			[true, "production_chains.planet_picker.loading"],
			[false, "production_chains.planet_picker.error"],
		] as const) {
			await mountComponent(ChainBasePlanetPicker, {
				show: true,
				baseId: "A",
				result,
				input,
				ctx,
				index: null,
				loading,
				error: !loading,
				defaultCX: "AI1",
				myPlanets: new Set(),
			});
			expect(new DOMWrapper(document.body).text()).toContain(text);
		}
	});
});
