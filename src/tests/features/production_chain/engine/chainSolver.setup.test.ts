import { describe, it, expect } from "vitest";

// Engine
import {
	bestExpertSplit,
	solveChain,
	workerUpkeep,
} from "@/features/production_chain/engine/chainSolver";
import { planDrafts } from "@/features/production_chain/engine/chainBases";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { calculateExpertBonus } from "@/features/planning/engine/efficiency";
import {
	decodeChain,
	encodeChain,
} from "@/features/production_chain/engine/chainUrl";

// Fixtures
import {
	chainInput,
	FARM_PLANET,
	FOOD_PLANET,
	planContextFor,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

// Types & Interfaces
import type {
	ChainLux,
	IChainBase,
} from "@/features/production_chain/engine/chainSolver.types";
import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";

const ctx = testContext();
const ESSENTIALS = 0.02 * (1 + 10 / 3) * (1 + 4) * (1 + 5 / 6);
const TIERS: [WorkforceType, "pioneers" | "settlers" | "technicians" | "engineers" | "scientists"][] = [
	["pioneer", "pioneers"],
	["settler", "settlers"],
	["technician", "technicians"],
	["engineer", "engineers"],
	["scientist", "scientists"],
];

const base = (extra: Partial<IChainBase> = {}): IChainBase => ({
	id: "A",
	name: "",
	planetId: null,
	cogc: "auto",
	...extra,
});

/** DW from bought inputs: only FP builds */
const dw = (extra: Partial<IChainBase> = {}) =>
	solveChain(
		chainInput([["DW", 100]], {
			bases: [base(extra)],
			source: { PG: "buy" },
		}),
		ctx
	);

describe("setup per base", () => {
	it("runs FP at 128.4 % with both luxuries and auto experts, 79.4 % × 1.284 with essentials (AC 1)", () => {
		const both = dw();
		expect(both.rows.DW.buildingTicker).toBe("FP");
		expect(both.bases[0].lux).toBe("both");
		expect(both.bases[0].expertsAuto).toBe(true);
		expect(both.bases[0].experts.Food_Industries).toBe(5);
		expect(both.rows.DW.efficiency).toBeCloseTo(1.284, 9);
		expect(both.rows.DW.buildings).toBeCloseTo(
			both.rows.DW.load / 1.284,
			9
		);

		const none = dw({ lux: "none" });
		expect(none.rows.DW.efficiency).toBeCloseTo(ESSENTIALS * 1.284, 9);
		expect(ESSENTIALS).toBeCloseTo(0.794, 3);
	});

	it("charges the luxuries in the upkeep (AC 1)", () => {
		const fp = ctx.buildings.get("FP")!;
		const perBuilding = (lux: ChainLux) => {
			const r = dw({ lux });
			return r.bases[0].upkeep / r.bases[0].buildingTypes[0].built;
		};
		const luxCost = TIERS.reduce(
			(s, [tier, field]) =>
				s +
				fp[field] *
					(workerUpkeep(ctx, tier, true, true) -
						workerUpkeep(ctx, tier, false, false)),
			0
		);
		expect(luxCost).toBeGreaterThan(0);
		expect(perBuilding("both") - perBuilding("none")).toBeCloseTo(
			luxCost,
			6
		);
		// a lux 1 base pays less than both, more than none
		expect(perBuilding("lux1")).toBeLessThan(perBuilding("both"));
		expect(perBuilding("lux1")).toBeGreaterThan(perBuilding("none"));
		expect(dw({ lux: "none" }).totals.upkeep).toBeLessThan(
			dw().totals.upkeep
		);
	});

	it("splits experts 5 + 1 by weight, within 5 per type and 6 per base (AC 2)", () => {
		expect(bestExpertSplit({ Agriculture: 10 }).Agriculture).toBe(5);
		const two = bestExpertSplit({ Manufacturing: 10, Chemistry: 4 });
		expect(two.Manufacturing).toBe(5);
		expect(two.Chemistry).toBe(1);
		const many = bestExpertSplit({
			Manufacturing: 10,
			Chemistry: 9,
			Metallurgy: 8,
			Electronics: 7,
		});
		const amounts = Object.values(many);
		expect(Math.max(...amounts)).toBeLessThanOrEqual(5);
		expect(amounts.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(6);
		expect(many.Electronics).toBe(0);
		expect(Object.values(bestExpertSplit({})).every((n) => n === 0)).toBe(
			true
		);
	});

	it("gives a farm-only base 5 Agriculture", () => {
		const r = solveChain(
			chainInput([["GRN", 100]], {
				bases: [base({ planetId: FARM_PLANET })],
			}),
			ctx
		);
		expect(r.rows.GRN.buildingTicker).toBe("FRM");
		expect(r.bases[0].experts.Agriculture).toBe(5);
		expect(
			Object.values(r.bases[0].experts).reduce((a, b) => a + b, 0)
		).toBe(5);
	});

	it("uses the user's experts and luxuries, and auto again without them (AC 3)", () => {
		const edited = dw({ experts: { Food_Industries: 2 }, lux: "lux2" });
		expect(edited.bases[0].expertsAuto).toBe(false);
		expect(edited.bases[0].experts.Food_Industries).toBe(2);
		expect(edited.rows.DW.efficiency).toBeCloseTo(
			ESSENTIALS * (1 + 2 / 13) * (1 + calculateExpertBonus(2)),
			9
		);
		expect(edited.bases[0].built).toBeGreaterThan(dw().bases[0].built);
		expect(dw().bases[0].experts.Food_Industries).toBe(5);
	});

	it("keeps luxuries and experts in the URL; an old chain opens with the defaults (AC 3)", () => {
		const input = chainInput([["DW", 100]], {
			bases: [
				base({ lux: "lux1", experts: { Food_Industries: 3, Chemistry: 1 } }),
				base({ id: "B", experts: {} }),
				base({ id: "C" }),
			],
		});
		const back = decodeChain(encodeChain({ input, cx: undefined }))!;
		expect(back.input.bases[0].lux).toBe("lux1");
		expect(back.input.bases[0].experts).toEqual({
			Food_Industries: 3,
			Chemistry: 1,
		});
		expect(back.input.bases[1].experts).toEqual({});
		expect(back.input.bases[2].experts).toBeUndefined();
		expect(back.input.bases[2].lux).toBeUndefined();

		const old = decodeChain({ t: "DW:100", bases: "A:Old:XH-668c:auto" })!;
		expect(old.input.bases[0].lux).toBeUndefined();
		expect(old.input.bases[0].experts).toBeUndefined();
		const solved = solveChain(old.input, ctx);
		expect(solved.bases[0].lux).toBe("both");
		expect(solved.bases[0].expertsAuto).toBe(true);
		// broken expert values are dropped, amounts capped at 5
		const broken = decodeChain({
			t: "DW:100",
			bases: "A::::lux9:Nope-2.Chemistry-x.Agriculture-9",
		})!;
		expect(broken.input.bases[0].lux).toBeUndefined();
		expect(broken.input.bases[0].experts).toEqual({ Agriculture: 5 });
		// a bare base id
		expect(decodeChain({ t: "DW:100", bases: "A" })!.input.bases[0]).toEqual({
			id: "A",
			name: "",
			planetId: null,
			cogc: "auto",
		});
		// 6 per base
		const many = decodeChain({
			t: "DW:100",
			bases: "A::::both:Agriculture-5.Chemistry-4",
		})!;
		expect(many.input.bases[0].experts).toEqual({ Agriculture: 5, Chemistry: 1 });
	});

	it("creates plans with the base's luxuries and experts that run at the chain's efficiency (AC 4)", () => {
		const input = chainInput([["DW", 100]], {
			bases: [base({ planetId: FOOD_PLANET, lux: "lux1" })],
		});
		const result = solveChain(input, ctx);
		const [draft] = planDrafts(result, { A: "Water" });
		const b = result.bases[0];
		expect(draft.data.plan_data.workforce.every((w) => w.lux1)).toBe(true);
		expect(draft.data.plan_data.workforce.some((w) => w.lux2)).toBe(false);
		expect(
			draft.data.plan_data.experts.find((e) => e.type === "Food_Industries")
				?.amount
		).toBe(5);

		const plan = calculatePlan(
			{
				plan: {
					plan_data: draft.data.plan_data,
					plan_cogc: draft.data.plan_cogc,
					plan_corphq: false,
					plan_permits_used: draft.data.plan_permits_used,
				},
				empire: undefined,
				cxUuid: undefined,
				recipeOptions: false,
			},
			planContextFor(FOOD_PLANET)
		).result;
		for (const type of b.buildingTypes) {
			const planned = plan.production.buildings.find(
				(x) => x.name === type.ticker
			)!;
			expect(planned.totalEfficiency).toBeCloseTo(type.efficiency, 6);
		}
		const made = plan.production.materialio.find((m) => m.ticker === "DW")!;
		expect(made.output).toBeGreaterThanOrEqual(100 - 1e-6);
		expect(made.output).toBeLessThan(
			100 * (Math.ceil(b.buildingTypes[0].exact) / b.buildingTypes[0].exact) + 1e-6
		);
	});
});
