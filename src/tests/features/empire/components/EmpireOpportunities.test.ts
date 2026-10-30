import { describe, it, expect, beforeEach, vi } from "vitest";
import { h } from "vue";

import EmpireOpportunities from "@/features/empire/components/EmpireOpportunities.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { Recipe } from "@/features/api/schemas/gameData.schemas";
import type { IEmpireMaterialIO } from "@/features/empire/empire.types";
import type { IOpportunityStats } from "@/features/empire/useProductionOpportunities.types";

type Opportunity = ReturnType<
	typeof import("@/features/empire/useProductionOpportunities").useProductionOpportunities
>["opportunities"]["value"][number];

const opportunities = vi.hoisted(() => ({
	isLoading: undefined as unknown as { value: boolean },
	rows: undefined as unknown as { value: unknown[] },
	stats: undefined as unknown as { value: unknown },
	args: [] as unknown[],
}));

vi.mock("@/features/empire/useProductionOpportunities", async () => {
	const { ref: vueRef } = await import("vue");
	return {
		useProductionOpportunities: (...args: unknown[]) => {
			opportunities.args = args;
			opportunities.isLoading = vueRef(false);
			opportunities.rows = vueRef([]);
			opportunities.stats = vueRef({
				fullMatch: 0,
				deltaRequired: 0,
				missingMaterial: 0,
				total: 0,
			});
			return {
				isLoading: opportunities.isLoading,
				opportunities: opportunities.rows,
				opportunityStats: opportunities.stats,
			};
		},
	};
});
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: ["ticker", "amount"],
		setup(props: { ticker: string; amount: number }) {
			return () =>
				h("span", { class: "tile" }, `${props.ticker}:${props.amount}`);
		},
	},
}));

function recipe(
	name: string,
	building: string,
	outputs: [string, number][]
): Recipe {
	return {
		recipe_id: `id-${name}`,
		recipe_name: name,
		building_ticker: building,
		inputs: [],
		outputs: outputs.map(([material_ticker, material_amount]) => ({
			material_ticker,
			material_amount,
		})),
	} as unknown as Recipe;
}

function stat(
	ticker: string,
	requiredAmount: number,
	currentDelta: number
): Opportunity["inputStats"][number] {
	return {
		ticker,
		requiredAmount,
		currentDelta,
		potentialRuns: currentDelta > 0 ? currentDelta / requiredAmount : 0,
		isMissing: currentDelta <= 0,
	};
}

const FULL: Opportunity = {
	recipe: recipe("FULL", "PP1", [["RAT", 2]]),
	inputStats: [stat("PE", 2, 10), stat("PG", 1, 1)],
	inputMatchRatio: 1,
	sustainedRuns: 2.5,
	isFullMatch: true,
	inputSellCost: 100,
	outputSellCost: 400,
};
const DELTA: Opportunity = {
	recipe: recipe("DELTA", "FRM", [["H2O", 1]]),
	inputStats: [stat("H", 4, 2), stat("N", 1, 0)],
	inputMatchRatio: 0.5,
	sustainedRuns: 0.5,
	isFullMatch: false,
	inputSellCost: 5,
	outputSellCost: 1,
};
const MISSING: Opportunity = {
	recipe: recipe("MISSING", "SME", [["FE", 1]]),
	inputStats: [stat("O", 1, -3)],
	inputMatchRatio: 0.2,
	sustainedRuns: 0,
	isFullMatch: false,
	inputSellCost: 0,
	outputSellCost: 0,
};
const PAYING: Opportunity = {
	...FULL,
	recipe: recipe("PAYING", "PP2", [["BSE", 1]]),
	inputSellCost: 900,
	outputSellCost: 300,
};

const io: IEmpireMaterialIO[] = [
	{ ticker: "PE", delta: 10 } as IEmpireMaterialIO,
];

async function mountOpportunities(
	rows: Opportunity[],
	stats: Partial<IOpportunityStats> = {},
	props: Record<string, unknown> = {}
) {
	const mounted = await mountComponent(EmpireOpportunities, {
		empireMaterialIO: io,
		...props,
	});
	opportunities.rows.value = rows;
	opportunities.stats.value = {
		fullMatch: 0,
		deltaRequired: 0,
		missingMaterial: 0,
		total: rows.length,
		...stats,
	};
	await mounted.setProps({});
	return mounted;
}

const tileLabels = (el: { findAll: (s: string) => { text: () => string }[] }) =>
	el.findAll(".tile").map((t) => t.text());

