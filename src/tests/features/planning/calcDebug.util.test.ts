import { describe, it, expect, beforeAll, vi } from "vitest";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { createPlanTracer } from "@/features/planning/engine/trace";
import { usePlanContext } from "@/features/planning/usePlanContext";

// Util
import {
	calcDebugChecks,
	checkLine,
	extraInputs,
	fillFormula,
	traceJSON,
	traceText,
	traceTree,
} from "@/features/planning/calcDebug.util";

// Types & Interfaces
import type {
	IPlanCalculation,
	IPlanContext,
	ITraceEntry,
} from "@/features/planning/engine/engine.types";
import type { IPlanTraceRun } from "@/features/planning/usePlanCalculation.types";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { ICalcDebugMeta } from "@/features/planning/calcDebug.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import {
	emptyPlan,
	etherwindPlan,
	largePlan,
	setupPlanningTestData,
	smallPlan,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);

	return {
		usePlanetData: vi.fn(() => ({
			getPlanet: vi.fn().mockResolvedValue(planet_etherwind),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});

const meta: ICalcDebugMeta = {
	plan: "Test",
	planet: "KW-688c",
	cx: "Universe",
	empire: "none",
	version: "0.0.0",
	build: "dev",
	date: "2026-10-18T00:00:00.000Z",
};

function entry(e: Partial<ITraceEntry>): ITraceEntry {
	return {
		id: 0,
		parent: null,
		phase: "input",
		label: "x",
		level: "info",
		...e,
	};
}

describe("calcDebug.util", () => {
	let ctx: IPlanContext;

	beforeAll(async () => {
		await setupPlanningTestData();
		const { loadGameData, createContext } = usePlanContext();
		ctx = await createContext(await loadGameData(), "KW-688c", undefined);
	});

	function runs(plan: Plan = etherwindPlan()): {
		live: IPlanCalculation;
		run: IPlanTraceRun;
	} {
		const input = { plan, empire: undefined, cxUuid: undefined };
		const { tracer, entries, truncated } = createPlanTracer();
		return {
			live: calculatePlan(input, ctx),
			run: {
				calculation: calculatePlan(input, { ...ctx, trace: tracer }),
				entries: entries(),
				truncated: truncated(),
				ms: 1,
				at: 0,
			},
		};
	}

	it.each([
		["empty", emptyPlan],
		["small", smallPlan],
		["etherwind", etherwindPlan],
		["large", largePlan],
	])("every check passes on the %s fixture", (_, planFactory) => {
		const { live, run } = runs(planFactory());
		const { checks } = calcDebugChecks(live, run);

		expect(checks).toHaveLength(6);
		expect(checks.filter((c) => !c.pass)).toEqual([]);
	});

	it.each([
		[
			0,
			(c: IPlanCalculation) =>
				(c.result.production.buildings[0].amount += 1),
		],
		[1, (c: IPlanCalculation) => (c.result.materialio[0].price += 1)],
		[2, (c: IPlanCalculation) => (c.result.profit += 1)],
		[3, (c: IPlanCalculation) => (c.overview.profit += 1)],
		[4, (c: IPlanCalculation) => (c.result.materialio[0].delta += 1)],
		[
			5,
			(c: IPlanCalculation) =>
				(c.result.production.buildings[0].totalEfficiency *= 1.01),
		],
		[
			5,
			(c: IPlanCalculation) =>
				(c.result.production.buildings[1].activeRecipes[0].dailyShare += 0.1),
		],
	])("check %i fails on a tampered result", (index, tamper) => {
		const { live, run } = runs();
		tamper(run.calculation);
		const check = calcDebugChecks(live, run).checks[index];

		expect(check.pass).toBe(false);
		expect(check.expected).toBeDefined();
		expect(check.actual).toBeDefined();
		expect(check.difference).not.toBe(0);
		expect(checkLine(check)).toMatch(/^✗ .*expected .*actual .*difference/);
	});

	it("names the first differing path and the failing ticker", () => {
		const { live, run } = runs();
		run.calculation.result.area.areaUsed += 5;
		expect(calcDebugChecks(live, run).checks[0]).toMatchObject({
			detail: "result.area.areaUsed",
			difference: 5,
		});

		const other = runs();
		const ticker = other.run.calculation.result.materialio[0].ticker;
		other.run.calculation.result.materialio[0].delta += 1;
		expect(calcDebugChecks(other.live, other.run).checks[4].detail).toBe(
			ticker
		);
	});

	it("reports a structural difference without a number difference", () => {
		const { live, run } = runs();
		run.calculation.result.materialio.pop();

		expect(calcDebugChecks(live, run).checks[0]).toMatchObject({
			pass: false,
			difference: undefined,
		});
	});

	it("lists warn entries and a truncated trace as warnings", () => {
		const { live, run } = runs(emptyPlan());
		run.entries = [
			entry({ level: "warn", label: "RAT BUY", note: "price is 0" }),
			entry({ level: "warn", label: "plain" }),
		];
		run.truncated = true;

		expect(calcDebugChecks(live, run).warnings).toEqual([
			"RAT BUY: price is 0",
			"plain",
			"trace truncated at 2 steps",
		]);
	});

	it("traceTree nests entries in their phase and lifts other phases", () => {
		const tree = traceTree([
			entry({ id: 0, phase: "production", label: "FRM × 1" }),
			entry({ id: 1, parent: 0, phase: "production", label: "time" }),
			entry({ id: 2, parent: 0, phase: "cogm", label: "COGM" }),
			entry({ id: 3, parent: 2, phase: "prices", label: "H2O BUY" }),
		]);

		expect(tree.production).toHaveLength(1);
		expect(tree.production[0].children.map((n) => n.entry.label)).toEqual([
			"time",
		]);
		expect(tree.cogm.map((n) => n.entry.label)).toEqual(["COGM"]);
		expect(tree.prices.map((n) => n.entry.label)).toEqual(["H2O BUY"]);
		expect(tree.finance).toEqual([]);
	});

	it("fills formulas and lists the other inputs", () => {
		const e = entry({
			formula: "time_ms × amount ÷ efficiency",
			inputs: {
				time_ms: 1_620_000,
				amount: 2,
				efficiency: 1.07432,
				x: "y",
			},
		});

		expect(fillFormula(e)).toBe("1,620,000 × 2 ÷ 1.0743");
		expect(extraInputs(e)).toBe("x y");
		expect(fillFormula(entry({}))).toBeUndefined();
		expect(fillFormula(entry({ formula: "a + b" }))).toBe("a + b");
		expect(extraInputs(entry({}))).toBeUndefined();
	});

	it("copies as text with header, checks and phases, and as JSON", () => {
		const { live, run } = runs();
		const report = calcDebugChecks(live, run);
		const plan = etherwindPlan();
		const text = traceText(meta, report, run.entries, plan);

		expect(text).toContain("plan: Test");
		expect(text).toContain("build: dev");
		expect(text).toContain("✓ overview profit = profit");
		expect(text).toMatch(/\nworkforce\n/);
		expect(text).toMatch(/\nfinance\n/);
		expect(text).toContain("min(1, capacity ÷ required) =");
		expect(text).toContain("    Σ habitations × amount\n");

		expect(text).toMatch(/\nplan\n {2}\{\n/);
		expect(text).toContain(
			`  "planet_natural_id": "${plan.planet_natural_id}"`
		);

		const json = JSON.parse(traceJSON(meta, report, run.entries, plan));
		expect(json.plan).toEqual(plan);
		expect(json.meta).toEqual(meta);
		expect(json.checks).toHaveLength(6);
		expect(json.warnings).toEqual(report.warnings);
		expect(json.entries).toHaveLength(run.entries.length);
	});

	it("marks warn entries and notes in the text", () => {
		const text = traceText(meta, { checks: [], warnings: ["w"] }, [
			entry({
				level: "warn",
				label: "RAT BUY",
				value: 0,
				note: "price is 0",
			}),
		]);

		expect(text).toContain("  ⚠ w");
		expect(text).toContain("  ⚠ RAT BUY = 0");
		expect(text).toContain("    price is 0");
	});
});
