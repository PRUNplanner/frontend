import { describe, it, expect, beforeAll } from "vitest";

import ChainStepDetail from "@/features/production_chain/components/ChainStepDetail.vue";
import { mountComponent } from "@/tests/mountComponent";
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import {
	chainInput,
	FOOD_PLANET,
	seedGameData,
	testContext,
	withFees,
} from "@/tests/features/production_chain/chain.fixtures";
import messages from "@/locales/en_US/production_chains.json";

const ctx = testContext();

async function mountDetail(
	ticker: string,
	targets: [string, number][],
	c = ctx,
	planetId: string | null = null
) {
	const result = solveChain(
		chainInput(targets, {
			recipeId: { RAT: "FP#1xGRN 1xALG 1xNUT=>10xRAT" },
			bases: [{ id: "A", name: "", planetId, cogc: "auto", experts: {} }],
		}),
		c
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
	const section = wrapper.findAll("h3").find((h) => h.text() === heading)!
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
		for (const s of shares(wrapper, "Takes")) expect(s).toBeGreaterThan(0);
	});

	it("shows the production fees per unit, 0 without fees (AC 14)", async () => {
		const fees = async (c: typeof ctx) => {
			const { wrapper, result } = await mountDetail(
				"DW",
				[["DW", 100]],
				c,
				FOOD_PLANET
			);
			const dd = wrapper.find("[data-testid='chain-detail-fees']");
			expect(dd.element.previousElementSibling!.textContent).toContain(
				"Production fees"
			);
			return { text: dd.text(), part: result.rows.DW.costParts!.fees };
		};
		const none = await fees(ctx);
		expect(none.part).toBe(0);
		expect(none.text).toBe("0 ȼ");
		const charged = await fees(withFees(ctx, [FOOD_PLANET]));
		expect(charged.part).toBeGreaterThan(0);
		expect(charged.text).not.toBe(none.text);
	});
});
