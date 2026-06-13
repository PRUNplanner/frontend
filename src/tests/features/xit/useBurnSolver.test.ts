import { describe, it, expect } from "vitest";

import {
	buildBurnDemand,
	minDays,
	prefillGuaranteed,
	solveBurn,
} from "@/features/xit/useBurnSolver";
import { IBurnDemandItem } from "@/features/xit/xitAction.types";
import { IXITActionElement } from "@/features/xit/xitAction.types";
import { IMaterial } from "@/features/api/gameData.types";

function makeItem(
	overrides: Partial<IBurnDemandItem> & { ticker: string }
): IBurnDemandItem {
	return {
		burnPerDay: 10,
		targetDays: 14,
		targetQuantity: 140,
		currentStock: 0,
		need: 140,
		weightPerUnit: 1,
		volumePerUnit: 1,
		priority: 1,
		...overrides,
	};
}

function totalWeightVolume(
	selected: Map<string, number>,
	items: IBurnDemandItem[]
): { weight: number; volume: number } {
	const byTicker = new Map(items.map((i) => [i.ticker, i]));
	let weight = 0;
	let volume = 0;
	for (const [ticker, qty] of selected) {
		const item = byTicker.get(ticker);
		if (!item) continue;
		weight += qty * item.weightPerUnit;
		volume += qty * item.volumePerUnit;
	}
	return { weight, volume };
}

describe("useBurnSolver", () => {
	it("buildBurnDemand skips surplus materials and builds need from stock", () => {
		const elements: IXITActionElement[] = [
			{ ticker: "ALO", stock: 20, delta: -2 },
			{ ticker: "FEO", stock: 10, delta: 1 },
		];
		const materialsMap: Record<string, IMaterial> = {
			ALO: {
				ticker: "ALO",
				weight: 1.35,
				volume: 1,
				name: "Aluminium Ore",
				material_id: "1",
				category_name: "ores",
				category_id: "1",
			},
			FEO: {
				ticker: "FEO",
				weight: 5.9,
				volume: 1,
				name: "Iron Ore",
				material_id: "2",
				category_name: "ores",
				category_id: "1",
			},
		};

		const demand = buildBurnDemand(elements, materialsMap, 10);

		expect(demand).toHaveLength(1);
		expect(demand[0].ticker).toBe("ALO");
		expect(demand[0].burnPerDay).toBe(2);
		expect(demand[0].targetQuantity).toBe(20);
		expect(demand[0].need).toBe(0);
	});

	it("prefillGuaranteed fully covers tiny-burn materials first", () => {
		const items: IBurnDemandItem[] = [
			makeItem({
				ticker: "HSS",
				burnPerDay: 0.06,
				targetDays: 60,
				targetQuantity: 3.6,
				need: 3.6,
				weightPerUnit: 0.1,
				volumePerUnit: 0.1,
			}),
			makeItem({
				ticker: "PE",
				burnPerDay: 100,
				targetQuantity: 1400,
				need: 1400,
			}),
		];

		const prefill = prefillGuaranteed(items, {
			volumeCapacity: 1000,
			weightCapacity: 1000,
			integer: true,
			thresholdBurn: 1.0,
		});

		expect(prefill.guaranteed.has("HSS")).toBe(true);
		expect(prefill.selected.get("HSS")).toBe(4);
		expect(prefill.usedWeight).toBeCloseTo(0.4);
		expect(prefill.usedVolume).toBeCloseTo(0.4);
	});

	it("solveBurn balances minimum days under tight capacity", () => {
		const items: IBurnDemandItem[] = [
			makeItem({
				ticker: "AL",
				burnPerDay: 10,
				targetQuantity: 140,
				need: 140,
				currentStock: 0,
			}),
			makeItem({
				ticker: "SI",
				burnPerDay: 5,
				targetQuantity: 70,
				need: 70,
				currentStock: 0,
			}),
		];

		const selected = solveBurn(items, {
			volumeCapacity: 50,
			weightCapacity: 50,
			targetDays: 14,
			fullCoverBelowBurnPerDay: 0,
		});

		const daysA =
			(items[0].currentStock + (selected.get("AL") ?? 0)) /
			items[0].burnPerDay;
		const daysB =
			(items[1].currentStock + (selected.get("SI") ?? 0)) /
			items[1].burnPerDay;

		expect(Math.abs(daysA - daysB)).toBeLessThanOrEqual(1.1);
		expect(minDays(selected, items)).toBeGreaterThan(0);
	});

	it("solveBurn never exceeds ship capacity", () => {
		const items: IBurnDemandItem[] = [
			makeItem({
				ticker: "AL",
				burnPerDay: 10,
				targetQuantity: 140,
				need: 140,
			}),
			makeItem({
				ticker: "SI",
				burnPerDay: 8,
				targetQuantity: 112,
				need: 112,
			}),
			makeItem({
				ticker: "FE",
				burnPerDay: 0.5,
				targetQuantity: 7,
				need: 7,
				weightPerUnit: 0.2,
				volumePerUnit: 0.2,
			}),
		];

		const weightCapacity = 75;
		const volumeCapacity = 60;
		const selected = solveBurn(items, {
			volumeCapacity,
			weightCapacity,
			targetDays: 14,
			fullCoverBelowBurnPerDay: 1.0,
		});

		const totals = totalWeightVolume(selected, items);
		expect(totals.weight).toBeLessThanOrEqual(weightCapacity + 1e-6);
		expect(totals.volume).toBeLessThanOrEqual(volumeCapacity + 1e-6);
	});
});

