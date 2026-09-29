import { describe, it, expect } from "vitest";

import {
	netPerPlanet,
	shortPlanetName,
	summarizeSide,
} from "@/features/empire/util/empireMaterialIO.util";

// Types & Interfaces
import type {
	IEmpireMaterialIO,
	IEmpireMaterialIOPlanet,
} from "@/features/empire/empire.types";

const plan = (
	planetId: string,
	planUuid: string,
	output: number,
	input: number
): IEmpireMaterialIOPlanet => ({
	planetId,
	planUuid,
	planName: planUuid,
	planCOGC: "---",
	delta: output - input,
	input,
	output,
	price: 0,
});

function row(plans: IEmpireMaterialIOPlanet[]): IEmpireMaterialIO {
	const output = plans.reduce((s, p) => s + p.output, 0);
	const input = plans.reduce((s, p) => s + p.input, 0);
	return {
		ticker: "DW",
		output,
		input,
		delta: output - input,
		deltaPrice: 0,
		outputPlanets: plans.filter((p) => p.output > 0),
		inputPlanets: plans.filter((p) => p.input > 0),
	};
}

describe("empireMaterialIO.util", () => {
	describe("summarizeSide", () => {
		it("sorts by amount, sets top, more and shares", () => {
			const side = summarizeSide(
				[plan("A", "a", 10, 0), plan("B", "b", 30, 0), plan("C", "c", 0, 0)],
				"output",
				40
			);
			expect(side.entries.map((e) => e.planetId)).toEqual(["B", "A", "C"]);
			expect(side.top?.planetId).toBe("B");
			expect(side.more).toBe(2);
			expect(side.total).toBe(40);
			expect(side.entries[0].share).toBeCloseTo(0.75);
			expect(side.fillPct).toBe(100);
		});

		it("scales the smaller side against the larger one", () => {
			const r = row([plan("A", "a", 40, 0), plan("B", "b", 0, 10)]);
			const scale = Math.max(r.output, r.input);
			expect(summarizeSide(r.outputPlanets, "output", scale).fillPct).toBe(
				100
			);
			expect(summarizeSide(r.inputPlanets, "input", scale).fillPct).toBe(25);
		});

		it("handles an empty side", () => {
			const side = summarizeSide([], "input", 0);
			expect(side.top).toBeUndefined();
			expect(side.more).toBe(0);
			expect(side.total).toBe(0);
			expect(side.fillPct).toBe(0);
		});
	});

	describe("netPerPlanet", () => {
		const r = row([
			plan("A", "a1", 20, 5), // makes and uses: +15
			plan("B", "b1", 0, 30), // -30
			plan("B", "b2", 0, 10), // same planet: -40 total
			plan("C", "c1", 8, 0), // +8
			plan("D", "d1", 10, 0), // two plans cancel out on D
			plan("D", "d2", 0, 10),
			plan("E", "e1", 4, 4), // uses what it makes
		]);
		const net = netPerPlanet(r);

		it("lists every planet once, surplus desc, balanced last", () => {
			expect(net.surplus.map((e) => e.planetId)).toEqual([
				"A",
				"C",
				"D",
				"E",
			]);
			expect(net.needs.map((e) => e.planetId)).toEqual(["B"]);
			expect(net.surplus.filter((e) => e.balanced).length).toBe(2);
		});

		it("sums plans per planet and sorts them by volume", () => {
			const b = net.needs[0];
			expect(b.consumes).toBe(40);
			expect(b.net).toBe(-40);
			expect(b.plans.map((p) => p.planUuid)).toEqual(["b1", "b2"]);
			const a = net.surplus[0];
			expect(a.produces).toBe(20);
			expect(a.consumes).toBe(5);
			expect(a.plans).toEqual([
				{ planUuid: "a1", planName: "a1", volume: 25 },
			]);
		});

		it("totals add up to the row delta", () => {
			expect(net.surplusTotal).toBe(23);
			expect(net.needsTotal).toBe(-40);
			expect(net.surplusTotal + net.needsTotal).toBeCloseTo(r.delta, 2);
		});

		it("treats a net that rounds to 0.00 as balanced", () => {
			const tiny = netPerPlanet(
				row([plan("A", "a", 10.001, 10), plan("B", "b", 0, 5)])
			);
			expect(tiny.surplus[0].balanced).toBe(true);
			expect(tiny.surplus[0].net).toBe(0);
			expect(tiny.needs[0].planetId).toBe("B");
		});

		it("handles a material nobody produces", () => {
			const onlyNeeds = netPerPlanet(row([plan("A", "a", 0, 3)]));
			expect(onlyNeeds.surplus).toEqual([]);
			expect(onlyNeeds.surplusTotal).toBe(0);
			expect(onlyNeeds.needsTotal).toBe(-3);
		});
	});

	it("shortPlanetName drops the id suffix", () => {
		const names = new Map([
			["KW-688c", "Etherwind (KW-688c)"],
			["OT-580b", "OT-580b"],
		]);
		expect(shortPlanetName(names, "KW-688c")).toBe("Etherwind");
		expect(shortPlanetName(names, "OT-580b")).toBe("OT-580b");
		expect(shortPlanetName(names, "ZV-307c")).toBe("ZV-307c");
	});
});
