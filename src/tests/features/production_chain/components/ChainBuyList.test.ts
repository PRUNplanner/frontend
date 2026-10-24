import { describe, it, expect, beforeAll, vi } from "vitest";

import ChainBuyList from "@/features/production_chain/components/ChainBuyList.vue";
import { mountComponent } from "@/tests/mountComponent";
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import {
	chainInput,
	seedGameData,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";
import { buyList } from "@/features/production_chain/productionChain.util";

const { copy } = vi.hoisted(() => ({ copy: vi.fn() }));
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
		expect(wrapper.findAll("[data-testid='chain-buy-list'] tbody tr").length).toBe(
			list.items.length + 1
		);

		await wrapper.find("button").trigger("click");
		const json = JSON.parse(copy.mock.calls[0][0]);
		expect(json.actions[0]).toMatchObject({ type: "CX Buy", exchange: "AI1" });
		expect(json.actions[1]).toMatchObject({
			type: "MTRA",
			origin: "Antares Station Warehouse",
		});
		expect(json.groups[0].materials).toEqual(
			Object.fromEntries(list.items.map((i) => [i.ticker, i.units]))
		);
		expect(component.emitted("xit")).toHaveLength(1);
	});

	it("says when nothing is bought", async () => {
		const result = solveChain(chainInput([["H2O", 10]]), ctx);
		const { wrapper } = await mountComponent(ChainBuyList, { result });
		expect(wrapper.text()).toContain("production_chains.buy_list.nothing");
		expect(wrapper.find("button").exists()).toBe(false);
	});
});
