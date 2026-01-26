import { describe, it, expect, beforeAll, vi } from "vitest";

import { usePlanetSearchResults } from "@/features/planet_search/usePlanetSearchResults";

// test data
import planet_search_results from "@/tests/test_data/api_data_planet_search.json";
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";

describe("usePlanetSearchResults", async () => {
	it("hasCheckDistance: ok", async () => {
		const { hasCheckDistance } = usePlanetSearchResults(
			// @ts-expect-error mock data
			planet_search_results,
			[],
			{},
			undefined,
			undefined
		);

		expect(hasCheckDistance.value).toBe("Antares III");
	});

	it("hasCheckDistance: null", async () => {
		const { hasCheckDistance } = usePlanetSearchResults(
			// @ts-expect-error mock data
			[{ CheckDistances: null }],
			[],
			{},
			undefined,
			undefined
		);

		expect(hasCheckDistance.value).toBe(null);
	});

	it("results: full", async () => {
		const { results } = usePlanetSearchResults(
			// @ts-expect-error mock data
			planet_search_results,
			["N"],
			{},
			undefined,
			undefined
		);

		expect(results.value.length).toBe(60);
		expect(Object.keys(results.value[0].searchResources).length).toBe(1);
	});

	it("results: no distances", async () => {
		const { results } = usePlanetSearchResults(
			// @ts-expect-error mock data
			[planet_etherwind],
			["N"],
			{},
			undefined,
			undefined
		);

		expect(results.value.length).toBe(1);
		expect(Object.keys(results.value[0].searchResources).length).toBe(0);
	});

	it("results: distances", async () => {
		const { results } = usePlanetSearchResults(
			// @ts-expect-error mock data
			[planet_etherwind],
			["N"],
			{},
			"239e36f2a61041e0952d9c9741c195c9",
			30
		);

		expect(results.value.length).toBe(1);
		expect(Object.keys(results.value[0].searchResources).length).toBe(0);
	});

	it("results: distances", async () => {
		const { results } = usePlanetSearchResults(
			// @ts-expect-error mock data
			[planet_etherwind],
			["N"],
			{},
			"49b6615d39ccba05752b3be77b2ebf36",
			1
		);

		expect(results.value.length).toBe(0);
	});
});
