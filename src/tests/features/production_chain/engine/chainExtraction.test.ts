import { describe, it, expect } from "vitest";

// Engine
import { extractionOptions } from "@/features/production_chain/engine/chainExtraction";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";

// Fixtures
import { index } from "@/tests/features/production_chain/chain.fixtures";

const planet = (
	id: string,
	type: "MINERAL" | "GASEOUS" | "LIQUID",
	daily: number
) =>
	({
		planet_natural_id: id,
		planet_name: id,
		resources: [
			{
				material_ticker: "H2O",
				resource_type: type,
				daily_extraction: daily,
				max_daily_extraction: daily,
			},
		],
	}) as unknown as PlanetSearchIndexEntry;

describe("extractionOptions", () => {
	it("picks the 90th percentile planet with its extractor", () => {
		const planets = Array.from({ length: 10 }, (_, i) =>
			planet(`P-${i}`, i === 8 ? "MINERAL" : "LIQUID", i + 1)
		);
		const h2o = extractionOptions(planets).get("H2O")!;
		expect(h2o.sites.map((s) => s.dailyExtraction)).toEqual([
			10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
		]);
		expect(h2o.typical.dailyExtraction).toBe(9);
		expect(h2o.typical.buildingTicker).toBe("EXT");
		expect(h2o.sites[0].buildingTicker).toBe("RIG");
	});

	it("skips resources without extraction and covers the index", () => {
		const options = extractionOptions([planet("P-1", "GASEOUS", 0)]);
		expect(options.size).toBe(0);
		const all = extractionOptions(index);
		expect(all.get("N")!.sites.length).toBeGreaterThan(10);
		expect(["COL", "EXT", "RIG"]).toContain(all.get("N")!.typical.buildingTicker);
	});
});
