import { describe, it, expect, beforeAll, vi } from "vitest";

import ChainBuyList from "@/features/production_chain/components/ChainBuyList.vue";
import { mountComponent } from "@/tests/mountComponent";
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import {
	FARM_PLANET,
	chainInput,
	seedGameData,
	splitInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";
import { buyList } from "@/features/production_chain/productionChain.util";

const { copy } = vi.hoisted(() => ({ copy: vi.fn(async (_value: string) => true) }));
vi.mock("@/util/data", async (original) => ({
	...(await original<typeof import("@/util/data")>()),
	copyToClipboard: copy,
}));

describe("ChainBuyList", () => {
	beforeAll(seedGameData);
	const ctx = testContext();

	it("copies an XIT buy action on the CX of the bought rows (AC 13)", async () => {
		const result = solveChain(
			chainInput([
				["DW", 100],
				["RAT", 100],
			]),
			ctx
		);
		// priced on AI1, as with a CX preference
		for (const t of result.order) result.rows[t].exchange = "AI1";

		const { wrapper, component } = await mountComponent(ChainBuyList, {
			result,
		});
		const list = buyList(result, ctx.materials, 10);
		expect(
			wrapper.findAll("[data-testid='chain-buy-list'] tbody tr").length
		).toBe(list.groups[0].items.length + 2);

		await wrapper.find("button").trigger("click");
		const json = JSON.parse(copy.mock.calls[0][0]);
		expect(json.actions[0]).toMatchObject({
			type: "CX Buy",
			exchange: "AI1",
		});
		expect(json.actions[1]).toMatchObject({
			type: "MTRA",
			origin: "Antares Station Warehouse",
		});
		expect(json.groups[0].materials).toEqual(
			Object.fromEntries(
				list.groups[0].items.map((i) => [i.ticker, i.units])
			)
		);
		expect(component.emitted("xit")).toHaveLength(1);
	});

	it("says when nothing is bought", async () => {
		const result = solveChain(chainInput([["H2O", 10]]), ctx);
		const { wrapper } = await mountComponent(ChainBuyList, { result });
		expect(wrapper.text()).toContain("production_chains.buy_list.nothing");
		expect(wrapper.find("button").exists()).toBe(false);
	});

	it("buys for a chosen number of days", async () => {
		const result = solveChain(chainInput([["DW", 100]]), ctx);
		const { wrapper } = await mountComponent(ChainBuyList, { result });
		const days = wrapper.find("input[aria-label='production_chains.buy_list.days_label']");
		const units = () => wrapper.find("[data-testid='chain-buy-list'] tbody td:nth-child(2)").text();
		const ten = units();
		await days.setValue("");
		expect(units()).toBe(ten);
		await days.setValue("20");
		expect(units()).not.toBe(ten);
	});
});

describe("ChainBuyList per base", () => {
	beforeAll(seedGameData);
	const ctx = testContext();

	it("groups bought inputs by base, one XIT action each (AC 15)", async () => {
		const result = solveChain(splitInput([FARM_PLANET, null]), ctx);
		for (const t of result.order) result.rows[t].exchange = "AI1";
		const list = buyList(result, ctx.materials, 10);
		expect(list.groups.map((g) => g.base)).toEqual(["A", "B"]);
		// H2O feeds both bases: each base gets its share
		const h2o = list.groups.map(
			(g) => g.items.find((i) => i.ticker === "H2O")?.units ?? 0
		);
		expect(h2o.every((u) => u > 0)).toBe(true);
		expect(h2o[0] + h2o[1]).toBeGreaterThanOrEqual(
			Math.ceil(result.rows.H2O.perDay * 10 - 1e-9)
		);
		expect(list.cost).toBeCloseTo(
			list.groups[0].cost + list.groups[1].cost,
			6
		);

		copy.mockClear();
		const { wrapper } = await mountComponent(ChainBuyList, { result });
		expect(
			wrapper.find("[data-testid='chain-buy-group-A']").text()
		).toContain("Saladin Base");
		const buttons = wrapper.findAll("button");
		await buttons[0].trigger("click");
		await buttons[1].trigger("click");
		const [a, b] = copy.mock.calls.map((c) => JSON.parse(c[0]));
		expect(a.actions[1]).toMatchObject({
			origin: "Antares Station Warehouse",
			dest: "Saladin Base",
		});
		expect(a.groups[0].materials).toEqual(
			Object.fromEntries(
				list.groups[0].items.map((i) => [i.ticker, i.units])
			)
		);
		// no planet yet
		expect(b.actions[1].dest).toBe("Configure on Execution");
	});
});
