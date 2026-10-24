import { describe, it, expect } from "vitest";

// Engine
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import {
	chainShipping,
	cogcFits,
	planDrafts,
	rankPlanets,
	recipeAmounts,
	splitByExpertise,
} from "@/features/production_chain/engine/chainBases";

// Fixtures
import {
	chainInput,
	index,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

// Types & Interfaces
import type {
	IChainBase,
	IChainInput,
} from "@/features/production_chain/engine/chainSolver.types";

const ctx = testContext();
const FOOD = "XH-668c"; // runs Food Industries, not fertile, FEO and CLI
const FARM = "PG-899b"; // runs Agriculture, fertility 0.4018, H2O and O
const TARGETS: [string, number][] = [
	["DW", 100],
	["RAT", 100],
	["OVE", 50],
];

const base = (
	id: string,
	planetId: string | null = null,
	cogc: IChainBase["cogc"] = "auto"
): IChainBase => ({ id, name: `Base ${id}`, planetId, cogc, experts: {} });

function solve(overrides: Partial<IChainInput> = {}) {
	const input = chainInput(TARGETS, overrides);
	return { input, result: solveChain(input, ctx) };
}

/** the chain split by expertise, food on FOOD, farms on FARM with cogc */
function placed(cogc: IChainBase["cogc"] = "auto") {
	const split = splitByExpertise(solve().result, ctx, 100);
	const idOf = (e: string) =>
		String.fromCharCode(65 + split.expertise.indexOf(e));
	const bases = split.expertise.map((e, i) =>
		e === "AGRICULTURE"
			? base(String.fromCharCode(65 + i), FARM, cogc)
			: base(String.fromCharCode(65 + i), FOOD)
	);
	return {
		split,
		food: idOf("FOOD_INDUSTRIES"),
		farm: idOf("AGRICULTURE"),
		...solve({ bases, baseOf: split.baseOf }),
	};
}

describe("bases in the solver", () => {
	it("starts as one base A with spec 1's steps (AC 1, 9)", () => {
		const { result } = solve();
		expect(result.bases.map((b) => b.id)).toEqual(["A"]);
		for (const t of result.order) {
			const row = result.rows[t];
			if (row.source === "buy") expect(row.base).toBeNull();
			else {
				expect(row.base).toBe("A");
				expect(row.efficiency).toBe(1);
				expect(row.buildings).toBeCloseTo(row.load, 9);
			}
		}
		const [a] = result.bases;
		expect(result.totals.built).toBe(a.built);
		expect(result.totals.area).toBe(a.area);
		expect(result.totals.construction).toBeCloseTo(a.construction, 6);
		expect(result.totals.upkeep).toBeCloseTo(a.upkeep, 6);
	});

	it("gives an advertising program's buildings 125 % (AC 3)", () => {
		const { result } = solve({ bases: [base("A", FOOD)] });
		const dw = result.rows.DW;
		expect(dw.buildingTicker).toBe("FP");
		expect(dw.efficiency).toBeCloseTo(1.25, 9);
		expect(dw.buildings).toBeCloseTo(dw.load / 1.25, 9);
		// polymer granulate is chemistry: no bonus
		expect(result.rows.PG.efficiency).toBe(1);
		expect(result.bases[0].cogc).toBe("FOOD_INDUSTRIES");
		expect(result.bases[0].running).toBe("FOOD_INDUSTRIES");
	});

	it("gives a workforce program 110 % to buildings with that tier (AC 3, 16)", () => {
		const { result } = solve({
			bases: [base("A", FOOD, "SCIENTISTS"), base("B", FOOD, "PIONEERS")],
			baseOf: { DW: "B" },
		});
		expect(ctx.buildings.get("FP")!.pioneers).toBeGreaterThan(0);
		expect(ctx.buildings.get("FP")!.scientists).toBe(0);
		expect(result.rows.DW.efficiency).toBeCloseTo(1.1, 9);
		expect(result.rows.RAT.efficiency).toBe(1);
		expect(result.bases[1].cogc).toBe("PIONEERS");
		expect(result.bases[1].running).toBe("FOOD_INDUSTRIES");
	});

	it("farms follow the fertility and stop without it (AC 3)", () => {
		const fertile = solve({
			bases: [base("A", FOOD), base("B", FARM)],
			baseOf: { GRN: "B" },
		}).result;
		expect(fertile.rows.GRN.buildingTicker).toBe("FRM");
		expect(fertile.rows.GRN.efficiency).toBeCloseTo(
			(1 + (0.4018 * 10) / 33) * 1.25,
			9
		);

		const barren = solve({ bases: [base("A", FOOD)] }).result;
		expect(barren.rows.GRN.noFarming).toBe(true);
		expect(barren.rows.GRN.buildings).toBe(0);
		expect(barren.rows.GRN.unitCost).toBeGreaterThan(0);
		expect(barren.bases[0].noFarming).toContain("GRN");
		expect(
			barren.bases[0].buildingTypes.find((b) => b.ticker === "FRM")
		).toBeUndefined();
	});

	it("extracts at the base planet's rate, else warns and keeps the chain's (AC 4)", () => {
		const on = solveChain(
			chainInput([["H2O", 50]], { bases: [base("A", FARM)] }),
			ctx
		);
		expect(on.rows.H2O.site?.planetId).toBe(FARM);
		expect(on.rows.H2O.notOnPlanet).toBe(false);

		const off = solveChain(
			chainInput([["H2O", 50]], { bases: [base("A", FOOD)] }),
			ctx
		);
		const plain = solveChain(chainInput([["H2O", 50]]), ctx);
		expect(off.rows.H2O.notOnPlanet).toBe(true);
		expect(off.rows.H2O.site).toEqual(plain.rows.H2O.site);
		expect(off.bases[0].notOnPlanet).toEqual(["H2O"]);
	});

	it("shares building capacity inside a base only (AC 2)", () => {
		const one = solve().result;
		const two = solve({
			bases: [base("A"), base("B")],
			baseOf: { RAT: "B" },
		}).result;
		const fp = (r: typeof one, id: string) =>
			r.buildingTypes.find((b) => b.ticker === "FP" && b.base === id)!;
		expect(fp(two, "A").materials).toEqual(["DW"]);
		expect(fp(two, "B").materials).toEqual(["RAT"]);
		expect(fp(two, "A").built).toBe(Math.ceil(two.rows.DW.buildings));
		expect(fp(two, "B").built).toBe(Math.ceil(two.rows.RAT.buildings));
		expect(fp(one, "A").built).toBe(
			Math.ceil(one.rows.DW.buildings + one.rows.RAT.buildings)
		);
		expect(two.totals.built).toBe(two.bases[0].built + two.bases[1].built);
	});

	it("counts core module, STO and habs in each base's area (AC 5, 17)", () => {
		const { result } = solve();
		const [a] = result.bases;
		const area = (t: string) => ctx.buildings.get(t)!.area_cost;
		const buildings = a.buildingTypes.reduce(
			(s, b) => s + b.built * area(b.ticker),
			0
		);
		expect(a.area).toBe(25 + buildings + area("STO") + a.habArea);
		expect(a.habArea).toBe(
			a.habs.reduce((s, h) => s + h.amount * area(h.ticker), 0)
		);
		expect(a.permits).toBe(
			Math.min(3, Math.max(1, Math.ceil((a.area - 250) / 250)))
		);
		expect(a.areaAvailable).toBe(250 + 250 * a.permits);
		expect(a.overArea).toBe(false);

		const big = solveChain(chainInput([["GWS", 1]]), ctx).bases[0];
		expect(big.overArea).toBe(true);
		expect(big.permits).toBe(3);
	});

	it("builds nothing for a base without steps", () => {
		const { result } = solve({ bases: [base("A"), base("B")] });
		expect(result.bases[1]).toMatchObject({
			area: 0,
			built: 0,
			construction: 0,
		});
		expect(result.totals.area).toBe(result.bases[0].area);
	});
});

describe("splitByExpertise", () => {
	it("splits DW + RAT + OVE into Food Industries and Agriculture (AC 6)", () => {
		const { result } = solve();
		const split = splitByExpertise(result, ctx, 100);
		// largest first: at Universe prices farming needs a little more
		expect(split.expertise).toEqual(["AGRICULTURE", "FOOD_INDUSTRIES"]);
		expect(split.baseOf.GRN).toBe("A");
		expect(split.baseOf.DW).toBe("B");
		expect(split.baseOf.RAT).toBe("B");
		// small groups join the first base
		expect(split.baseOf.PG).toBe("A");
		expect(split.baseOf.OVE).toBe("A");
		expect(split.baseOf.C).toBe("A");
		// bought rows have no base
		expect(
			Object.keys(split.baseOf).every(
				(t) => result.rows[t].source !== "buy"
			)
		).toBe(true);
	});

	it("keeps one base when no group is large enough", () => {
		const result = solveChain(chainInput([["DW", 1]]), ctx);
		expect(splitByExpertise(result, ctx, 100)).toEqual({
			expertise: ["FOOD_INDUSTRIES"],
			baseOf: Object.fromEntries(
				result.order
					.filter((t) => result.rows[t].source !== "buy")
					.map((t) => [t, "A"])
			),
		});
	});
});

describe("chainShipping", () => {
	const { result, food } = placed();
	const jumps = (from: string, to: string) =>
		from === "A" && to === "B" ? 3 : null;
	const routes = chainShipping(result, ctx.materials, jumps);
	const route = (from: string, to: string) =>
		routes.find((r) => r.from === from && r.to === to);

	it("ships cross-base links, CX deliveries and targets (AC 8)", () => {
		for (const l of result.links) {
			const from = result.rows[l.input];
			const to = result.rows[l.consumer].base!;
			if (from.source === "buy" || from.base === to || from.covered > 0)
				continue;
			const sent = result.links
				.filter((x) => x.input === l.input)
				.filter((x) => result.rows[x.consumer].base === to)
				.reduce((s, x) => s + x.perDay, 0);
			expect(
				route(from.base!, to)!.materials.find(
					(m) => m.ticker === l.input
				)!.perDay
			).toBeCloseTo(sent, 6);
		}
		// Universe prices: the CX has no code
		expect(route(food, "CX")!.materials.map((m) => m.ticker)).toEqual(
			expect.arrayContaining(["DW", "RAT"])
		);
		expect(route(result.rows.OVE.base!, "CX")!.materials).toContainEqual({
			ticker: "OVE",
			perDay: 50,
		});
		const delivered = routes
			.filter((r) => r.from === "CX")
			.flatMap((r) => r.materials.map((m) => m.ticker));
		for (const t of result.order)
			if (result.rows[t].source === "buy" && result.rows[t].perDay > 0)
				expect(delivered).toContain(t);
		// between bases first
		expect(routes[0].from).not.toBe("CX");
		expect(routes[0].to).not.toBe("CX");
	});

	it("weighs routes by quantity × weight and volume", () => {
		for (const r of routes) {
			let t = 0;
			let m3 = 0;
			for (const m of r.materials) {
				t += m.perDay * ctx.materials.get(m.ticker)!.weight;
				m3 += m.perDay * ctx.materials.get(m.ticker)!.volume;
			}
			expect(r.weight).toBeCloseTo(t, 9);
			expect(r.volume).toBeCloseTo(m3, 9);
			expect(r.jumps).toBe(r.from === "A" && r.to === "B" ? 3 : null);
		}
	});

	it("ships only to and from the CX with one base", () => {
		const one = solve().result;
		expect(
			chainShipping(one, ctx.materials, () => null).every(
				(r) => r.from === "CX" || r.to === "CX"
			)
		).toBe(true);
	});
});

describe("rankPlanets", () => {
	const split = splitByExpertise(solve().result, ctx, 100);
	const { input, result } = solve({
		bases: [base("A"), base("B")],
		baseOf: split.baseOf,
	});
	const farmId = split.baseOf.GRN;
	const planets = index.filter((p) =>
		[FOOD, FARM].includes(p.planet_natural_id)
	);

	it("solves a farm base on every planet (AC 7)", () => {
		const fits = rankPlanets(result, input, ctx, farmId, planets);
		const food = fits.find((f) => f.planet.planet_natural_id === FOOD)!;
		const farm = fits.find((f) => f.planet.planet_natural_id === FARM)!;
		expect(food.noFarming).toBe(true);
		expect(farm.noFarming).toBe(false);
		expect(farm.cogc).toBe("AGRICULTURE");
		// the planet's numbers are what the base shows once placed there
		const there = solve({
			bases: [base("A"), base("B")].map((b) =>
				b.id === farmId ? { ...b, planetId: FARM } : b
			),
			baseOf: split.baseOf,
		}).result.bases.find((b) => b.id === farmId)!;
		expect(farm.built).toBe(there.built);
		expect(farm.area).toBe(there.area);
		expect(farm.built).toBeLessThan(
			result.bases.find((b) => b.id === farmId)!.built
		);
	});

	it("names missing resources for an extracting base (AC 7)", () => {
		const water = chainInput([["H2O", 50]]);
		const fits = rankPlanets(
			solveChain(water, ctx),
			water,
			ctx,
			"A",
			planets
		);
		const at = (id: string) =>
			fits.find((f) => f.planet.planet_natural_id === id)!;
		expect(at(FOOD).missing).toEqual(["H2O"]);
		expect(at(FARM).missing).toEqual([]);
	});

	it("knows which programs help a base", () => {
		expect(cogcFits(ctx, "FOOD_INDUSTRIES", ["FP"])).toBe(true);
		expect(cogcFits(ctx, "AGRICULTURE", ["FP"])).toBe(false);
		expect(cogcFits(ctx, "PIONEERS", ["FP"])).toBe(true);
		expect(cogcFits(ctx, "SCIENTISTS", ["FP"])).toBe(false);
		expect(cogcFits(ctx, "---", ["FP"])).toBe(false);
	});
});

describe("plan drafts", () => {
	it("finds the smallest order amounts within 5 %", () => {
		expect(recipeAmounts([])).toEqual([]);
		expect(recipeAmounts([{ recipeId: "a", timeMs: 1, load: 2 }])).toEqual([
			1,
		]);
		expect(
			recipeAmounts([
				{ recipeId: "a", timeMs: 10, load: 3 },
				{ recipeId: "b", timeMs: 10, load: 1 },
			])
		).toEqual([3, 1]);
		// runs, not time, set the amounts
		expect(
			recipeAmounts([
				{ recipeId: "a", timeMs: 20, load: 2 },
				{ recipeId: "b", timeMs: 10, load: 1 },
			])
		).toEqual([1, 1]);
		// never more than 10, the closest when nothing fits
		const amounts = recipeAmounts([
			{ recipeId: "a", timeMs: 1, load: 100 },
			{ recipeId: "b", timeMs: 1, load: 1 },
		]);
		expect(amounts).toEqual([10, 1]);
	});

	it("drafts one plan per base with buildings, recipes, habs, STO, COGC and permits (AC 10, 16, 17)", () => {
		const { result, food, farm } = placed("PIONEERS");
		const drafts = planDrafts(result, { A: "One", B: "Two" });
		expect(drafts.map((d) => d.base)).toEqual(["A", "B"]);
		for (const d of drafts) {
			const b = result.bases.find((x) => x.id === d.base)!;
			expect(d.data.plan_name).toBe(d.base === "A" ? "One" : "Two");
			expect(d.data.planet_natural_id).toBe(b.planet!.planet_natural_id);
			expect(d.data.plan_cogc).toBe(b.cogc);
			expect(d.data.plan_permits_used).toBe(b.permits);
			expect(d.data.plan_corphq).toBe(false);
			expect(
				d.data.plan_data.buildings.map((x) => [x.name, x.amount])
			).toEqual(b.buildingTypes.map((x) => [x.ticker, x.built]));
			expect(d.data.plan_data.infrastructure).toContainEqual({
				building: "STO",
				amount: 1,
			});
			for (const h of b.habs)
				expect(d.data.plan_data.infrastructure).toContainEqual({
					building: h.ticker,
					amount: h.amount,
				});
			// the base's setup: both luxuries, its experts (none here)
			expect(d.data.plan_data.experts.every((e) => e.amount === 0)).toBe(
				true
			);
			expect(
				d.data.plan_data.workforce.every((w) => w.lux1 && w.lux2)
			).toBe(true);
		}
		const draft = (id: string) => drafts.find((d) => d.base === id)!.data;
		expect(draft(farm).plan_cogc).toBe("PIONEERS");
		expect(draft(food).plan_cogc).toBe("FOOD_INDUSTRIES");
		const fp = draft(food).plan_data.buildings.find(
			(x) => x.name === "FP"
		)!;
		expect(fp.active_recipes.map((r) => r.recipeid).sort()).toEqual(
			[
				result.rows.DW.recipe!.recipe_id,
				result.rows.RAT.recipe!.recipe_id,
			].sort()
		);
	});

	it("uses the planet's extraction recipe and skips bases without a planet", () => {
		const r = solveChain(
			chainInput([["H2O", 50]], { bases: [base("A", FARM)] }),
			ctx
		);
		const [d] = planDrafts(r, { A: "Water" });
		const ext = d.data.plan_data.buildings[0];
		expect(ext.active_recipes).toEqual([
			{ recipeid: `${ext.name}#H2O`, amount: 1 },
		]);

		const none = solveChain(chainInput([["H2O", 50]]), ctx);
		expect(planDrafts(none, { A: "x" })).toEqual([]);
	});
});

describe("bases edge cases", () => {
	it("uses no program for 'none' and one base A without bases", () => {
		const none = solve({ bases: [base("A", FOOD, "none")] }).result;
		expect(none.bases[0].cogc).toBe("---");
		expect(none.rows.DW.efficiency).toBe(1);
		const empty = solve({ bases: [] }).result;
		expect(empty.bases.map((b) => b.id)).toEqual(["A"]);
		expect(empty.rows.DW.base).toBe("A");
	});

	it("ignores unknown buildings for programs and splits without expertise", () => {
		expect(cogcFits(ctx, "FOOD_INDUSTRIES", ["ZZZ"])).toBe(false);
		// extraction still pending: no building, no expertise
		const pending = testContext(false);
		const r = solveChain(chainInput([["H2O", 50]]), pending);
		expect(splitByExpertise(r, pending, 100)).toEqual({
			expertise: [null],
			baseOf: { H2O: "A" },
		});
	});

	it("ships to a named exchange and weighs unknown materials as 0", () => {
		const { result } = placed();
		for (const t of result.order) result.rows[t].exchange = "AI1";
		const routes = chainShipping(result, new Map(), () => null);
		expect(routes.some((r) => r.to === "AI1" || r.from === "AI1")).toBe(
			true
		);
		expect(routes.every((r) => r.weight === 0 && r.volume === 0)).toBe(
			true
		);
	});

	it("ranks for the first base when the id is unknown", () => {
		const { input, result } = solve();
		const planets = index.filter((p) => p.planet_natural_id === FOOD);
		expect(rankPlanets(result, input, ctx, "Z", planets)[0].built).toBe(
			rankPlanets(result, input, ctx, "A", planets)[0].built
		);
	});

	it("gives a recipe without time one order", () => {
		expect(
			recipeAmounts([
				{ recipeId: "a", timeMs: 0, load: 1 },
				{ recipeId: "b", timeMs: 10, load: 1 },
			])
		).toEqual([1, 1]);
	});

	it("drafts an extractor without a recipe when the planet lacks the resource", () => {
		const r = solveChain(
			chainInput([["H2O", 50]], { bases: [base("A", FOOD)] }),
			ctx
		);
		const [d] = planDrafts(r, { A: "Water" });
		expect(d.data.plan_data.buildings[0].active_recipes).toEqual([]);
	});
});

describe("chainShipping with byproducts", () => {
	it("ships demand covered by a byproduct from the base that makes it", () => {
		// BE yields SIO as a byproduct, which covers all of the chain's SIO
		const input = chainInput([["THP", 10]], {
			bases: [base("A"), base("B")],
			baseOf: { BE: "B" },
		});
		const result = solveChain(input, ctx);
		const sio = result.byproducts.find((b) => b.ticker === "SIO")!;
		expect(sio.sold).toBeLessThan(1e-9);
		const consumers = result.links
			.filter((l) => l.input === "SIO")
			.map((l) => result.rows[l.consumer].base);
		expect(consumers.every((b) => b === "A")).toBe(true);
		const routes = chainShipping(result, ctx.materials, () => null);
		const fromB = routes.find((r) => r.from === "B" && r.to === "A")!;
		expect(
			fromB.materials.find((m) => m.ticker === "SIO")!.perDay
		).toBeCloseTo(sio.used, 6);
		// nothing sold, so no SIO goes to the CX
		expect(
			routes.some(
				(r) =>
					r.to === "CX" && r.materials.some((m) => m.ticker === "SIO")
			)
		).toBe(false);
	});
});
