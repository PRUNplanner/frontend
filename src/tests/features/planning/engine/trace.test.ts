import { describe, it, expect, beforeAll, vi } from "vitest";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { calculateVisitation } from "@/features/planning/engine/visitation";
import {
	createPlanTracer,
	tracePriceBook,
} from "@/features/planning/engine/trace";
import { usePlanContext } from "@/features/planning/usePlanContext";

// Types & Interfaces
import type {
	IPlanContext,
	IPlanInput,
	ITraceEntry,
} from "@/features/planning/engine/engine.types";
import type { IPriceBook, IPriceSource } from "@/features/cx/priceBook";
import type { Plan } from "@/features/api/schemas/planningData.schemas";

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

const fixtures: [string, () => Plan][] = [
	["empty", emptyPlan],
	["small", smallPlan],
	["etherwind", etherwindPlan],
	["large", largePlan],
];

/** FRM on a fertile planet with HQ, COGC, an expert and a faction */
function farmPlan(): IPlanInput {
	const plan = etherwindPlan();
	plan.plan_corphq = true;
	plan.plan_cogc = "AGRICULTURE";
	plan.plan_data.experts = [{ type: "Agriculture", amount: 2 }];
	plan.plan_data.buildings = [
		{
			name: "FRM",
			amount: 2,
			active_recipes: [
				{ recipeid: "FRM#1xH2O=>12xNUT", amount: 1 },
				{ recipeid: "FRM#1xH2O=>4xGRN", amount: 2 },
			],
		},
	];
	return {
		plan,
		empire: {
			empire_faction: "HORTUS",
			empire_permits_used: 2,
			empire_permits_total: 4,
			uuid: "00000000-0000-4000-8000-000000000000",
			empire_name: "Test",
		},
		cxUuid: undefined,
	};
}

function fakeBook(price: number, level: IPriceSource["level"]): IPriceBook {
	return {
		getPrice: () => price,
		getPriceSource: () => ({
			level,
			exchange: null,
			key: null,
			zero: price === 0,
			volume: "UNIVERSE",
		}),
	};
}

