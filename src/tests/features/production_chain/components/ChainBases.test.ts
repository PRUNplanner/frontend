import { describe, it, expect, beforeAll } from "vitest";
import { RouterLinkStub } from "@vue/test-utils";

import ChainBases from "@/features/production_chain/components/ChainBases.vue";
import ChainBaseCard from "@/features/production_chain/components/ChainBaseCard.vue";
import { mountComponent } from "@/tests/mountComponent";
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import {
	chainInput,
	seedGameData,
	splitInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

const ctx = testContext();

async function mountBases(created: unknown = null) {
	const input = splitInput();
	const result = solveChain(input, ctx);
	return mountComponent(ChainBases, {
		result,
		bases: input.bases,
		efficiency: 100,
		ctx,
		created,
		ready: true,
	});
}

describe("ChainBases", () => {
	beforeAll(seedGameData);

	it("forwards the toolbar and card actions", async () => {
		const { wrapper, component } = await mountBases();
		await wrapper.find("[data-testid='chain-split']").trigger("click");
		await wrapper.find("[data-testid='chain-add-base']").trigger("click");
		await wrapper
			.find("[data-testid='chain-bases-create']")
			.trigger("click");
		const cards = wrapper.findAllComponents(ChainBaseCard);
		expect(cards.length).toBe(2);
		cards[1].vm.$emit("rename", "Kitchen");
		cards[1].vm.$emit("cogc", "none");
		cards[0].vm.$emit("planet");
		cards[0].vm.$emit("remove");
		expect(component.emitted("split")).toHaveLength(1);
		expect(component.emitted("add")).toHaveLength(1);
		expect(component.emitted("create")).toHaveLength(1);
		expect(component.emitted("rename")).toEqual([["B", "Kitchen"]]);
		expect(component.emitted("cogc")).toEqual([["B", "none"]]);
		expect(component.emitted("planet")).toEqual([["A"]]);
		expect(component.emitted("remove")).toEqual([["A"]]);
	});

	it("lists shipping per route with jumps (AC 8)", async () => {
		const { wrapper } = await mountBases();
		const rows = wrapper.findAll("[data-testid='chain-shipping'] tbody tr");
		expect(rows.length).toBeGreaterThan(2);
		// between bases first; both planets are known
		expect(rows[0].attributes("data-testid")).toMatch(
			/^chain-route-[A-H]-[A-H]$/
		);
		expect(rows[0].text()).toContain("production_chains.shipping.n_jumps");
		// Universe prices: the CX has no system
		expect(
			wrapper.find("[data-testid='chain-route-CX-A']").text()
		).toContain("–");
	});

	it("links the created plans and the empire (AC 12)", async () => {
		const { wrapper } = await mountBases({
			plans: [
				{ base: "A", uuid: "p1", name: "Farm", planetId: "PG-899b" },
			],
			empire: { uuid: "e1", name: "Chain" },
			failed: null,
		});
		// the only links on it
		const links = wrapper.findAllComponents(RouterLinkStub);
		expect(links.map((l) => l.props("to"))).toEqual([
			{
				name: "plan",
				params: { planetNaturalId: "PG-899b", planUuid: "p1" },
			},
			{ name: "empire", params: { empireUuid: "e1" } },
		]);
	});
});

describe("ChainBases without steps", () => {
	beforeAll(seedGameData);

	it("can't create plans when no base has steps", async () => {
		const input = chainInput([]);
		const { wrapper } = await mountComponent(ChainBases, {
			result: solveChain(input, ctx),
			bases: input.bases,
			efficiency: 100,
			ctx,
			created: null,
			ready: true,
		});
		expect(
			wrapper
				.find("[data-testid='chain-bases-create']")
				.attributes("disabled")
		).toBeDefined();
	});
});
