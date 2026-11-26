import { describe, expect, it, vi } from "vitest";

import { calculatePlan } from "../src/engine/calculatePlan";

// test data
import { fixtureContext, goldenPlans } from "./fixtures/context";

// Etherwind with an unknown recipe id on its first building
function unknownRecipe() {
	const { etherwind } = goldenPlans();
	const building = etherwind.plan.plan_data.buildings.find(
		(b) => b.active_recipes.length
	)!;
	building.active_recipes[0].recipeid = "UNKNOWN#1xH2O=>1xO";
	return { input: etherwind, building: building.name };
}

describe("IPlanContext.warn", () => {
	it("reports an unknown recipe id once, with building and recipe", () => {
		const { input, building } = unknownRecipe();
		const warn = vi.fn();

		calculatePlan(input, fixtureContext(warn));

		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(
			`Unable to find recipe info for ${building} with recipe id UNKNOWN#1xH2O=>1xO`
		);
	});

	it("stays silent without warn and gives the same result", () => {
		const { input } = unknownRecipe();
		const log = vi.spyOn(console, "warn").mockImplementation(() => {});

		const silent = calculatePlan(input, fixtureContext());
		const warned = calculatePlan(
			input,
			fixtureContext(() => {})
		);

		expect(log).not.toHaveBeenCalled();
		expect(silent).toStrictEqual(warned);
	});
});
