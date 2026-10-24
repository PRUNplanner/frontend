import { describe, it, expect } from "vitest";

import {
	findingText,
	optionChips,
	optionDimmed,
	planetSearchQuery,
	planetShort,
	programName,
	signedMoney,
} from "@/features/production_chain/chainCheck.util";
import {
	fixtureCheck,
	fixtureWithRigs,
} from "@/tests/features/production_chain/chain.fixtures";

import type {
	ICheckFinding,
	ICheckLocationFinding,
	ICheckOption,
} from "@/features/production_chain/engine/chainCheck.types";

/** the key and its values, so texts can be checked without messages */
const t = (key: string, named: Record<string, unknown> = {}) =>
	`${key.replace("production_chains.check.", "")}${JSON.stringify(named)}`;

const result = fixtureCheck();
const base = (id: string) => result.bases.find((b) => b.id === id)!;
const nameOf = (id: string) => `Plan ${id}`;
const move = result.findings.find(
	(f): f is ICheckLocationFinding => f.kind === "location" && f.base === "C"
)!;
const text = (f: ICheckFinding) => findingText(t, f, base(f.base), nameOf);

describe("finding texts", () => {
	it("words plan fixes both ways", () => {
		const [lost] = base("C").findings.filter((f) => f.kind === "fix");
		expect(text(lost).title).toMatch(/^finding\.fix_lost/);
		expect(text(lost).detail).toContain('"pct":"20 %"');
		const [missed] = base("B").findings.filter((f) => f.kind === "fix");
		expect(text(missed).title).toMatch(/^finding\.fix_missed/);
		expect(text(missed).detail).toContain('"pct":"25 %"');
	});

	it("words recipes, buying and setup", () => {
		const step = move.step;
		const recipe = {
			...move,
			kind: "recipe" as const,
			recipe: step.recipe,
			now: 10,
			alt: 8,
			need: 2.5,
			extra: 1,
		};
		expect(text(recipe).detail).toContain("finding.recipe_extra");
		expect(text({ ...recipe, extra: 0 }).detail).not.toContain("recipe_extra");

		const buy = {
			...move,
			kind: "buy" as const,
			cost: 20,
			price: 10,
			market: { sharePct: null, level: "red" as const, exchange: "AI1" },
		};
		expect(text(buy).detail).toContain("finding.buy_no_trades");
		expect(
			text({ ...buy, market: { ...buy.market, sharePct: 12 } }).detail
		).toContain('"share":"12 %"');

		const lux = base("B").findings.find(
			(f) => f.kind === "setup" && f.setup === "lux"
		)!;
		expect(text(lux).title).toMatch(/^finding\.lux/);
		const experts = base("B").findings.find(
			(f) => f.kind === "setup" && f.setup === "experts"
		)!;
		// none now
		expect(text(experts).detail).toContain("bases.none");
	});

	it("words moves: own base, new base, pick, better options", () => {
		const own = move.options.find((o) => o.own)!;
		expect(text({ ...move, option: own }).title).toContain("move_own");
		const fresh = move.options.find((o) => !o.own)!;
		expect(text({ ...move, option: fresh, picked: true }).detail).toMatch(
			/^finding\.move_picked/
		);
		expect(
			text({ ...move, better: [fresh] }).detail
		).toContain("move_better_one");
		expect(
			text({ ...move, better: [fresh, own] }).detail
		).toContain('move_better_many{"n":2}');
		// a farm: fertility here and there
		expect(text(move).detail).toContain("why_fertility");
	});

	it("words an extraction step's rate", () => {
		const rigs = fixtureCheck({ plans: fixtureWithRigs() });
		const rig = rigs.findings.find(
			(f): f is ICheckLocationFinding =>
				f.kind === "location" && f.step.extraction
		)!;
		expect(
			findingText(t, rig, rigs.bases.find((b) => b.id === rig.base)!, nameOf)
				.detail
		).toContain("why_rate");
		expect(planetSearchQuery(rig)).toEqual({ m: `any:${rig.step.ticker}` });
	});

	it("links Planet Search by resource, fertility or program", () => {
		expect(planetSearchQuery(move)).toEqual({ fert: "1" });
		const fp = { ...move, step: { ...move.step, building: "FP" } };
		expect(planetSearchQuery({ ...fp, expertise: "FOOD_INDUSTRIES" })).toEqual(
			{ cogc: "ADVERTISING_FOOD_INDUSTRIES" }
		);
		expect(planetSearchQuery({ ...fp, expertise: null })).toEqual({});
	});
});

describe("option chips", () => {
	const option = (o: Partial<ICheckOption>): ICheckOption => ({
		...move.options.find((x) => !x.own)!,
		...o,
	});
	const labels = (o: ICheckOption, f = move) =>
		optionChips(t, f, o, 100).map((c) => c.label.replace(/\{.*/, ""));

	it("names base, plots, room, payback and the choice", () => {
		expect(labels(option({ own: "B" }))).toContain("options.your_base");
		expect(labels(option({ full: true }))).toContain("options.full");
		expect(labels(option({ ghostOnly: true }))).toContain("options.ghost");
		expect(
			labels(option({ plots: { free: 3, total: 10, ghost: false } }))
		).toContain("options.plots");
		expect(labels(option({ plots: null }))).toContain(
			"options.plots_unknown"
		);
		expect(labels(option({ fits: false, slow: true }))).toEqual(
			expect.arrayContaining(["options.no_room", "options.slow"])
		);
		expect(labels(move.option)).toContain("options.suggested");
		expect(labels(move.option, { ...move, picked: true })).toContain(
			"options.picked"
		);
		expect(optionDimmed(option({ full: true }))).toBe(true);
		expect(
			optionDimmed(option({ full: false, fits: true, slow: false }))
		).toBe(false);
	});

	it("formats names and money", () => {
		expect(programName(t, "---")).toMatch(/^finding\.no_program/);
		expect(programName(t, "AGRICULTURE")).toContain("ADVERTISING_AGRICULTURE");
		expect(planetShort(null, "XX-000a")).toBe("XX-000a");
		expect(planetShort(move.option.planet)).toBe(
			move.option.planet.planet_name || move.option.planet.planet_natural_id
		);
		expect(signedMoney(t, 5)).toMatch(/^\+/);
		expect(signedMoney(t, -5)).not.toMatch(/^\+/);
	});
});