describe("EmpireOpportunities", () => {
	beforeEach(() => {
		opportunities.args = [];
	});

	it("hands the empire flows and the exchange to the opportunity finder", async () => {
		const { setProps } = await mountOpportunities(
			[],
			{},
			{ cxUuid: "cx-1" }
		);

		const [flows, cx] = opportunities.args as { value: unknown }[];
		expect(flows.value).toBe(io);
		expect(cx.value).toBe("cx-1");

		await setProps({ cxUuid: undefined });
		expect(cx.value).toBeUndefined();
	});

	it("shows the share of each opportunity class in its tile and bar", async () => {
		const { wrapper } = await mountOpportunities([FULL, DELTA, MISSING], {
			fullMatch: 1,
			deltaRequired: 1,
			missingMaterial: 2,
			total: 4,
		});

		const tiles = wrapper.findAll(".grid > div");
		expect(tiles).toHaveLength(3);
		expect(tiles.map((t) => t.find(".font-mono .text-2xl").text())).toEqual(
			["1", "1", "2"]
		);
		expect(
			tiles.map((t) => t.find(".font-mono span:last-child").text())
		).toEqual(["25.00 %", "25.00 %", "50.00 %"]);
		expect(tiles.map((t) => t.find(".h-full").attributes("style"))).toEqual(
			["width: 25%;", "width: 25%;", "width: 50%;"]
		);
	});

	it("shows a dash instead of a share when there is nothing to compare", async () => {
		const { wrapper } = await mountOpportunities([]);

		expect(
			wrapper
				.findAll(".grid > div")
				.map((t) => t.find(".font-mono span:last-child").text())
		).toEqual(["— %", "— %", "— %"]);
	});

	it("lists the building, inputs and outputs of every recipe", async () => {
		const { wrapper } = await mountOpportunities([FULL, DELTA, MISSING]);
		const rows = wrapper.findAll("tbody tr[data-row-key]");

		expect(rows.map((r) => r.attributes("data-row-key"))).toEqual([
			"FULL",
			"DELTA",
			"MISSING",
		]);
		expect(rows.map((r) => r.find("td .font-bold").text())).toEqual([
			"PP1",
			"FRM",
			"SME",
		]);
		expect(tileLabels(rows[0])).toEqual(["PE:2", "PG:1", "RAT:2"]);
		expect(tileLabels(rows[1])).toEqual(["H:4", "N:1", "H2O:1"]);
	});

	it("marks inputs: delta covers, delta short, missing", async () => {
		const { wrapper } = await mountOpportunities([FULL, DELTA, MISSING]);
		const inputs = (row: number) =>
			wrapper
				.findAll("tbody tr[data-row-key]")
				.at(row)!
				.findAll("td[data-col-key=flow_inputs] .flex-col");

		// 10 of 2 needed: muted, 1 of 1 needed: muted
		const [pe, pg] = inputs(0);
		expect(pe.find(".font-mono").text()).toBe("10x");
		expect(pe.find(".font-mono").classes()).toContain("text-muted");
		expect(pg.find(".font-mono").text()).toBe("1x");
		expect(pg.find(".font-mono").classes()).toContain("text-muted");

		// 2 of 4 needed: warning, nothing at all: missing and faded
		const [h, n] = inputs(1);
		expect(h.find(".font-mono").text()).toBe("2x");
		expect(h.find(".font-mono").classes()).toContain("text-warning");
		expect(h.find(".opacity-30").exists()).toBe(false);
		expect(n.find(".font-mono").text()).toBe(
			"empire.opportunities.table.missing"
		);
		expect(n.find(".font-mono").classes()).toContain("uppercase");
		expect(n.find(".font-mono").classes()).toContain("text-negative");
		expect(n.find(".opacity-30").exists()).toBe(true);
	});

	it("labels each row by how far the delta gets it", async () => {
		const { wrapper } = await mountOpportunities([FULL, DELTA, MISSING]);
		const analysis = wrapper
			.findAll("tbody tr[data-row-key]")
			.map((r) => r.find("td[data-col-key=Analysis]"));

		expect(analysis[0].find(".text-lg").text()).toBe("2.50");
		expect(analysis[0].find(".text-xs").text()).toBe(
			"empire.opportunities.table.potential_batches"
		);
		expect(analysis[0].find(".text-xs").classes()).toContain(
			"text-prunplanner"
		);

		expect(analysis[1].find(".text-lg").text()).toBe("0.50");
		expect(analysis[1].find(".text-xs").text()).toBe(
			"empire.opportunities.table.delta_required"
		);
		expect(analysis[1].find(".text-xs").classes()).toContain(
			"text-warning"
		);

		// no batch at all: no number
		expect(analysis[2].find(".text-lg").exists()).toBe(false);
		expect(analysis[2].find(".text-xs").text()).toBe(
			"empire.opportunities.table.missing_material"
		);
		expect(analysis[2].find(".text-xs").classes()).toContain(
			"text-negative"
		);
	});

	it("prices full matches and colours the better side, dashes the rest", async () => {
		const { wrapper } = await mountOpportunities([FULL, PAYING, DELTA]);
		const cell = (row: number, key: string) =>
			wrapper
				.findAll("tbody tr[data-row-key]")
				.at(row)!
				.find(`td[data-col-key=${key}]`);

		// selling the output (400) beats selling the inputs (100)
		expect(cell(0, "inputSellCost").text()).toContain("100.00");
		expect(cell(0, "inputSellCost").find("span").classes()).toContain(
			"text-negative"
		);
		expect(cell(0, "outputSellCost").text()).toContain("400.00");
		expect(cell(0, "outputSellCost").find("span").classes()).toContain(
			"text-positive"
		);

		// selling the inputs (900) beats selling the output (300)
		expect(cell(1, "inputSellCost").find("span").classes()).toContain(
			"text-positive"
		);
		expect(cell(1, "outputSellCost").find("span").classes()).toContain(
			"text-negative"
		);

		// no full match: no prices
		expect(cell(2, "inputSellCost").text()).toBe("—");
		expect(cell(2, "outputSellCost").text()).toBe("—");
	});

	it("also dashes a full match that has no throughput", async () => {
		const idle: Opportunity = { ...FULL, sustainedRuns: 0 };
		const { wrapper } = await mountOpportunities([idle]);
		const row = wrapper.find("tbody tr[data-row-key]");

		expect(row.find("td[data-col-key=inputSellCost]").text()).toBe("—");
		expect(row.find("td[data-col-key=outputSellCost]").text()).toBe("—");
		expect(row.find("td[data-col-key=Analysis] .text-lg").exists()).toBe(
			false
		);
	});

	it("renders no table while the recipes load", async () => {
		const { wrapper, setProps } = await mountOpportunities([FULL]);
		expect(wrapper.find("table").exists()).toBe(true);

		opportunities.isLoading.value = true;
		await setProps({});

		expect(wrapper.find("table").exists()).toBe(false);
		expect(wrapper.text()).toContain("empire.opportunities.headline");
	});
});
