import { describe, it, expect } from "vitest";

// Engine
import {
	baseLetter,
	checkEmpire,
	planLux,
	planetPlots,
	tryInPlanner,
} from "@/features/production_chain/engine/chainCheck";
import {
	extractorRate,
	planetFactor,
	runningCOGC,
	workerUpkeep,
} from "@/features/production_chain/engine/chainSolver";

// Fixtures
import {
	BARREN,
	DW,
	DW7,
	FARM_PLANET,
	fixtureEmpire,
	index,
	NOW,
	RAT,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type {
	ICheckInput,
	ICheckLocationFinding,
} from "@/features/production_chain/engine/chainCheck.types";

const ctx = testContext();
const DAY = 86_400_000;

const PLANS = fixtureEmpire();

function check(overrides: Partial<ICheckInput> = {}, c = ctx) {
	return checkEmpire(
		{
			plans: PLANS,
			targets: ["DW", "RAT"],
			min: 0,
			setup: true,
			payback: 100,
			picks: {},
			...overrides,
		},
		c
	);
}

const base = (r: ReturnType<typeof check>, id: string) =>
	r.bases.find((b) => b.id === id)!;
const step = (r: ReturnType<typeof check>, id: string, building: string) =>
	base(r, id).steps.find((s) => s.building === building)!;

describe("checkEmpire", () => {
	it("has a running fixture empire", () => {
		for (const p of PLANS)
			for (const b of p.result.production.buildings)
				expect(b.totalEfficiency).toBeGreaterThan(0);
		expect(runningCOGC(index.find((p) => p.planet_natural_id === BARREN)!, NOW)).toBe("---");
	});

	it("finds what the empire sells, its net amounts and the chains' materials (AC 5)", () => {
		const r = check();
		const a = PLANS[0].result.production.buildings[0];
		const dwOut = (4 * a.totalEfficiency * DAY) / 17_280_000 * 10;
		const dwUse = PLANS.reduce(
			(s, p) =>
				s +
				(p.result.workforceMaterialIO.find((m) => m.ticker === "DW")?.input ??
					0),
			0
		);
		expect(r.net.DW).toBeCloseTo(dwOut - dwUse, 6);
		expect(r.sold.map((s) => s.ticker)).toContain("DW");
		expect(r.sold.map((s) => s.ticker)).toContain("C");
		for (let i = 1; i < r.sold.length; i++)
			expect(r.sold[i - 1].value).toBeGreaterThanOrEqual(r.sold[i].value);
		expect(r.sold.every((s) => s.perDay > 0)).toBe(true);

		const dw = r.chains.find((c) => c.target === "DW")!;
		expect(dw.rows.map((x) => x.ticker)).toEqual(["DW", "H2O", "PG"]);
		expect(dw.rows.map((x) => x.depth)).toEqual([0, 1, 1]);
		expect(dw.bases.sort()).toEqual(["A", "B"]);
		const h2o = dw.rows[1];
		expect(h2o.made).toBeCloseTo(
			(2 * step(r, "B", "RIG").efficiency * DAY) /
				step(r, "B", "RIG").recipe.time_ms *
				step(r, "B", "RIG").recipe.outputs[0].material_amount,
			6
		);
		expect(dw.rows[2].made).toBe(0);
		expect(dw.rows[2].unitCost).toBe(ctx.prices.getPrice("PG", "BUY"));

		const rat = r.chains.find((c) => c.target === "RAT")!;
		expect(rat.rows.map((x) => x.ticker).sort()).toEqual(
			["ALG", "GRN", "H2O", "NUT", "RAT"].sort()
		);
		expect(rat.bases.sort()).toEqual(["B", "C", "D"]);
	});

	it("costs a material by its steps: inputs at their unit cost, upkeep and wear", () => {
		const r = check();
		const fp = step(r, "A", "FP");
		const h2o = r.chains[0].rows[1].unitCost;
		const pg = ctx.prices.getPrice("PG", "BUY");
		const inputs = fp.inputs.H2O * h2o + fp.inputs.PG * pg;
		expect(fp.inputCost).toBeCloseTo(inputs, 6);
		expect(fp.unitCost).toBeCloseTo(
			(inputs + fp.daily * fp.buildings) / fp.perDay,
			6
		);
		expect(fp.margin).toBeCloseTo(
			fp.perDay * ctx.prices.getPrice("DW", "SELL") - inputs,
			6
		);
	});

	it("marks bases outside the chains and adds their outputs (AC 6)", () => {
		const r = check();
		expect(base(r, "E").verdict).toBe("out");
		expect(base(r, "E").checked).toBe(false);
		expect(r.unchecked).toEqual(["C"]);
		const all = check({ targets: ["DW", "RAT", ...r.unchecked] });
		expect(base(all, "E").checked).toBe(true);
		expect(base(all, "E").verdict).not.toBe("out");
		expect(all.unchecked).toEqual([]);
		expect(all.totals.checked).toBe(5);
	});

	it("shows plan fixes for a program the planet doesn't run, and one the plan misses (AC 7)", () => {
		const r = check();
		const missed = base(r, "B").findings.find((f) => f.kind === "fix")!;
		expect(missed.kind === "fix" && missed.fix).toBe("missed");
		const frm = step(r, "B", "FRM");
		expect(missed.delta).toBeCloseTo(frm.margin * 0.25, 6);
		expect(base(r, "B").verdict).toBe("fix");

		const lost = base(r, "C").findings.find((f) => f.kind === "fix")!;
		expect(lost.kind === "fix" && lost.fix).toBe("lost");
		expect(lost.delta).toBeCloseTo(-0.2 * Math.max(step(r, "C", "FRM").margin, 0), 6);
		// fixes always show
		expect(
			base(check({ min: 1e12 }), "C").findings.some((f) => f.kind === "fix")
		).toBe(true);
	});

	it("finds a cheaper recipe in the same building (AC 8)", () => {
		// whichever DW recipe costs more gets a recipe finding for the other
		const results = [DW, DW7].map((rid) => {
			const r = checkEmpire(
				{
					plans: fixtureEmpire(rid),
					targets: ["DW", "RAT"],
					min: 0,
					setup: false,
					payback: 100,
					picks: {},
				},
				ctx
			);
			return { rid, f: base(r, "A").findings.find((f) => f.kind === "recipe") };
		});
		const hit = results.find((x) => x.f)!;
		expect(hit).toBeDefined();
		const f = hit.f!;
		if (f.kind !== "recipe") throw new Error("kind");
		expect(f.recipe.recipe_id).toBe(hit.rid === DW ? DW7 : DW);
		expect(f.alt).toBeLessThan(f.now * 0.97);
		expect(f.delta).toBeCloseTo((f.now - f.alt) * f.step.perDay, 6);
		expect(f.need).toBeCloseTo(
			(f.step.perDay * f.recipe.time_ms) /
				(DAY * f.step.efficiency * f.recipe.outputs[0].material_amount),
			6
		);
		expect(f.extra).toBe(Math.max(0, Math.ceil(f.need - f.step.buildings - 1e-6)));
	});

	it("finds make or buy for steps that cost more than the CX price (AC 8)", () => {
		const r = check();
		for (const b of r.bases)
			for (const s of b.steps) {
				const price = ctx.prices.getPrice(s.ticker, "BUY");
				const shouldBuy =
					b.checked &&
					s.inChain &&
					!["DW", "RAT"].includes(s.ticker) &&
					price > 0 &&
					s.unitCost > price + 1e-6;
				const f = b.findings.find(
					(x) => x.kind === "buy" && x.step === s
				);
				expect(!!f).toBe(shouldBuy);
				if (f && f.kind === "buy") {
					expect(f.delta).toBeCloseTo((s.unitCost - price) * s.perDay, 6);
					expect(f.market.exchange).toBeTruthy();
				}
			}
	});

	it("moves a farm to a more fertile base, never extraction to a planet without the resource (AC 9)", () => {
		const r = check();
		const f = base(r, "C").findings.find(
			(x): x is ICheckLocationFinding => x.kind === "location"
		)!;
		expect(f.step.building).toBe("FRM");
		const own = f.options.find((o) => o.own === "B")!;
		const farm = index.find((p) => p.planet_natural_id === FARM_PLANET)!;
		const barren = index.find((p) => p.planet_natural_id === BARREN)!;
		expect(own.ratio).toBeCloseTo(
			planetFactor(ctx, farm, "AGRICULTURE", "FRM") /
				planetFactor(ctx, barren, "---", "FRM"),
			9
		);
		expect(own.construction).toBeCloseTo(
			2 *
				-ctx.buildings
					.get("FRM")!
					.costs.reduce(
						(s, c) => s - c.material_amount * ctx.prices.getPrice(c.material_ticker, "BUY"),
						0
					),
			6
		);
		expect(own.area).toBe(2 * ctx.buildings.get("FRM")!.area_cost);
		expect(own.free).toBe(1000 - PLANS[1].result.area.areaUsed);
		expect(own.fits).toBe(own.area <= own.free!);
		expect(own.gain).toBeCloseTo((own.ratio - 1) * f.step.margin, 6);
		expect(own.payback).toBeCloseTo(own.construction / own.gain, 6);
		// options are ranked by gain
		for (let i = 1; i < f.options.length; i++)
			expect(f.options[i - 1].gain).toBeGreaterThanOrEqual(f.options[i].gain);

		const rig = base(r, "B").findings.find(
			(x): x is ICheckLocationFinding =>
				x.kind === "location" && x.step.building === "RIG"
		);
		const sites = new Set(
			ctx.extraction!.get("H2O")!.sites.map((s) => s.planetId)
		);
		for (const o of rig?.options ?? []) {
			expect(sites.has(o.planet.planet_natural_id)).toBe(true);
			expect(o.rate).toBe(
				extractorRate(
					ctx.extraction!.get("H2O")!.sites.find(
						(s) => s.planetId === o.planet.planet_natural_id
					)!
				)
			);
		}
	});

	it("ranks new bases, skips a full best one, keeps unknown plots possible (AC 11)", () => {
		// without B, C's farms only have new bases
		const plans = PLANS.filter((p) => p.id !== "B");
		const r = check({ plans });
		const f = base(r, "C").findings.find(
			(x): x is ICheckLocationFinding => x.kind === "location"
		)!;
		expect(f.options.some((o) => o.own === null)).toBe(true);
		const fresh = f.options.find((o) => o.own === null)!;
		expect(fresh.plots).toBeNull();
		expect(fresh.full).toBe(false);
		expect(f.options.every((o) => o.own === null)).toBe(true);
		expect(fresh.area).toBeGreaterThan(25 + 2 * ctx.buildings.get("FRM")!.area_cost);
		expect(f.suggested).toBe(
			f.options.find((o) => o.fits && !o.full && !o.slow)
		);

		// the suggestion's planet becomes full: the next one is suggested
		const best = f.suggested!.planet;
		const planets = new Map(ctx.planets);
		planets.set(best.planet_natural_id, {
			...best,
			plots_total: 10,
			plots_used: 10,
			supports_ghost_sites: false,
		} as PlanetSearchIndexEntry);
		const full = check({ plans }, { ...ctx, planets });
		const g = base(full, "C").findings.find(
			(x): x is ICheckLocationFinding => x.kind === "location"
		)!;
		const fullOption = g.options.find(
			(o) => o.planet.planet_natural_id === best.planet_natural_id
		)!;
		expect(fullOption.full).toBe(true);
		expect(fullOption.plots).toEqual({ free: 0, total: 10, ghost: false });
		expect(g.options.indexOf(fullOption)).toBe(f.options.indexOf(f.suggested!));
		expect(g.option).not.toBe(fullOption);
		expect(g.better).toContain(fullOption);

		// ghost sites settle a full planet
		const ghost = planetPlots({
			...best,
			plots_total: 5,
			plots_used: 7,
			supports_ghost_sites: true,
		} as PlanetSearchIndexEntry);
		expect(ghost).toEqual({ free: -2, total: 5, ghost: true });
	});

	it("uses the user's pick and drops moves over the payback limit (AC 10, 12)", () => {
		const r = check();
		const f = base(r, "C").findings.find(
			(x): x is ICheckLocationFinding => x.kind === "location"
		)!;
		const last = f.options[f.options.length - 1];
		const picked = check({
			picks: { [f.step.key]: last.planet.planet_natural_id },
		});
		const p = base(picked, "C").findings.find(
			(x): x is ICheckLocationFinding => x.kind === "location"
		)!;
		expect(p.picked).toBe(true);
		expect(p.option.planet.planet_natural_id).toBe(last.planet.planet_natural_id);
		expect(p.delta).toBeCloseTo(last.gain, 6);
		expect(p.construction).toBeCloseTo(last.construction, 6);

		// a pick shows even below "Ignore below", so it can be undone
		const small = check({
			min: 1e12,
			picks: { [f.step.key]: last.planet.planet_natural_id },
		});
		const s = base(small, "C").findings.find((x) => x.kind === "location");
		expect(s).toBeDefined();
		expect(s!.kind === "location" && s!.picked).toBe(true);
		expect(
			base(check({ min: 1e12 }), "C").findings.some((x) => x.kind === "location")
		).toBe(false);

		const strict = check({ payback: 0.001 });
		expect(
			base(strict, "C").findings.some((x) => x.kind === "location")
		).toBe(false);
		// a pick stays, even over the limit
		const kept = check({
			payback: 0.001,
			picks: { [f.step.key]: last.planet.planet_natural_id },
		});
		const k = base(kept, "C").findings.find(
			(x): x is ICheckLocationFinding => x.kind === "location"
		)!;
		expect(k.option.slow).toBe(true);
		expect(k.suggested).toBeNull();
	});

	it("shows setup gains by the formulas, hidden without setup (AC 13)", () => {
		const r = check();
		const lux = base(r, "B").findings.find(
			(f) => f.kind === "setup" && f.setup === "lux"
		)!;
		if (lux.kind !== "setup" || lux.setup !== "lux") throw new Error("kind");
		const w = PLANS[1].result.workforce;
		const cost = (["pioneer", "settler", "technician", "engineer", "scientist"] as const)
			.filter((t) => w[t].required > 0)
			.reduce(
				(s, t) =>
					s +
					w[t].required *
						(workerUpkeep(ctx, t, true, true) - workerUpkeep(ctx, t, false, false)),
				0
			);
		expect(lux.cost).toBeCloseTo(cost, 6);
		// essentials to both: every workforce factor × 12/11 × 15/13
		const gain = base(r, "B").steps.reduce(
			(s, x) => s + Math.max(x.margin, 0) * ((12 / 11) * (15 / 13) - 1),
			0
		);
		expect(lux.gain).toBeCloseTo(gain, 6);
		expect(lux.delta).toBeCloseTo(gain - cost, 6);
		expect(lux.lux).toBe("none");

		const experts = base(r, "B").findings.find(
			(f) => f.kind === "setup" && f.setup === "experts"
		)!;
		if (experts.kind !== "setup" || experts.setup !== "experts") throw new Error("kind");
		expect(experts.experts.Agriculture).toBe(5);
		expect(experts.experts.Resource_Extraction).toBe(1);
		expect(base(r, "A").findings.some((f) => f.kind === "setup")).toBe(false);

		const hidden = check({ setup: false });
		expect(hidden.findings.some((f) => f.kind === "setup")).toBe(false);
		expect(hidden.totals.setupGain).toBe(0);
		expect(r.totals.setupGain).toBeCloseTo(
			r.findings.filter((f) => f.kind === "setup").reduce((s, f) => s + f.delta, 0),
			6
		);
	});

	it("hides small findings, keeps fixes; a base without findings looks optimal (AC 14)", () => {
		const r = check({ min: 1e12 });
		expect(r.findings.every((f) => f.kind === "fix")).toBe(true);
		expect(base(r, "A").verdict).toBe("ok");
		expect(base(r, "D").verdict).toBe("ok");
		expect(r.totals.optimal).toBe(2);
		const some = check({ min: 200 });
		expect(
			some.findings.every((f) => f.kind === "fix" || Math.abs(f.delta) >= 200)
		).toBe(true);
	});

	it("counts the best alternative per step in a base's gain (AC 15)", () => {
		const r = check();
		for (const b of r.bases) {
			const best = new Map<string, number>();
			let sum = 0;
			for (const f of b.findings)
				if (f.step && f.kind !== "fix")
					best.set(f.step.key, Math.max(best.get(f.step.key) ?? 0, f.delta));
				else sum += f.delta;
			for (const v of best.values()) sum += v;
			expect(b.gain).toBeCloseTo(sum, 6);
		}
		expect(r.totals.gain).toBeCloseTo(
			r.bases.reduce((s, b) => s + b.gain, 0),
			6
		);
		expect(r.totals.profit).toBeCloseTo(
			PLANS.reduce((s, p) => s + p.profit, 0),
			6
		);
	});

	it("opens a finding in the planner with the chain's bases and the change (AC 16)", () => {
		const r = check();
		const move = base(r, "C").findings.find(
			(x): x is ICheckLocationFinding => x.kind === "location"
		)!;
		const input = tryInPlanner(r, move)!;
		expect(input.targets[0].ticker).toBe("RAT");
		expect(input.targets[0].perDay).toBeCloseTo(r.net.RAT, 6);
		const names = input.bases.map((b) => b.name);
		expect(names).toEqual(expect.arrayContaining(["Plan B", "Plan C", "Plan D"]));
		const b = input.bases.find((x) => x.name === "Plan B")!;
		expect(b.planetId).toBe(FARM_PLANET);
		expect(b.cogc).toBe("none");
		expect(b.lux).toBe("none");
		const target = input.bases.find((x) => x.id === input.baseOf.GRN)!;
		expect(target.planetId).toBe(move.option.planet.planet_natural_id);
		expect(input.recipeId.RAT).toBe(RAT);
		expect(input.source.H2O).toBe("extract");
		expect(input.source.ALG).toBe("buy");

		const fix = base(r, "B").findings.find((x) => x.kind === "fix")!;
		expect(tryInPlanner(r, fix)).toBeNull();
	});

	it("names bases and reads plan luxuries", () => {
		expect([0, 25, 26, 27, 701].map(baseLetter)).toEqual(["A", "Z", "AA", "AB", "ZZ"]);
		expect(planLux(PLANS[0].result.workforce)).toBe("both");
		expect(planLux(PLANS[1].result.workforce)).toBe("none");
	});
});
