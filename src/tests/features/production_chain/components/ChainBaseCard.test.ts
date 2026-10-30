import { describe, it, expect, beforeAll } from "vitest";
import { DOMWrapper } from "@vue/test-utils";

import ChainBaseCard from "@/features/production_chain/components/ChainBaseCard.vue";
import { PInput, PInputNumber, PSelect } from "@/ui";
import messages from "@/locales/en_US/production_chains.json";
import gameMessages from "@/locales/en_US/game.json";
import { mountComponent } from "@/tests/mountComponent";
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import { cogcFits } from "@/features/production_chain/engine/chainBases";
import {
	FOOD_PLANET,
	chainInput,
	seedGameData,
	splitInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

import type { PSelectOption } from "@/ui/ui.types";
import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
import type { IChainInput } from "@/features/production_chain/engine/chainSolver.types";

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

describe("ChainBaseCard variants", () => {
	beforeAll(seedGameData);

	async function mountFor(input: IChainInput, id = "A") {
		const result = solveChain(input, ctx);
		const base = result.bases.find((b) => b.id === id)!;
		const tickers = base.buildingTypes.map((b) => b.ticker);
		return mountComponent(ChainBaseCard, {
			base,
			choice: input.bases.find((b) => b.id === id)!,
			efficiency: 1,
			removable: false,
			fits: (p: PlanCOGCProgram) => cogcFits(ctx, p, tickers),
		});
	}
	const on = (
		targets: [string, number][],
		planetId: string | null,
		cogc: IChainInput["bases"][number]["cogc"] = "auto"
	) =>
		chainInput(targets, {
			// no experts: the planet's factors only
			bases: [{ id: "A", name: "", planetId, cogc, experts: {} }],
		});

	it("shows a gaseous planet and a planned program", async () => {
		// Tarvos: gaseous, runs Electronics
		const { wrapper, component } = await mountFor(
			on([["DW", 10]], "UV-351e", "FOOD_INDUSTRIES")
		);
		expect(wrapper.text()).toContain("production_chains.bases.gaseous");
		expect(wrapper.text()).toContain("production_chains.bases.planned");
		wrapper.findComponent(PInput).vm.$emit("update:value", null);
		expect(component.emitted("rename")).toEqual([[""]]);
		expect(
			wrapper
				.find("[aria-label='production_chains.bases.remove']")
				.exists()
		).toBe(false);
	});

	it("marks efficiency below the chain's on poor soil", async () => {
		// Danakil: fertility -0.4457, so farms run below 100 %
		const { wrapper } = await mountFor(on([["GRN", 40]], "OT-442b"));
		expect(wrapper.text()).toContain("production_chains.bases.fertility");
		expect(
			wrapper
				.find("[data-testid='chain-base-buildings-A'] .text-negative")
				.exists()
		).toBe(true);
	});

	it("waits for a planet the index hasn't loaded", async () => {
		const input = on([["DW", 10]], "XH-668c");
		const result = solveChain(input, testContext(false));
		const { wrapper } = await mountComponent(ChainBaseCard, {
			base: result.bases[0],
			choice: input.bases[0],
			efficiency: 1,
			removable: true,
			fits: () => false,
		});
		expect(wrapper.text()).toContain(
			"production_chains.bases.planet_loading"
		);
	});

	it("warns above 1,000 area and for extraction off the planet", async () => {
		const big = await mountFor(on([["GWS", 1]], "XH-668c"));
		expect(
			big.wrapper.find("[data-testid='chain-base-warnings-A']").text()
		).toContain("production_chains.bases.over_area");
		const water = await mountFor(on([["H2O", 50]], "XH-668c"));
		expect(
			water.wrapper.find("[data-testid='chain-base-warnings-A']").text()
		).toContain("production_chains.bases.not_on_planet");
	});

	it("sets luxuries and experts, Auto resets them (AC 3)", async () => {
		const input = chainInput([["DW", 100]], {
			bases: [{ id: "A", name: "", planetId: null, cogc: "auto" }],
		});
		const result = solveChain(input, ctx);
		const { wrapper, component } = await mountComponent(
			ChainBaseCard,
			{
				base: result.bases[0],
				choice: input.bases[0],
				efficiency: 1,
				removable: false,
				fits: () => false,
			},
			{ messages: { production_chains: messages, game: gameMessages } }
		);
		const lux = wrapper
			.findAllComponents(PSelect)
			.find((c) => c.props("value") === "both")!;
		const labels = (lux.props("options") as PSelectOption[]).map(
			(o) => o.label
		);
		expect(labels).toEqual([
			"Both · 100 %",
			"Lux 2 · 92 %",
			"Lux 1 · 87 %",
			"Essentials · 79 %",
		]);
		lux.vm.$emit("update:value", "none");
		expect(component.emitted("lux")).toEqual([["none"]]);
		expect(
			wrapper.find("[data-testid='chain-base-experts-A']").text()
		).toBe("Auto: 5 Food Industries + 1 Chemistry");

		await wrapper
			.find("[data-testid='chain-base-experts-edit-A']")
			.trigger("click");
		const steppers = wrapper.findAllComponents(PInputNumber);
		expect(steppers.length).toBeGreaterThan(0);
		// at most 5 per type and 6 per base
		expect(steppers[0].props("max")).toBe(5);
		steppers[0].vm.$emit("update:value", 9);
		const [[experts]] = component.emitted("experts") as [
			Record<string, number>,
		][];
		expect(experts.Food_Industries).toBe(5);
		steppers[0].vm.$emit("update:value", null);
		steppers[0].vm.$emit("update:value", 2);
		expect(
			(component.emitted("experts") as unknown[][])[1][0]
		).toMatchObject({
			Food_Industries: 0,
		});
		expect(
			(component.emitted("experts") as unknown[][])[2][0]
		).toMatchObject({
			Food_Industries: 2,
		});
		// auto is on: the reset is off
		const reset = new DOMWrapper(document.body).find(
			"[data-testid='chain-base-experts-auto-A']"
		);
		expect(reset.attributes("disabled")).toBeDefined();

		const edited = solveChain(
			{
				...input,
				bases: [{ ...input.bases[0], experts: { Food_Industries: 2 } }],
			},
			ctx
		);
		const manual = await mountComponent(
			ChainBaseCard,
			{
				base: edited.bases[0],
				choice: input.bases[0],
				efficiency: 1,
				removable: false,
				fits: () => false,
			},
			{ messages: { production_chains: messages, game: gameMessages } }
		);
		expect(
			manual.wrapper.find("[data-testid='chain-base-experts-A']").text()
		).toBe("2 Food Industries");
		await manual.wrapper
			.find("[data-testid='chain-base-experts-edit-A']")
			.trigger("click");
		await new DOMWrapper(document.body)
			.findAll("[data-testid='chain-base-experts-auto-A']")
			.at(-1)!
			.trigger("click");
		expect(manual.component.emitted("experts")).toEqual([[undefined]]);
	});
});
