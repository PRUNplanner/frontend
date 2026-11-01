import { describe, expect, it } from "vitest";

// Unit
import {
	bufferStock,
	calculateMetrics,
	filterRows,
	hqStepCost,
	matchesSearch,
	rampBreakEven,
	volatilityScenarios,
} from "@/features/base_roi/baseROIMetrics";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";

// Test Data
import knottly from "@/tests/features/base_roi/knottly_ai1_rows.json";

// Types & Interfaces
import type { IPriceSource } from "@/features/cx/priceBook";
import type {
	IBaseROIMaterial,
	IBaseROIRow,
	IBaseROIRowInput,
} from "@/features/base_roi/baseROI.types";

const source = (
	key: IPriceSource["key"],
	exchange: IPriceSource["exchange"] = "AI1"
): IPriceSource => ({
	level: "empire_exchange",
	exchange,
	key,
	zero: false,
	volume: "AI1",
});

function rowInput(overrides: Partial<IBaseROIRowInput> = {}): IBaseROIRowInput {
	return {
		key: "x",
		kind: "recipe",
		building: "CHP",
		expertise: "CHEMISTRY",
		recipeId: "r",
		planetNaturalId: null,
		planetName: null,
		jumps: null,
		productionBuildings: 16,
		infrastructure: {} as IBaseROIRowInput["infrastructure"],
		storageAdded: { STO: 0, STA: 0 },
		areaUsed: 478,
		areaTotal: 500,
		revenue: 1000,
		inputs: 400,
		consumables: 100,
		degradation: 50,
		construction: 10_000,
		planetCOGC: null,
		environment: 0,
		environmentMaterials: [],
		buildingCosts: [],
		weightIn: 100,
		weightOut: 50,
		volumeIn: 20,
		volumeOut: 10,
		storageWeight: 6500,
		storageVolume: 6500,
		expertBonus: 0.284,
		materials: [],
		outputs: [{ ticker: "IND", amount: 10, traded: 20 }],
		recipeInputs: [],
		workforce: [],
		result: {} as IBaseROIRowInput["result"],
		...overrides,
	};
}

const within = (actual: number, expected: number, share = 0.005) =>
	expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
		Math.abs(expected) * share
	);

