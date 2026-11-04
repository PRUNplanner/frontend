import { describe, it, expect } from "vitest";

// Engine
import { solveChain } from "@/features/production_chain/engine/chainSolver";
import {
	autoLayout,
	buyHint,
	fitBases,
	layoutBases,
	mergeBases,
	pickPlanets,
	separateBase,
} from "@/features/production_chain/engine/chainAutoLayout";
import {
	chainShipping,
	cogcFits,
} from "@/features/production_chain/engine/chainBases";
import { runningCOGC } from "@/features/production_chain/engine/chainSolver";
import { usePathfinder } from "@/features/pathfinding/usePathfinder";

// Fixtures
import {
	chainInput,
	index,
	NOW,
	RAT,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

// Types & Interfaces
import type {
	ChainMaxArea,
	IChainContext,
	IChainInput,
	IChainResult,
	IChainRow,
} from "@/features/production_chain/engine/chainSolver.types";

const ctx = testContext();
const nameOf = (e: string | null) => e ?? "Mixed";
const { getJumpsFrom } = usePathfinder();
const jumps = (a: string, b: string) => getJumpsFrom(a).get(b) ?? null;
const opts = { nameOf, jumps };

const CHAINS: [string, number][] = [
	["AIR", 3],
	["AIR", 10],
	["RCT", 1],
	["QCR", 1],
	["ADE", 10],
];

const layouts = new Map<string, { input: IChainInput; result: IChainResult }>();
/** laid out once per chain and size, with planets */
function laid(ticker: string, perDay: number, maxArea?: ChainMaxArea) {
	const key = `${ticker}${perDay}@${maxArea}`;
	let l = layouts.get(key);
	if (!l) {
		const input = autoLayout(
			chainInput([[ticker, perDay]], { maxArea }),
			ctx,
			opts
		);
		l = { input, result: solveChain(input, ctx) };
		layouts.set(key, l);
	}
	return l;
}

const used = (r: IChainResult) => r.bases.filter((b) => b.materials.length);

/** expertises with 1.5 or more exact buildings in a base */
function bigExpertises(r: IChainResult, id: string): string[] {
	const exact = new Map<string, number>();
	for (const t of r.buildingTypes.filter((b) => b.base === id))
		exact.set(
			t.expertise ?? "",
			(exact.get(t.expertise ?? "") ?? 0) + t.exact
		);
	return [...exact].filter(([, n]) => n >= 1.5).map(([e]) => e);
}

describe("autoLayout (AC 1)", () => {
	for (const [ticker, perDay] of CHAINS)
		it(`lays ${ticker} ${perDay}/day into bases of 500 area, one expertise each`, () => {
			const { result } = laid(ticker, perDay);
			const bases = used(result);
			expect(bases.length).toBeGreaterThan(1);
			for (const b of bases) {
				expect(b.area).toBeLessThanOrEqual(500);
				expect(bigExpertises(result, b.id).length).toBeLessThanOrEqual(
					1
				);
			}
			// the targets still come out in full
			expect(result.rows[ticker].perDay).toBeCloseTo(perDay, 9);
		});

	for (const [ticker, perDay] of CHAINS)
		it(`keeps ${ticker} ${perDay}/day within 750 and 1,000 in no more bases`, () => {
			const at500 = used(laid(ticker, perDay).result).length;
			for (const max of [750, 1000] as ChainMaxArea[]) {
				const bases = used(laid(ticker, perDay, max).result);
				for (const b of bases) expect(b.area).toBeLessThanOrEqual(max);
				expect(bases.length).toBeLessThanOrEqual(at500);
			}
		});

	it("keeps one base for a chain without buildings", () => {
		const pending = testContext(false);
		const input = layoutBases(chainInput([["H2O", 50]]), pending, nameOf);
		expect(input.bases).toHaveLength(1);
		expect(input.bases[0].name).toBe("Mixed");
	});

	it("names bases after their expertise, numbered", () => {
		const names = laid("AIR", 10).input.bases.map((b) => b.name);
		expect(names).toContain("ELECTRONICS");
		expect(names).toContain("ELECTRONICS 2");
		expect(new Set(names).size).toBe(names.length);
	});
});

describe("split steps (AC 2)", () => {
	const base = (id: string) => ({
		id,
		name: id,
		planetId: null,
		cogc: "auto" as const,
		experts: {},
	});
	const whole = solveChain(
		chainInput([["DW", 300]], { bases: [base("A"), base("B")] }),
		ctx
	);
	const split = solveChain(
		chainInput([["DW", 300]], {
			bases: [base("A"), base("B")],
			baseOf: { DW: { A: 3, B: 3 } },
		}),
		ctx
	);

	it("puts a step's pieces into both bases", () => {
		expect(split.rows.DW.shares).toEqual([
			{ base: "A", share: 0.5 },
			{ base: "B", share: 0.5 },
		]);
		const fp = (id: string) =>
			split.buildingTypes.find(
				(b) => b.base === id && b.ticker === "FP"
			)!;
		expect(fp("A").exact).toBeCloseTo(whole.rows.DW.buildings / 2, 9);
		expect(fp("B").exact).toBeCloseTo(whole.rows.DW.buildings / 2, 9);
		expect(split.bases.every((b) => b.materials.includes("DW"))).toBe(true);
	});

	it("keeps the totals within whole buildings per base", () => {
		expect(split.totals.exact).toBeCloseTo(whole.totals.exact, 6);
		expect(split.totals.built - whole.totals.built).toBeLessThanOrEqual(1);
		// a second base adds its core module, STO and habs
		expect(split.totals.area).toBeGreaterThan(whole.totals.area);
		expect(split.totals.profit).toBeLessThanOrEqual(
			whole.totals.profit + 1e-6
		);
		expect(split.totals.targetsValue).toBeCloseTo(
			whole.totals.targetsValue,
			6
		);
	});

	it("ships an input to the other piece only", () => {
		// PG is made whole in A; half of it goes to B's DW
		const pg = split.links.find(
			(l) => l.input === "PG" && l.consumer === "DW"
		)!;
		const routes = chainShipping(split, ctx.materials, () => null);
		const ab = routes.find((r) => r.from === "A" && r.to === "B")!;
		expect(ab.materials).toEqual([{ ticker: "PG", perDay: pg.perDay / 2 }]);
		expect(routes.some((r) => r.from === "B" && r.to === "A")).toBe(false);
		// both pieces sell their DW
		const out = routes.filter((r) =>
			r.materials.some((m) => m.ticker === "DW")
		);
		expect(out.map((r) => r.from).sort()).toEqual(["A", "B"]);
	});

	it("drops unknown bases and bad counts", () => {
		const r = solveChain(
			chainInput([["DW", 300]], {
				baseOf: { DW: { A: 2, Q: 3 } },
			}),
			ctx
		);
		expect(r.rows.DW.shares).toEqual([{ base: "A", share: 1 }]);
	});
});

describe("pickPlanets (AC 3)", () => {
	it("gives every base its own planet, running a COGC program it benefits from", () => {
		const { result } = laid("AIR", 3);
		const planets = used(result).map((b) => b.planet?.planet_natural_id);
		expect(planets.every(Boolean)).toBe(true);
		expect(new Set(planets).size).toBe(planets.length);
		for (const b of used(result))
			expect(
				cogcFits(
					ctx,
					b.cogc,
					b.buildingTypes.map((t) => t.ticker)
				)
			).toBe(true);
	});

	it("skips planets with an own base or without a free plot", () => {
		const { input } = laid("AIR", 3);
		const first = input.bases[0].planetId!;
		const second = input.bases[1].planetId!;
		const full = new Map(ctx.planets);
		const p = full.get(second)!;
		full.set(second, { ...p, plots_total: 3, plots_used: 3 });
		const fullCtx: IChainContext = { ...ctx, planets: full };
		const again = autoLayout(chainInput([["AIR", 3]]), fullCtx, {
			...opts,
			ownBases: new Set([first]),
		});
		const picked = again.bases.map((b) => b.planetId);
		expect(picked).not.toContain(first);
		expect(picked).not.toContain(second);
	});

	it("picks a running COGC program over a closer planet without it", () => {
		const { input, result } = laid("ADE", 10);
		const b = used(result)[0];
		const tickers = b.buildingTypes.map((t) => t.ticker);
		// the empire sits next to a free planet whose program doesn't fit
		const near = index.find(
			(p) =>
				!cogcFits(ctx, runningCOGC(p, NOW), tickers) &&
				(p.plots_total ?? 1) > (p.plots_used ?? 0)
		)!;
		const one = {
			...input,
			bases: input.bases.map((x) => ({ ...x, planetId: null })),
		};
		const picked = pickPlanets(one, ctx, [b.id], {
			jumps,
			empireSystems: [near.system_id],
		}).bases.find((x) => x.id === b.id)!.planetId!;
		expect(picked).not.toBe(near.planet_natural_id);
		const p = ctx.planets!.get(picked)!;
		expect(cogcFits(ctx, runningCOGC(p, NOW), tickers)).toBe(true);
		// without a fitting program anywhere, distance decides
		expect(jumps(p.system_id, near.system_id)).not.toBeNull();
	});

	it("moves bases towards the selected empire", () => {
		const { input } = laid("AIR", 3);
		const plain = solveChain(input, ctx);
		// an empire far from the plain layout's planets
		const far =
			index.find((p) => p.planet_natural_id === "UV-351a") ?? index[0];
		const empire = [far.system_id];
		const near = pickPlanets(
			{
				...input,
				bases: input.bases.map((b) => ({ ...b, planetId: null })),
			},
			ctx,
			input.bases.map((b) => b.id),
			{ jumps, empireSystems: empire }
		);
		const mean = (r: IChainResult) => {
			const list = used(r).map(
				(b) => jumps(b.planet!.system_id, empire[0]) ?? 50
			);
			return list.reduce((s, n) => s + n, 0) / list.length;
		};
		expect(mean(solveChain(near, ctx))).toBeLessThan(mean(plain));
	});

	it("leaves the planets alone without the planet index", () => {
		const input = chainInput([["DW", 100]]);
		expect(pickPlanets(input, testContext(false), ["A"], {})).toBe(input);
	});
});

describe("buy tiny steps (AC 4)", () => {
	const row = (over: Partial<IChainRow>): IChainRow =>
		({
			source: "make",
			target: false,
			buildings: 0.1,
			price: 100,
			costParts: { inputs: 50, upkeepWear: 10, share: 1 },
			...over,
		}) as IChainRow;

	it("hints Buy when a whole building costs more than the CX", () => {
		// 50 + 10 / 0.1 = 150 > 100
		expect(buyHint(row({}))).toBe(true);
		expect(buyHint(row({ price: 200 }))).toBe(false);
		expect(buyHint(row({ buildings: 0.25 }))).toBe(false);
		expect(buyHint(row({ target: true }))).toBe(false);
		expect(buyHint(row({ source: "buy" }))).toBe(false);
		expect(buyHint(row({ price: 0 }))).toBe(false);
		expect(buyHint(row({ costParts: null }))).toBe(false);
	});

	it("buys hinted steps in auto layout", () => {
		const before = solveChain(chainInput([["AIR", 3]]), ctx);
		const hinted = before.order.filter((t) => buyHint(before.rows[t]));
		expect(hinted.length).toBeGreaterThan(0);
		const { input, result } = laid("AIR", 3);
		for (const t of hinted) {
			expect(input.source[t]).toBe("buy");
			// gone when a bought step needed it
			expect(result.rows[t]?.source ?? "buy").toBe("buy");
		}
		// no hint is left once the bases have their COGC and experts
		expect(result.order.filter((t) => buyHint(result.rows[t]))).toEqual([]);
	});
});

describe("fitBases (AC 5)", () => {
	const fits = (input: IChainInput, n: number) => {
		const r = solveChain(layoutBases(input, ctx, nameOf), ctx);
		const bases = used(r);
		return bases.length <= n && bases.every((b) => b.area <= 500);
	};

	it("finds the largest AIR rate that fits into 2 bases", () => {
		const fitted = fitBases(chainInput([["AIR", 3]]), ctx, 2)!;
		const rate = fitted.targets[0].perDay;
		expect(rate).toBeGreaterThan(0);
		expect(Math.round(rate * 100)).toBeCloseTo(rate * 100, 6);
		expect(fits(fitted, 2)).toBe(true);
		const more = chainInput([["AIR", rate + 0.01]]);
		expect(fits(more, 2)).toBe(false);
	});

	it("scales every target alike", () => {
		const fitted = fitBases(
			chainInput([
				["DW", 100],
				["RAT", 50],
			]),
			ctx,
			3
		)!;
		const [dw, rat] = fitted.targets.map((t) => t.perDay);
		expect(dw / rat).toBeCloseTo(2, 1);
	});

	it("gives up without targets or bases", () => {
		expect(fitBases(chainInput([]), ctx, 2)).toBeNull();
		expect(fitBases(chainInput([["AIR", 3]]), ctx, 0)).toBeNull();
	});
});

describe("merge and separate (AC 6)", () => {
	it("merges a base into another, keeping the target's planet", () => {
		const { input, result } = laid("AIR", 3);
		const [a, b] = input.bases;
		const merged = mergeBases(result, input, b.id, a.id);
		expect(merged.bases.map((x) => x.id)).not.toContain(b.id);
		expect(merged.bases.find((x) => x.id === a.id)!.planetId).toBe(
			a.planetId
		);
		const after = solveChain(merged, ctx);
		const pieces = (r: IChainResult, id: string) =>
			r.order.filter((t) => r.rows[t].shares.some((s) => s.base === id));
		expect(pieces(after, a.id).sort()).toEqual(
			[
				...new Set([...pieces(result, a.id), ...pieces(result, b.id)]),
			].sort()
		);
		expect(after.totals.exact).toBeCloseTo(result.totals.exact, 0);
		expect(mergeBases(result, input, a.id, a.id)).toBe(input);
	});

	it("merges a split step's counts", () => {
		const input = chainInput([["DW", 300]], {
			bases: [
				{ id: "A", name: "", planetId: null, cogc: "auto" },
				{ id: "B", name: "", planetId: null, cogc: "auto" },
			],
			baseOf: { DW: { A: 3, B: 3 } },
		});
		const merged = mergeBases(solveChain(input, ctx), input, "B", "A");
		expect(merged.baseOf.DW).toEqual({ A: 1 });
	});

	it("separates a two-expertise base into two bases with planets", () => {
		const input = chainInput([
			["DW", 100],
			["RAT", 100],
			["OVE", 50],
		]);
		const result = solveChain(input, ctx);
		const next = separateBase(result, input, ctx, "A", opts)!;
		const after = solveChain(next, ctx);
		expect(used(after).length).toBeGreaterThan(1);
		for (const b of next.bases.slice(1)) expect(b.planetId).toBeTruthy();
		expect(after.totals.exact).toBeGreaterThan(0);
	});

	it("halves a one-expertise base", () => {
		const input = chainInput([["DW", 300]], { source: { PG: "buy" } });
		const result = solveChain(input, ctx);
		const next = separateBase(result, input, ctx, "A", opts)!;
		expect(next.bases).toHaveLength(2);
		const share = next.baseOf.DW;
		expect(Object.keys(share).sort()).toEqual(["A", "B"]);
		expect(Math.abs(share.A - share.B)).toBeLessThanOrEqual(1);
	});

	it("can't separate a single building", () => {
		const input = chainInput([["DW", 5]], { source: { PG: "buy" } });
		expect(
			separateBase(solveChain(input, ctx), input, ctx, "A", opts)
		).toBeNull();
	});
});

describe("timing (AC 8)", () => {
	it("lays out a 160-building chain in under 300 ms", () => {
		const input = chainInput([["AIR", 7]]);
		expect(solveChain(input, ctx).totals.built).toBeGreaterThanOrEqual(160);
		autoLayout(input, ctx, opts); // warm up the jump cache
		const start = performance.now();
		autoLayout(input, ctx, opts);
		expect(performance.now() - start).toBeLessThan(300);
	});
});

describe("auto layout limits", () => {
	it("stops at 26 bases and puts the rest in the last one", () => {
		const input = layoutBases(chainInput([["AIR", 40]]), ctx, nameOf);
		expect(input.bases).toHaveLength(26);
		const result = solveChain(input, ctx);
		// every made step still has a base
		for (const t of result.order)
			if (result.rows[t].buildingTicker)
				expect(result.rows[t].shares.length).toBeGreaterThan(0);
	});

	it("keeps extraction steps whole", () => {
		const input = layoutBases(
			chainInput([["AIR", 10]], { rawSource: "extract" }),
			ctx,
			nameOf
		);
		const result = solveChain(input, ctx);
		const extracted = result.order.filter(
			(t) => result.rows[t].source === "extract"
		);
		expect(extracted.length).toBeGreaterThan(0);
		for (const t of extracted)
			expect(Object.keys(input.baseOf[t] ?? { A: 1 })).toHaveLength(1);
	});

	it("keeps a base's planet and places the others elsewhere", () => {
		const { input } = laid("AIR", 3);
		const kept = input.bases[0].planetId!;
		const next = pickPlanets(
			{
				...input,
				bases: input.bases.map((b, i) =>
					i ? { ...b, planetId: null } : b
				),
			},
			ctx,
			input.bases.slice(1).map((b) => b.id),
			{ jumps }
		);
		expect(next.bases[0].planetId).toBe(kept);
		expect(next.bases.slice(1).map((b) => b.planetId)).not.toContain(kept);
	});

	it("leaves a base without a planet when none is free", () => {
		const input = chainInput([["DW", 100]], {
			source: { PG: "buy" },
			bases: ["A", "B"].map((id) => ({
				id,
				name: id,
				planetId: null,
				cogc: "auto" as const,
			})),
			baseOf: { DW: { A: 3, B: 3 } },
		});
		const one = index.find((p) => p.planet_natural_id === "XH-668c")!;
		const tiny: IChainContext = {
			...ctx,
			planets: new Map([[one.planet_natural_id, one]]),
		};
		const next = pickPlanets(input, tiny, ["A", "B"], { jumps });
		const planets = next.bases.map((b) => b.planetId);
		expect(planets.filter(Boolean)).toEqual([one.planet_natural_id]);
	});

	it("balances a one-expertise base of several steps", () => {
		const input = chainInput(
			[
				["DW", 200],
				["RAT", 200],
			],
			{
				source: { PG: "buy", GRN: "buy", ALG: "buy", NUT: "buy" },
				recipeId: { RAT },
			}
		);
		const result = solveChain(input, ctx);
		const next = separateBase(result, input, ctx, "A", opts)!;
		expect(next.bases).toHaveLength(2);
		const after = solveChain(next, ctx);
		expect(used(after)).toHaveLength(2);
	});

	it("can't separate when every base letter is used", () => {
		const input = chainInput([["DW", 300]], {
			source: { PG: "buy" },
			bases: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((id) => ({
				id,
				name: id,
				planetId: null,
				cogc: "auto" as const,
			})),
		});
		expect(
			separateBase(solveChain(input, ctx), input, ctx, "A", opts)
		).toBeNull();
	});
});
