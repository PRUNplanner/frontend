import { describe, it, expect, beforeAll } from "vitest";

import ChainBasesOverview from "@/features/production_chain/components/ChainBasesOverview.vue";
import { mountComponent } from "@/tests/mountComponent";
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import { chainShipping } from "@/features/production_chain/engine/chainBases";
import {
	seedGameData,
	splitInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

import type { IChainResult } from "@/features/production_chain/engine/chainSolver.types";

const ctx = testContext();

async function mountOverview(result: IChainResult) {
	const routes = chainShipping(result, ctx.materials, () => null);
	return mountComponent(ChainBasesOverview, { result, routes });
}

describe("ChainBasesOverview", () => {
	beforeAll(seedGameData);

	it("sums the bases and lists one row per base", async () => {
		const result = solveChain(splitInput(), ctx);
		const { wrapper } = await mountOverview(result);
		const text = (k: string) =>
			wrapper.find(`[data-testid='chain-bases-stat-${k}']`).text();
		expect(text("count")).toContain("2");
		expect(text("count")).toContain("overview.with_planet");
		const area = result.bases.reduce((s, b) => s + b.area, 0);
		expect(text("area")).toContain(
			Math.round(area).toLocaleString("en-US")
		);
		expect(text("area")).toContain("overview.largest");
		expect(text("shipping")).toContain("overview.routes");
		expect(wrapper.findAll("tbody tr")).toHaveLength(2);
		expect(
			wrapper.find("[data-testid='chain-bases-row-A']").text()
		).toContain("A");
	});

	it("flags bases over 1,000 area", async () => {
		const result = solveChain(splitInput(), ctx);
		const over = {
			...result,
			bases: result.bases.map((b, i) =>
				i ? b : { ...b, area: 1200, overArea: true }
			),
		};
		const { wrapper } = await mountOverview(over);
		expect(
			wrapper.find("[data-testid='chain-bases-stat-area']").text()
		).toContain("overview.over");
		expect(
			wrapper
				.find("[data-testid='chain-bases-row-A'] .text-negative")
				.text()
		).toContain("1,200");
	});

	it("shows a dash for a base without buildings or planet", async () => {
		const result = solveChain(splitInput(), ctx);
		const { wrapper } = await mountOverview({
			...result,
			buildingTypes: [],
			bases: result.bases.map((b) => ({ ...b, planet: null })),
		});
		const cells = wrapper
			.findAll("[data-testid='chain-bases-row-A'] td")
			.map((c) => c.text());
		expect(cells[1]).toBe("–");
		expect(cells[2]).toBe("–");
	});

	it("shows nothing without bases in use", async () => {
		const result = solveChain(splitInput(), ctx);
		const { wrapper } = await mountOverview({
			...result,
			bases: result.bases.map((b) => ({ ...b, materials: [] })),
		});
		expect(
			wrapper.find("[data-testid='chain-bases-overview']").exists()
		).toBe(false);
	});
});