describe("baseROIMetrics", () => {
	describe("Knottly's AI1 rows (criterion 4)", () => {
		const { settings } = knottly;
		const price = (t: string) =>
			(knottly.hqPrices as Record<string, number>)[t] ?? 0;

		it.each(knottly.rows.map((r) => [r.kind, r] as const))(
			"%s reproduces his numbers within 0.5%%",
			(_kind, k) => {
				const hq = hqStepCost(settings.targetPermit, price);
				const metrics = calculateMetrics(
					rowInput({
						revenue: k.revenue,
						inputs: k.inputs,
						consumables: k.consumables,
						degradation: k.repair,
						// his total has ships for an 8 h round trip, which
						// we dropped: they ride on the construction here
						construction: k.construction + k.expected.shipCost,
						weightIn: k.maxWeight,
						volumeIn: k.maxVolume,
						weightOut: 0,
						volumeOut: 0,
						productionBuildings: k.productionBuildings,
					}),
					{
						...defaultBaseROISettings(),
						bufferDays: 9,
						targetPermit: 10,
						logistics: "ship",
						ship: "WCB",
					},
					hq
				);

				within(metrics.bufferStock, k.expected.buffer);
				within(metrics.hqCost, k.expected.hq);
				within(metrics.buildingCost, k.expected.total);
				within(metrics.dailyProfit, k.expected.profit);
				within(metrics.weeklyReturn, k.expected.weekly);
				within(metrics.breakEven, k.expected.breakEven);
			}
		);

		it("covers a row that loses money at 0 experts", () => {
			const loss = knottly.rows.find((r) => r.kind === "loss_at_0")!;
			const { timeline } = rampBreakEven(
				loss.expected.total,
				loss.revenue - loss.inputs,
				loss.consumables + loss.repair,
				loss.productionBuildings
			);
			expect(timeline[0].dailyProfit).toBeLessThan(0);
		});
	});

	it("HQ step: off below 3 permits, level N − 1 from there", () => {
		expect(hqStepCost(0, () => 1)).toBe(0);
		expect(hqStepCost(2, () => 1)).toBe(0);
		// level 2: 6 BBH, 4 BDE, 4 BSE, 2 BTA, 12 MCG, 4 TRU
		expect(hqStepCost(3, () => 1)).toBe(32);
	});

	it("buffer stock is days × (inputs + consumables + revenue) ÷ 2", () => {
		expect(bufferStock(9, 100, 50, 450)).toBe(2700);
		expect(bufferStock(0, 100, 50, 450)).toBe(0);
	});

	it("fixed experts: break-even = building cost ÷ daily profit (criterion 8)", () => {
		const m = calculateMetrics(
			rowInput(),
			{ ...defaultBaseROISettings(), experts: 3, bufferDays: 0 },
			0
		);
		expect(m.dailyProfit).toBe(450);
		expect(m.breakEven).toBeCloseTo(10_000 / 450);
		expect(m.timeline).toEqual([]);
	});

	it("ramp: break-even ≥ the 5-expert payback, never without profit (criterion 9)", () => {
		const settings = { ...defaultBaseROISettings(), bufferDays: 0 };
		const m = calculateMetrics(rowInput(), settings, 0);
		expect(m.breakEven).toBeGreaterThanOrEqual(m.payback);
		expect(m.timeline[0].experts).toBe(0);

		const losing = calculateMetrics(
			rowInput({ revenue: 500 }),
			settings,
			0
		);
		expect(losing.dailyProfit).toBeLessThanOrEqual(0);
		expect(losing.breakEven).toBe(Infinity);
	});

	it("ramp stages last EXPERT_STAGE_DAYS ÷ production buildings", () => {
		const { timeline } = rampBreakEven(1e12, 1000, 0, 10);
		expect(timeline.map((s) => s.days)).toEqual([
			1,
			1.25,
			5.757,
			27.65,
			91.51,
			Infinity,
		]);
	});

	it("building cost is construction + buffer + HQ, no ships", () => {
		const m = calculateMetrics(
			rowInput({
				construction: 1000,
				inputs: 10,
				consumables: 0,
				revenue: 30,
			}),
			{ ...defaultBaseROISettings(), bufferDays: 2 },
			500
		);
		// buffer 2 × (10 + 0 + 30) ÷ 2 = 40
		expect(m.buildingCost).toBe(1000 + 40 + 500);
	});

	it("logistics: cargo × days between visits fits the ship, manual per day", () => {
		const row = rowInput({ weightIn: 700, volumeIn: 100 });
		// LCB 2000 t: 3 days × 700 t is too much, 2 days fit
		const s = { ...defaultBaseROISettings(), ship: "LCB" as const };
		expect(calculateMetrics(row, s, 0).fitsLogistics).toBe(false);
		expect(
			calculateMetrics(row, { ...s, visitDays: 2 }, 0).fitsLogistics
		).toBe(true);
		expect(
			calculateMetrics(row, { ...s, logistics: "manual" }, 0)
				.fitsLogistics
		).toBe(false);
		expect(
			calculateMetrics(row, { ...s, logistics: "none" }, 0).fitsLogistics
		).toBe(true);
	});

	it("market capacity is the lowest output's traded ÷ produced", () => {
		const m = calculateMetrics(
			rowInput({
				outputs: [
					{ ticker: "A", amount: 10, traded: 50 },
					{ ticker: "B", amount: 10, traded: 5 },
				],
			}),
			defaultBaseROISettings(),
			0
		);
		expect(m.marketCapacity).toBe(0.5);
	});

	it("double ended: a recipe input with less traded volume sets it, marked input", () => {
		const outputs = [{ ticker: "A", amount: 10, traded: 50 }];
		const input = calculateMetrics(
			rowInput({
				outputs,
				recipeInputs: [
					{ ticker: "X", amount: 20, traded: 4 },
					{ ticker: "Y", amount: 0, traded: 0 },
				],
			}),
			defaultBaseROISettings(),
			0
		);
		expect(input.marketCapacity).toBe(0.2);
		expect(input.capacitySide).toBe("input");
		expect(input.capacityTicker).toBe("X");

		const output = calculateMetrics(
			rowInput({
				outputs,
				recipeInputs: [{ ticker: "X", amount: 1, traded: 100 }],
			}),
			defaultBaseROISettings(),
			0
		);
		expect(output.capacitySide).toBe("output");
		expect(output.capacityTicker).toBe("A");

		// no outputs: 0 and no side, as before
		const none = calculateMetrics(
			rowInput({ outputs: [], recipeInputs: [] }),
			defaultBaseROISettings(),
			0
		);
		expect(none.marketCapacity).toBe(0);
		expect(none.capacitySide).toBeNull();
	});

	describe("volatility (criterion 11)", () => {
		const material = (
			o: Partial<IBaseROIMaterial> & Pick<IBaseROIMaterial, "ticker">
		): IBaseROIMaterial => ({
			amount: -10,
			price: 100,
			source: source("vwap_7d"),
			bid: 95,
			ask: 105,
			...o,
		});

		it("no scenario within 30% or for ASK/BID or fixed prices", () => {
			expect(
				volatilityScenarios(
					[
						material({ ticker: "A" }),
						material({
							ticker: "B",
							source: source("ask"),
							bid: 10,
						}),
						material({
							ticker: "C",
							source: { ...source(null), exchange: null },
							bid: 10,
						}),
					],
					1000
				)
			).toEqual([]);
		});

		it("matches a hand-computed case", () => {
			// sells 10 IND at 7451.76, bid 4060; buys 5 CU at 1000, ask 1400
			const scenarios = volatilityScenarios(
				[
					material({
						ticker: "IND",
						amount: 10,
						price: 7451.76,
						bid: 4060,
						ask: 7500,
					}),
					material({
						ticker: "CU",
						amount: -5,
						price: 1000,
						bid: 990,
						ask: 1400,
					}),
				],
				50_000
			);
			// IND bid alone, CU ask alone, both
			expect(scenarios).toHaveLength(3);
			expect(scenarios[0].dailyProfit).toBeCloseTo(
				50_000 + 10 * (4060 - 7451.76) - 5 * (1400 - 1000)
			);
			expect(scenarios[2].dailyProfit).toBeCloseTo(50_000 - 2000);
		});

		it("over 100 combinations: all taker and all maker", () => {
			const many = Array.from({ length: 5 }, (_, i) =>
				material({ ticker: `M${i}`, bid: 50, ask: 150 })
			);
			const scenarios = volatilityScenarios(many, 1000);
			expect(scenarios).toHaveLength(2);
			// buys at ask: 5 × −10 × 50 = −2500
			expect(scenarios[0].dailyProfit).toBe(-1500);
			expect(scenarios[1].dailyProfit).toBe(3500);
		});
	});

	it("filterRows hides per limit, once each, sorted by break-even (criterion 10)", () => {
		const s = defaultBaseROISettings();
		const row = (key: string, o: Partial<IBaseROIRow["metrics"]>) =>
			({
				...rowInput({ key }),
				metrics: {
					...calculateMetrics(rowInput(), s, 0),
					...o,
				},
			}) as IBaseROIRow;
		const { rows, hidden } = filterRows(
			[
				row("slow", { breakEven: 40 }),
				row("fast", { breakEven: 10 }),
				row("ship", { fitsLogistics: false, dailyProfit: -1 }),
				row("market", { marketCapacity: 0.1 }),
				row("loss", { dailyProfit: -5 }),
			],
			[{ kind: "resource", building: "EXT", expertise: null }],
			s
		);
		expect(rows.map((r) => r.key)).toEqual(["fast", "slow"]);
		expect(hidden).toEqual({
			maxJumps: 1,
			logistics: 1,
			marketCapacity: 1,
			noPlots: 0,
			unstaffed: 0,
			negative: 1,
		});
		expect(
			filterRows([row("loss", { dailyProfit: -5 })], [], {
				...s,
				showNegative: true,
			}).rows
		).toHaveLength(1);
	});

	it("row kind filters, not counted as hidden", () => {
		const s = { ...defaultBaseROISettings(), logistics: "none" as const };
		const row = (key: string, o: Partial<IBaseROIRow>) =>
			({
				...rowInput({ key, ...o }),
				metrics: calculateMetrics(rowInput(), s, 0),
			}) as IBaseROIRow;
		const rows = [
			row("chp", {}),
			row("ext", {
				kind: "resource",
				building: "EXT",
				expertise: "RESOURCE_EXTRACTION",
			}),
		];
		const shown = (f: Partial<typeof s>) =>
			filterRows(rows, [], { ...s, ...f }).rows.map((r) => r.key);
		expect(shown({ showRecipes: false })).toEqual(["ext"]);
		expect(shown({ showResources: false })).toEqual(["chp"]);
		expect(
			filterRows(rows, [], { ...s, showRecipes: false }).hidden
		).toEqual({
			maxJumps: 0,
			logistics: 0,
			marketCapacity: 0,
			noPlots: 0,
			unstaffed: 0,
			negative: 0,
		});
	});

	it("search matches industry, building and product, any case", () => {
		const row = rowInput({
			building: "EXT",
			expertise: "RESOURCE_EXTRACTION",
			outputs: [{ ticker: "GAL", amount: 1, traded: 1 }],
		});
		expect(matchesSearch(row, "")).toBe(true);
		expect(matchesSearch(row, "  ")).toBe(true);
		expect(matchesSearch(row, "resource extraction")).toBe(true);
		expect(matchesSearch(row, "RESOURCE_EXT")).toBe(true);
		expect(matchesSearch(row, "ext")).toBe(true);
		expect(matchesSearch(row, " gal ")).toBe(true);
		expect(matchesSearch(row, "chem")).toBe(false);
		expect(
			matchesSearch({ ...row, expertise: null, outputs: [] }, "res")
		).toBe(false);
	});

	it("edge cases: manual limit met, no outputs, zero output, free base, unknown HQ level", () => {
		const s = defaultBaseROISettings();
		expect(
			calculateMetrics(
				rowInput({ weightIn: 10, volumeIn: 10 }),
				{ ...s, logistics: "manual" },
				0
			).fitsLogistics
		).toBe(true);
		expect(
			calculateMetrics(rowInput({ outputs: [] }), s, 0).marketCapacity
		).toBe(0);
		expect(
			calculateMetrics(
				rowInput({ outputs: [{ ticker: "A", amount: 0, traded: 5 }] }),
				s,
				0
			).marketCapacity
		).toBe(Infinity);
		expect(
			calculateMetrics(
				rowInput({
					construction: 0,
					revenue: 0,
					inputs: 0,
					consumables: 0,
					degradation: 0,
				}),
				{ ...s, bufferDays: 0 },
				0
			).weeklyReturn
		).toBe(0);
		expect(hqStepCost(99, () => 1)).toBe(0);
	});
});
