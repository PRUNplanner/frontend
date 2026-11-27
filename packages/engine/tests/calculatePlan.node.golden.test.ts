import { describe, expect, it } from "vitest";

import { calculatePlan } from "../src/engine/calculatePlan";

// test data
import { fixtureContext, goldenPlans } from "./fixtures/context";
import { golden } from "@prunplanner/test-data/golden";

/**
 * Golden: full plan results calculated in plain Node from fixture JSON.
 * The app's engineContext.test.ts calculates the same plans through
 * usePlanContext and must match this snapshot, so the Node context is
 * proven to be the app's.
 */
describe("calculatePlan in Node (golden)", () => {
	it.each(Object.entries(goldenPlans()))("%s", async (name, input) => {
		await expect(
			golden(calculatePlan(input, fixtureContext()))
		).toMatchFileSnapshot(
			`./__snapshots__/calculatePlan.${name}.golden.json`
		);
	});
});
