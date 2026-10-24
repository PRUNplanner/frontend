import { describe, it, expect, beforeAll } from "vitest";

import ChainStepDetail from "@/features/production_chain/components/ChainStepDetail.vue";
import { mountComponent } from "@/tests/mountComponent";
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import {
	chainInput,
	seedGameData,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";
import messages from "@/locales/en_US/production_chains.json";

const ctx = testContext();

async function mountDetail(ticker: string, targets: [string, number][]) {
	const result = solveChain(
		chainInput(targets, {
			recipeId: { RAT: "FP#1xGRN 1xALG 1xNUT=>10xRAT" },
		}),
		ctx
	);
	const { wrapper } = await mountComponent(
		ChainStepDetail,
		{ row: result.rows[ticker], result },
		{ messages: { production_chains: messages } }
	);
	return { wrapper, result };
}

/** the "n %" of every list item under a heading */
const shares = (
	wrapper: Awaited<ReturnType<typeof mountDetail>>["wrapper"],
	heading: string
) => {
	const section = wrapper
		.findAll("h3")
		.find((h) => h.text() === heading)!
		.element.parentElement!;
	return [...section.querySelectorAll("li")].map((li) =>
		Number(/([\d.]+) %/.exec(li.textContent!)![1])
	);
};

describe("ChainStepDetail", () => {
	beforeAll(seedGameData);

	it("splits a material's demand over where it goes, 100 % in all (AC 12)", async () => {
		const { wrapper, result } = await mountDetail("H2O", [
			["DW", 100],
			["RAT", 100],
		]);
		const goes = shares(wrapper, "Goes to");
		expect(goes.length).toBe(result.rows.H2O.users.length);
		expect(goes.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 0);
	});

	it("counts a target's sales in its shares, and shows spare capacity (AC 12)", async () => {
		const { wrapper } = await mountDetail("RAT", [
			["DW", 100],
			["RAT", 100],
		]);
		expect(shares(wrapper, "Goes to")).toEqual([100]);
		// RAT 2.50 + DW 2.00 FP of 5 built: 0.50 spare
		const spare = wrapper.find("[data-testid='chain-spare']");
		expect(spare.text()).toBe("up to +20.0 RAT / day");
		for (const s of shares(wrapper, "Takes"))
			expect(s).toBeGreaterThan(0);
	});
});
