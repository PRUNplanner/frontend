import { describe, it, expect } from "vitest";

// Engine
import {
	productionFeePerRun,
	weightedProductionFee,
} from "@/features/planning/engine/fees";
import { calculateExtraction } from "@/features/planning/calculations/extractionCalculations";

// Types & Interfaces
import type {
	Building,
	PlanetProductionFees,
	PlanetResourceType,
} from "@/features/api/schemas/gameData.schemas";

const HOUR = 3_600_000;

const building = (
	over: Partial<Parameters<typeof weightedProductionFee>[0]> = {}
): Pick<
	Building,
	| "expertise"
	| "pioneers"
	| "settlers"
	| "technicians"
	| "engineers"
	| "scientists"
> => ({
	expertise: "CHEMISTRY",
	pioneers: 0,
	settlers: 0,
	technicians: 0,
	engineers: 0,
	scientists: 0,
	...over,
});

const fees = (
	map: Record<string, [number, number, number, number, number]>
): PlanetProductionFees => ({ currency: "NCC", fees: map });

describe("production fees", () => {
	it("handbook example: Polymer Plant, 10 pioneers × 15 and 25 settlers × 12, 8.5 h", () => {
		const weighted = weightedProductionFee(
			building({ pioneers: 10, settlers: 25 }),
			fees({ CHEMISTRY: [15, 12, 0, 0, 0] })
		);

		expect(weighted).toBeCloseTo(450 / 35, 12);
		expect(weighted).toBeCloseTo(12.857, 3);
		expect(productionFeePerRun(weighted, 8.5 * HOUR)).toBeCloseTo(4.554, 3);
	});

	// read off the in-game production window on 2026-11-09, factors and fees
	// from the e2e FIO snapshot (2026-10-29), see
	// knowledge/game/production-fees.md
	it.each<
		[string, string, PlanetResourceType, number, number, number, string]
	>([
		["Montem", "EXT", "MINERAL", 0.20999999344348907, 70, 25, "13.61"],
		["Etherwind", "EXT", "MINERAL", 0.30000001192092896, 70, 0, "0.00"],
		["Demeter", "RIG", "LIQUID", 0.4331817626953125, 70, 10, "2.31"],
		["Nemesis", "COL", "GASEOUS", 0.3106825649738312, 60, 20, "5.36"],
		["Nemesis", "RIG", "LIQUID", 0.4312616288661957, 70, 20, "4.64"],
	])(
		"%s %s matches the game's fee",
		(_planet, _ticker, type, factor, perFactor, pioneerFee, game) => {
			const { timeMs } = calculateExtraction(type, factor * perFactor);
			const weighted = weightedProductionFee(
				building({ expertise: "RESOURCE_EXTRACTION", pioneers: 60 }),
				fees({
					// pioneer-only, so the other levels can't count
					RESOURCE_EXTRACTION: [pioneerFee, 59, 133, 385, 385],
				})
			);

			expect(productionFeePerRun(weighted, timeMs).toFixed(2)).toBe(game);
		}
	);

	it("is 0 without fees, expertise, a matching category or workforce", () => {
		const map = fees({ CHEMISTRY: [15, 12, 0, 0, 0] });

		expect(weightedProductionFee(building({ pioneers: 10 }), null)).toBe(0);
		expect(
			weightedProductionFee(building({ pioneers: 10 }), undefined)
		).toBe(0);
		expect(
			weightedProductionFee(
				building({ expertise: null, pioneers: 10 }),
				map
			)
		).toBe(0);
		expect(
			weightedProductionFee(
				building({ expertise: "METALLURGY", pioneers: 10 }),
				map
			)
		).toBe(0);
		expect(weightedProductionFee(building(), map)).toBe(0);
		expect(productionFeePerRun(0, 8.5 * HOUR)).toBe(0);
	});

	it("ignores categories it doesn't know", () => {
		const map = fees({
			CHEMISTRY: [15, 12, 0, 0, 0],
			SPACE_MAGIC: [999, 999, 999, 999, 999],
		});

		expect(
			weightedProductionFee(building({ pioneers: 10, settlers: 25 }), map)
		).toBeCloseTo(450 / 35, 12);
	});
});