describe("plan tracer", () => {
	let ctx: IPlanContext;

	beforeAll(async () => {
		await setupPlanningTestData();
		const { loadGameData, createContext } = usePlanContext();
		ctx = await createContext(await loadGameData(), "KW-688c", undefined);
	});

	it("nests steps in groups", () => {
		const { tracer, entries } = createPlanTracer();
		tracer.step({ phase: "input", label: "a" });
		const value = tracer.group("production", "g", undefined, () => {
			tracer.step({ phase: "production", label: "b", level: "warn" });
			return 42;
		});
		tracer.step({ phase: "finance", label: "c" });

		expect(value).toBe(42);
		expect(
			entries().map(({ id, parent, label, level }) => ({
				id,
				parent,
				label,
				level,
			}))
		).toStrictEqual([
			{ id: 0, parent: null, label: "a", level: "info" },
			{ id: 1, parent: null, label: "g", level: "info" },
			{ id: 2, parent: 1, label: "b", level: "warn" },
			{ id: 3, parent: null, label: "c", level: "info" },
		]);
	});

	it("stops at the limit and marks the trace truncated", () => {
		const { tracer, entries, truncated } = createPlanTracer({ limit: 2 });
		tracer.group("production", "g", undefined, () => {
			tracer.step({ phase: "production", label: "a" });
			tracer.step({ phase: "production", label: "b" });
		});

		expect(entries()).toHaveLength(2);
		expect(truncated()).toBe(true);
	});

	it("tracePriceBook records the first lookup with its source", () => {
		const { tracer, entries } = createPlanTracer();
		const book = tracePriceBook(ctx.prices, tracer);

		const price = book.getPrice("RAT", "BUY");
		book.getPrice("RAT", "BUY");
		book.getPrice("RAT", "BUY");

		expect(price).toBe(ctx.prices.getPrice("RAT", "BUY"));
		expect(book.getPriceSource).toBe(ctx.prices.getPriceSource);
		expect(entries()).toHaveLength(1);
		expect(entries()[0]).toMatchObject({
			phase: "prices",
			label: "RAT BUY",
			value: price,
			level: "info",
			inputs: { level: "fallback", exchange: "UNIVERSE", uses: 3 },
		});
	});

	it.each([
		["unresolved", 0, "unresolved", "no price found"],
		["0", 0, "fallback", "price is 0"],
	] as const)(
		"tracePriceBook warns on %s prices",
		(_, price, level, note) => {
			const { tracer, entries } = createPlanTracer();
			tracePriceBook(fakeBook(price, level), tracer).getPrice(
				"X",
				"SELL"
			);

			expect(entries()[0]).toMatchObject({ level: "warn", note });
		}
	);

	it.each(fixtures)(
		"traced and untraced results are deep-equal (%s)",
		(_, planFactory) => {
			const input = {
				plan: planFactory(),
				empire: undefined,
				cxUuid: undefined,
			};
			const { tracer, entries } = createPlanTracer();

			const traced = calculatePlan(input, { ...ctx, trace: tracer });

			expect(traced).toStrictEqual(calculatePlan(input, ctx));
			if (input.plan.plan_data.buildings.length)
				expect(entries().length).toBeGreaterThan(0);
		}
	);

	it("does not trace the prices of recipe options", () => {
		const prices = (recipeOptions: boolean) => {
			const { tracer, entries } = createPlanTracer();
			calculatePlan(
				{ ...farmPlan(), recipeOptions },
				{ ...ctx, trace: tracer }
			);
			return entries()
				.filter((e) => e.phase === "prices")
				.map((e) => [e.label, e.inputs?.uses]);
		};

		expect(prices(true)).toEqual(prices(false));
	});

	it("traces every phase of a plan in engine order", () => {
		const { tracer, entries } = createPlanTracer();
		calculatePlan(farmPlan(), { ...ctx, trace: tracer });

		const phases = [...new Set(entries().map((e) => e.phase))];
		expect(phases).toEqual(
			expect.arrayContaining([
				"input",
				"workforce",
				"area",
				"experts",
				"production",
				"cogm",
				"materialio",
				"prices",
				"construction",
				"finance",
			])
		);
		expect(entries()[0].phase).toBe("input");
		expect(
			entries()
				.filter((e) => e.phase === "finance")
				.at(-1)?.label
		).toBe("ROI");
	});

	it("lists efficiency factors, recipe times and runs per day (FRM)", () => {
		const { tracer, entries } = createPlanTracer();
		const fertile = { ...ctx.planet, fertility: 0.5 };
		const { result } = calculatePlan(farmPlan(), {
			...ctx,
			planet: fertile,
			trace: tracer,
		});
		const frm = result.production.buildings[0];

		const group = entries().find((e) => e.label === "FRM × 2");
		const inGroup = (e: ITraceEntry) =>
			e.parent === group?.id && e.phase === "production";
		const steps = entries().filter(inGroup);
		const value = (label: string) =>
			steps.find((e) => e.label === label)?.value;

		expect(steps.map((e) => e.label)).toMatchSnapshot();
		for (const e of frm.efficiencyElements)
			expect(value(`efficiency ${e.efficiencyType}`)).toBe(e.value);
		expect(frm.efficiencyElements.map((e) => e.efficiencyType)).toEqual([
			"FERTILITY",
			"HQ",
			"COGC",
			"EXPERT",
			"WORKFORCE",
			"FACTION",
		]);
		expect(value("total efficiency")).toBe(frm.totalEfficiency);
		expect(value("total batch time")).toBe(frm.totalBatchTime);
		for (const ar of frm.activeRecipes) {
			expect(value(`${ar.recipeId} time`)).toBe(ar.time);
			expect(value(`${ar.recipeId} daily share`)).toBe(ar.dailyShare);
		}
		expect(value("runs per day")).toBe(
			(86_400_000 * frm.amount) / frm.totalBatchTime
		);
		expect(value("daily revenue")).toBe(frm.dailyRevenue);
	});

	it("explains housing, area per building and visitation", () => {
		const { tracer, entries } = createPlanTracer();
		const { result } = calculatePlan(
			{ plan: etherwindPlan(), empire: undefined, cxUuid: undefined },
			{ ...ctx, trace: tracer }
		);
		const visitation = calculateVisitation(result, tracer);
		const of = (phase: string) =>
			entries().filter((e) => e.phase === phase);
		const sum = (list: ITraceEntry[]) =>
			list.reduce((s, e) => s + (e.value as number), 0);

		const housing = of("infrastructure");
		expect(housing.length).toBeGreaterThan(0);
		expect(sum(housing)).toBe(
			Object.values(result.workforce).reduce((s, w) => s + w.capacity, 0)
		);
		expect(housing[0].label).toMatch(/^[A-Z0-9]{2,3} × \d+$/);

		const area = of("area").filter((e) => e.label.endsWith(" area"));
		expect(25 + sum(area)).toBe(result.area.areaUsed);

		const storage = of("visitation");
		expect(storage.find((e) => e.label === "storage lasts")?.value).toBe(
			visitation.storageFilled
		);
		expect(storage.find((e) => e.label === "weight in")?.value).toBe(
			visitation.dailyWeightImport
		);
		// tracing changes nothing
		expect(calculateVisitation(result)).toStrictEqual(visitation);
	});

	it("starts each building with its game data and names recipe materials", () => {
		const { tracer, entries } = createPlanTracer();
		calculatePlan(farmPlan(), { ...ctx, trace: tracer });

		expect(entries().find((e) => e.label === "building")).toMatchObject({
			value: 2,
			scope: { building: "FRM" },
			inputs: { type: "PRODUCTION", expertise: "AGRICULTURE" },
		});
		expect(
			entries().find((e) => e.label === "FRM#1xH2O=>12xNUT time")?.note
		).toMatch(/: 1×H2O → 12×NUT$/);
	});

	it("matches material I/O deltas and values", () => {
		const { tracer, entries } = createPlanTracer();
		const { result } = calculatePlan(
			{ plan: etherwindPlan(), empire: undefined, cxUuid: undefined },
			{ ...ctx, trace: tracer }
		);
		const io = entries().filter((e) => e.phase === "materialio");

		for (const m of result.materialio) {
			expect(io.find((e) => e.label === `${m.ticker} delta`)?.value).toBe(
				m.delta
			);
			expect(io.find((e) => e.label === `${m.ticker} value`)?.value).toBe(
				m.price
			);
		}
	});

	it("warns on a 0 % building, under-housed workforce and area over permits", () => {
		const input = farmPlan();
		input.plan.plan_data.infrastructure = [];
		input.plan.plan_permits_used = 0;
		input.plan.plan_data.buildings[0].amount = 100;
		const { tracer, entries } = createPlanTracer();

		calculatePlan(input, { ...ctx, trace: tracer });
		const warns = entries()
			.filter((e) => e.level === "warn")
			.map((e) => e.note);

		expect(warns).toContain("0 % efficiency: WORKFORCE");
		expect(warns).toContain("under-housed");
		expect(warns).toContain("more area than the permits allow");
	});

	it("explains a non-fertile planet", () => {
		const { tracer, entries } = createPlanTracer();
		calculatePlan(farmPlan(), {
			...ctx,
			planet: { ...ctx.planet, fertility: -1 },
			trace: tracer,
		});

		expect(
			entries().find((e) => e.label === "efficiency FERTILITY")?.note
		).toBe("planet is not fertile");
	});
});
