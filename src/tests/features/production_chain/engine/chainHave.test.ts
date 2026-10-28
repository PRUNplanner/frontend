import { describe, it, expect } from "vitest";

// Engine
import {
	effectiveHave,
	empireSurplus,
	haveSuppliers,
	OWN_SUPPLIER,
	typedOnly,
	unusedSurplus,
	withHave,
} from "@/features/production_chain/engine/chainHave";
import { solveChain } from "@/features/production_chain/engine/chainSolver";

// Fixtures
import {
	chainInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

// Types & Interfaces
import type { ICheckPlan } from "@/features/production_chain/engine/chainCheck.types";

/** a plan with only its material I/O, all the surplus reads */
function plan(name: string, deltas: Record<string, number>): ICheckPlan {
	return {
		uuid: `uuid-${name}`,
		name,
		result: {
			materialio: Object.entries(deltas).map(([ticker, delta]) => ({
				ticker,
				delta,
			})),
		},
	} as unknown as ICheckPlan;
}

describe("own production", () => {
	// the mockup's Main empire, unsorted
	const plans = [
		plan("Montem Smelter", { AL: 300, C: -30 }),
		plan("Vallis Shipyard", { AL: -20 }),
		plan("Deimos Metals", { AL: 200 }),
		plan("Katoa Carbon", { C: 140 }),
		plan("Harmonia Mines", { BTS: 600, RAT: -5 }),
	];

	it("sums the net surplus, a material made and used counting only the net (AC 7)", () => {
		const surplus = empireSurplus(plans);
		expect(Object.fromEntries(surplus)).toEqual({ AL: 480, C: 110, BTS: 600 });
		expect(surplus.has("RAT")).toBe(false);
	});

	it("attributes the use to plans in name order (AC 8)", () => {
		const ctx = testContext();
		const result = solveChain(
			chainInput([["RAT", 100]], { have: { GRN: 6, LST: 0.5 } }),
			ctx
		);
		const suppliers = haveSuppliers(
			result,
			[plan("Zeta", { GRN: 10 }), plan("Alpha", { GRN: 4 })],
			(t) => t === "GRN"
		);
		expect(
			suppliers.GRN.map((s) => [s.plan?.name, s.perDay, s.surplus])
		).toEqual([
			["Alpha", 4, 4],
			["Zeta", 2, 10],
		]);
		// a typed amount comes from "Your bases"
		expect(suppliers.LST).toEqual([
			{ key: OWN_SUPPLIER, plan: null, perDay: 0.5, surplus: null },
		]);
		expect(suppliers.H2O).toBeUndefined();
	});

	it("lists the surplus the chain doesn't use", () => {
		const result = solveChain(
			chainInput([["RAT", 100]], { have: { GRN: "all" } }),
			testContext()
		);
		const used = result.rows.GRN.have;
		expect(
			unusedSurplus(new Map([["GRN", used + 3], ["C", 7]]), result)
		).toEqual([
			{ ticker: "GRN", perDay: expect.closeTo(3, 6) },
			{ ticker: "C", perDay: 7 },
		]);
		expect(unusedSurplus(new Map([["GRN", used]]), result)).toEqual([]);
	});

	it("lets typed amounts win, and keeps them when the empire changes (AC 9, 11)", () => {
		const surplus = new Map([
			["AL", 480],
			["C", 110],
		]);
		// from a link: amounts only
		const linked = { AL: { value: 300, origin: "link" as const } };
		expect(effectiveHave(new Map(), linked)).toEqual({ AL: 300 });

		let o = withHave(linked, "BTS", 600, surplus);
		o = withHave(o, "C", "off", surplus);
		// "off" only hides a surplus
		o = withHave(o, "FE", "off", surplus);
		expect(o).not.toHaveProperty("FE");
		expect(effectiveHave(surplus, o)).toEqual({ AL: 300, BTS: 600 });

		// picking an empire: the link's AL and the "off" go, typed BTS stays
		const picked = typedOnly(o);
		expect(picked).toEqual({ BTS: { value: 600, origin: "typed" } });
		expect(effectiveHave(surplus, picked)).toEqual({ AL: 480, C: 110, BTS: 600 });

		// back to the empire's amount
		expect(withHave(picked, "BTS", undefined, surplus)).toEqual({});
	});
});
