import { describe, expect, it } from "vitest";

// Unit
import {
	bufferStock,
	calculateMetrics,
	filterRows,
	hqStepCost,
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
						construction: k.construction,
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
						roundTripHours: 8,
						logistics: "ship",
						ship: "WCB",
					},
					hq
				);

				within(metrics.bufferStock, k.expected.buffer);
				within(metrics.hqCost, k.expected.hq);
				within(metrics.shipCost, k.expected.shipCost);
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
			1, 1.25, 5.757, 27.65, 91.51, Infinity,
		]);
	});

	it("ship cost uses the chosen ship, WCB without one", () => {
		const base = { ...defaultBaseROISettings(), roundTripHours: 24 };
		const row = rowInput({ weightIn: 1000, volumeIn: 1000 });
		// LCB 2000/2000: 0.5 ships
		expect(calculateMetrics(row, base, 0).shipsNeeded).toBe(0.5);
		// WCB 3000/1000: 1 ship
		expect(
			calculateMetrics(row, { ...base, logistics: "none" }, 0).shipsNeeded
		).toBe(1);
	});

	it("logistics: cargo × days between visits fits the ship, manual per day", () => {
		const row = rowInput({ weightIn: 700, volumeIn: 100 });
		const s = defaultBaseROISettings();
		expect(calculateMetrics(row, s, 0).fitsLogistics).toBe(false);
		expect(
			calculateMetrics(row, { ...s, visitDays: 2 }, 0).fitsLogistics
		).toBe(true);
		expect(
			calculateMetrics(row, { ...s, logistics: "manual" }, 0).fitsLogistics
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
						material({ ticker: "B", source: source("ask"), bid: 10 }),
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
					material({ ticker: "CU", amount: -5, price: 1000, bid: 990, ask: 1400 }),
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
			negative: 1,
		});
		expect(
			filterRows([row("loss", { dailyProfit: -5 })], [], {
				...s,
				showNegative: true,
			}).rows
		).toHaveLength(1);
	});
});
