import { describe, it, expect } from "vitest";

// Functions
import { calculateBaseFraction } from "@/features/raukk_sourcing/calculations/baseFraction";

// Types & Interfaces
import {
	IRaukkOutputCost,
	IRaukkSnapshot,
} from "@/features/raukk_sourcing/raukkSourcing.types";

function output(
	ticker: string,
	unitsPerDay: number,
	costPerUnit: number
): IRaukkOutputCost {
	return {
		ticker,
		unitsPerDay,
		costPerUnit,
		breakdown: {
			workforce: 0,
			repair: 0,
			inputs: costPerUnit,
			shipping: 0,
		},
	};
}

function snapshot(
	outputs: IRaukkOutputCost[],
	baseFraction?: number
): IRaukkSnapshot {
	return {
		computedAt: "2026-01-01T00:00:00.000Z",
		stale: false,
		planName: "Source",
		planetNaturalId: "OT-580b",
		outputs: Object.fromEntries(
			outputs.map((element) => [element.ticker, element])
		),
		draws: {},
		baseFraction,
	};
}

function lookup(
	snapshots: Record<string, IRaukkSnapshot>
): (planUuid: string) => IRaukkSnapshot | undefined {
	return (planUuid: string) => snapshots[planUuid];
}

describe("Raukk Base Fraction", () => {
	it("is 1 without any draws", () => {
		expect(calculateBaseFraction({}, lookup({}))).toBe(1);
	});

	it("adds half a base when half a single output source is drawn", () => {
		// the users canonical example: own base plus half of another one
		const result: number = calculateBaseFraction(
			{ source: { RAT: 50 } },
			lookup({ source: snapshot([output("RAT", 100, 5)]) })
		);

		expect(result).toBe(1.5);
	});

	it("counts a fully drawn source as a whole base", () => {
		expect(
			calculateBaseFraction(
				{ source: { RAT: 100 } },
				lookup({ source: snapshot([output("RAT", 100, 5)]) })
			)
		).toBe(2);
	});

	it("weights multi output sources by output value", () => {
		// RAT: 100 * 5 = 500, DW: 200 * 1 = 200, total 700
		// draw: 50/100 * 500/700 + 100/200 * 200/700 = 0.5
		const result: number = calculateBaseFraction(
			{ source: { RAT: 50, DW: 100 } },
			lookup({
				source: snapshot([output("RAT", 100, 5), output("DW", 200, 1)]),
			})
		);

		expect(result).toBeCloseTo(1.5, 10);
	});

	it("only charges the drawn tickers weight", () => {
		// RAT weight 500/700, fully drawn
		const result: number = calculateBaseFraction(
			{ source: { RAT: 100 } },
			lookup({
				source: snapshot([output("RAT", 100, 5), output("DW", 200, 1)]),
			})
		);

		expect(result).toBeCloseTo(1 + 500 / 700, 10);
	});

	it("recurses into the sources own base fraction", () => {
		// 1 + 0.5 * 1.5
		const result: number = calculateBaseFraction(
			{ source: { RAT: 50 } },
			lookup({ source: snapshot([output("RAT", 100, 5)], 1.5) })
		);

		expect(result).toBe(1.75);
	});

	it("sums over several source plans", () => {
		const result: number = calculateBaseFraction(
			{ a: { RAT: 50 }, b: { DW: 100 } },
			lookup({
				a: snapshot([output("RAT", 100, 5)]),
				b: snapshot([output("DW", 200, 1)], 2),
			})
		);

		// 1 + 0.5 + 0.5 * 2
		expect(result).toBe(2.5);
	});

	it("is not clamped, oversubscription can exceed the plan count", () => {
		expect(
			calculateBaseFraction(
				{ source: { RAT: 300 } },
				lookup({ source: snapshot([output("RAT", 100, 5)]) })
			)
		).toBe(4);
	});

	it("skips draws whose source snapshot is gone", () => {
		expect(calculateBaseFraction({ gone: { RAT: 50 } }, lookup({}))).toBe(
			1
		);
	});

	it("skips sources without any output", () => {
		expect(
			calculateBaseFraction(
				{ source: { RAT: 50 } },
				lookup({ source: snapshot([]) })
			)
		).toBe(1);
	});

	it("skips tickers the source does not produce", () => {
		expect(
			calculateBaseFraction(
				{ source: { HE: 50 } },
				lookup({ source: snapshot([output("RAT", 100, 5)]) })
			)
		).toBe(1);
	});

	it("guards outputs without daily units", () => {
		expect(
			calculateBaseFraction(
				{ source: { RAT: 50 } },
				lookup({ source: snapshot([output("RAT", 0, 5)]) })
			)
		).toBe(1);
	});

	it("falls back to equal weights when the source has no cost", () => {
		// two outputs, both weighted 0.5, RAT fully drawn
		const result: number = calculateBaseFraction(
			{ source: { RAT: 100 } },
			lookup({
				source: snapshot([output("RAT", 100, 0), output("DW", 200, 0)]),
			})
		);

		expect(result).toBe(1.5);
	});

	it("excludes the plans own self draw", () => {
		// own output feeding own repairs, the own base is the leading 1
		const result: number = calculateBaseFraction(
			{ self: { RAT: 50 }, other: { DW: 100 } },
			lookup({
				self: snapshot([output("RAT", 100, 5)], 3),
				other: snapshot([output("DW", 200, 1)]),
			}),
			"self"
		);

		// 1 + 0.5 of "other", nothing of the self draw
		expect(result).toBe(1.5);
	});

	it("counts every draw when no own plan uuid is given", () => {
		const result: number = calculateBaseFraction(
			{ self: { RAT: 50 } },
			lookup({ self: snapshot([output("RAT", 100, 5)]) })
		);

		expect(result).toBe(1.5);
	});
});