describe("useBurnSolver super-tiny weight/volume items", () => {
	// Weight/volume per unit sourced from the PRUNplanner materials catalog.
	// SCN and TRN are the "super-tiny" items at 0.001 t / 0.001 m3 per unit.
	const materialData: Record<
		string,
		{ weight: number; volume: number }
	> = {
		BCO: { weight: 0.005, volume: 0.002 },
		BGO: { weight: 19.32, volume: 1 },
		C: { weight: 2.25, volume: 1 },
		COF: { weight: 0.1, volume: 0.1 },
		DW: { weight: 0.1, volume: 0.1 },
		HMS: { weight: 0.05, volume: 0.05 },
		LST: { weight: 2.73, volume: 1 },
		MED: { weight: 0.3, volume: 0.1 },
		N: { weight: 0.807, volume: 1 },
		PWO: { weight: 0.05, volume: 0.05 },
		RAT: { weight: 0.21, volume: 0.1 },
		RCO: { weight: 0.95, volume: 1 },
		SC: { weight: 0.04, volume: 0.01 },
		SIO: { weight: 1.79, volume: 1 },
		STL: { weight: 7.85, volume: 1 },
		TRN: { weight: 0.001, volume: 0.001 },
		SCN: { weight: 0.001, volume: 0.001 },
	};

	// The reported plan: buy quantities for a 1000 m3 / 3000 t ship. These sum
	// to ~999.999 m3 and ~2499 t, so volume is the binding constraint and the
	// list includes a single tiny SCN unit.
	const planQuantities: Record<string, number> = {
		BCO: 336,
		BGO: 66,
		C: 122,
		COF: 17,
		DW: 190,
		HMS: 1,
		LST: 62,
		MED: 34,
		N: 645,
		PWO: 1,
		RAT: 186,
		RCO: 15,
		SC: 31,
		SIO: 31,
		STL: 15,
		TRN: 516,
		SCN: 1,
	};

	const materialsMap: Record<string, IMaterial> = Object.fromEntries(
		Object.entries(materialData).map(([ticker, wv]) => [
			ticker,
			{
				material_id: ticker,
				category_name: "test",
				category_id: "test",
				name: ticker,
				ticker,
				weight: wv.weight,
				volume: wv.volume,
			},
		])
	);

	// One day of burn equal to the reported plan quantity, no stock on hand,
	// so each material"s `need` equals its plan quantity.
	const elements: IXITActionElement[] = Object.entries(
		planQuantities
	).map(([ticker, qty]) => ({ ticker, stock: 0, delta: -qty }));

	const VOLUME_CAPACITY = 1000;
	const WEIGHT_CAPACITY = 3000;

	function loadedTotals(selected: Map<string, number>): {
		weight: number;
		volume: number;
	} {
		let weight = 0;
		let volume = 0;
		for (const [ticker, qty] of selected) {
			const wv = materialData[ticker];
			if (!wv) continue;
			weight += qty * wv.weight;
			volume += qty * wv.volume;
		}
		return { weight, volume };
	}

	it("never exceeds ship volume/weight even with 0.001 items", () => {
		const demand = buildBurnDemand(elements, materialsMap, 1);
		const selected = solveBurn(demand, {
			volumeCapacity: VOLUME_CAPACITY,
			weightCapacity: WEIGHT_CAPACITY,
			targetDays: 1,
			fullCoverBelowBurnPerDay: 1.0,
			integer: true,
		});

		const totals = loadedTotals(selected);
		expect(totals.volume).toBeLessThanOrEqual(VOLUME_CAPACITY + 1e-6);
		expect(totals.weight).toBeLessThanOrEqual(WEIGHT_CAPACITY + 1e-6);

		// integer quantities only
		for (const qty of selected.values()) {
			expect(Number.isInteger(qty)).toBe(true);
		}
	});

	it("covers super-tiny items (SCN/TRN) rather than starving them", () => {
		const demand = buildBurnDemand(elements, materialsMap, 1);
		const selected = solveBurn(demand, {
			volumeCapacity: VOLUME_CAPACITY,
			weightCapacity: WEIGHT_CAPACITY,
			targetDays: 1,
			fullCoverBelowBurnPerDay: 1.0,
			integer: true,
		});

		// SCN (burn 0.3/day <= threshold) is guaranteed by the Stage 0 prefill
		expect(selected.get("SCN")).toBe(1);
		// TRN (burn 633.49/day > threshold) is loaded by the optimizer.
		// It fills at the same rate as other materials.
		expect(selected.get("TRN")).toBe(516);
	});

	it("fills the binding volume constraint close to capacity", () => {
		const demand = buildBurnDemand(elements, materialsMap, 1);
		const selected = solveBurn(demand, {
			volumeCapacity: VOLUME_CAPACITY,
			weightCapacity: WEIGHT_CAPACITY,
			targetDays: 1,
			fullCoverBelowBurnPerDay: 1.0,
			integer: true,
		});

		const totals = loadedTotals(selected);
		// The whole plan fits (~999.999 m3), so volume utilization is ~100%.
		expect(totals.volume).toBeGreaterThan(999);
	});
});
