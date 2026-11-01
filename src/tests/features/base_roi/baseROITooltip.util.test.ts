import { describe, expect, it } from "vitest";

// Unit
import { cellMath } from "@/features/base_roi/baseROITooltip.util";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";

// Types & Interfaces
import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";
import type {
	IBaseROIMetrics,
	IBaseROIRow,
} from "@/features/base_roi/baseROI.types";

const t = (key: string, named: Record<string, unknown> = {}) =>
	Object.keys(named).length ? `${key}${JSON.stringify(named)}` : key;
const k = (key: string) => `base_roi.tooltips.math.${key}`;

function row(metrics: Partial<IBaseROIMetrics> = {}): IBaseROIRow {
	return {
		revenue: 1000,
		inputs: 400,
		consumables: 100,
		degradation: 50,
		construction: 10_000,
		weightIn: 10,
		weightOut: 20,
		volumeIn: 5,
		volumeOut: 2,
		outputs: [
			{ ticker: "A", amount: 10, traded: 50 },
			{ ticker: "B", amount: 10, traded: 5 },
		],
		metrics: {
			dailyProfit: 450,
			runningCost: 550,
			buildingCost: 12_000,
			bufferStock: 1500,
			hqCost: 0,
			breakEven: 30,
			payback: 26.7,
			timeline: [],
			weeklyReturn: 0.2625,
			cargo: 20,
			fitsLogistics: true,
			marketCapacity: 0.5,
			scenarios: [],
			...metrics,
		},
	} as unknown as IBaseROIRow;
}
const s = (o: Partial<BaseROISettings> = {}) => ({
	...defaultBaseROISettings(),
	...o,
});
const keys = (lines: string[]) => lines.map((l) => l.split("{")[0]);

describe("baseROITooltip.util", () => {
	it("daily profit: revenue − inputs − consumables − degradation", () => {
		const lines = cellMath(row(), "daily_profit", s(), t);
		expect(keys(lines)).toEqual([
			k("revenue"),
			k("minus_inputs"),
			k("minus_consumables"),
			k("minus_degradation"),
			k("per_day"),
		]);
		expect(lines[4]).toContain('"value":"450"');
	});

	it("break-even with the ramp: the stages until paid, then the day", () => {
		const timeline = [
			{
				experts: 0,
				dailyProfit: 100,
				remaining: 12_000,
				days: 10,
				paidAfter: null,
			},
			{
				experts: 1,
				dailyProfit: 200,
				remaining: 11_000,
				days: 12,
				paidAfter: 5,
			},
			{
				experts: 2,
				dailyProfit: 300,
				remaining: 0,
				days: 50,
				paidAfter: null,
			},
		];
		const lines = cellMath(row({ timeline }), "break_even", s(), t);
		expect(keys(lines)).toEqual([
			k("cost"),
			k("stage"),
			k("stage"),
			k("paid"),
		]);
		// the paid stage counts its days until paid
		expect(lines[2]).toContain('"days":"5.0 d"');
	});

	it("break-even after the ramp, never, and with fixed experts", () => {
		const rest = [
			{
				experts: 5,
				dailyProfit: 400,
				remaining: 9000,
				days: Infinity,
				paidAfter: null,
			},
		];
		expect(
			keys(
				cellMath(
					row({ timeline: rest, breakEven: Infinity }),
					"break_even",
					s(),
					t
				)
			)
		).toEqual([k("cost"), k("stage_rest"), k("never")]);
		expect(
			keys(cellMath(row(), "break_even", s({ experts: 5 }), t))
		).toEqual([k("divide")]);
		expect(
			cellMath(
				row({ breakEven: Infinity }),
				"break_even",
				s({ experts: 5 }),
				t
			)
		).toEqual([k("never")]);
	});

	it("weekly return, building cost with HQ only when set, running cost", () => {
		expect(cellMath(row(), "weekly_return", s(), t)[0]).toContain("26.3 %");
		expect(keys(cellMath(row(), "building_cost", s(), t))).toEqual([
			k("construction"),
			k("plus_buffer"),
			k("total"),
		]);
		expect(
			keys(cellMath(row({ hqCost: 500 }), "building_cost", s(), t))
		).toContain(k("plus_hq"));
		expect(keys(cellMath(row(), "running_cost", s(), t))).toEqual([
			k("inputs"),
			k("plus_consumables"),
			k("plus_degradation"),
			k("per_day"),
		]);
	});

	it("cargo against the ship only with a ship limit", () => {
		const ship = cellMath(
			row(),
			"cargo",
			s({ ship: "WCB", visitDays: 3 }),
			t
		);
		expect(keys(ship)).toEqual([
			k("cargo_in"),
			k("cargo_out"),
			k("cargo_ship"),
		]);
		expect(ship[2]).toContain('"weight":"60"');
		expect(ship[2]).toContain('"capWeight":3000');
		expect(
			cellMath(row(), "cargo", s({ logistics: "none" }), t)
		).toHaveLength(2);
	});

	it("market capacity per output, the lowest counts; no math for the rest", () => {
		const lines = cellMath(row(), "market_capacity", s(), t);
		expect(keys(lines)).toEqual([
			k("capacity"),
			k("capacity"),
			k("lowest"),
		]);
		expect(lines[1]).toContain('"value":"0.50"');
		expect(cellMath(row(), "workforce", s(), t)).toEqual([]);
	});
});
