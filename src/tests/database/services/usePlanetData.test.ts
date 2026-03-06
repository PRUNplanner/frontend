import { ref } from "vue";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the planets store (could be empty)
vi.mock("@/database/stores", () => ({
	planetsStore: {},
}));

// Mock useDB
vi.mock("@/database/composables/useDB", () => ({
	useDB: vi.fn(),
}));

import { useDB } from "@/database/composables/useDB";
import { usePlanetData } from "@/database/services/usePlanetData";

// Sample planet mock
const mockPlanet1 = {
	planet_natural_id: "P1",
	planet_name: "Earth",
	surface: true,
	gravity: 1,
	pressure: 1,
	temperature: 25,
};

const mockPlanet2 = {
	planet_natural_id: "P2",
	planet_name: "Mars",
	surface: false,
	gravity: 0.5,
	pressure: 0.5,
	temperature: -20,
};

describe("usePlanetData", () => {
	let getMock: any;
	let preloadMock: any;

	beforeEach(() => {
		getMock = vi.fn(async (id: string) => {
			if (id === mockPlanet1.planet_natural_id) return mockPlanet1;
			if (id === mockPlanet2.planet_natural_id) return mockPlanet2;
			return undefined;
		});

		preloadMock = vi.fn(async () => {});

		// @ts-ignore
		useDB.mockReturnValue({
			allData: ref([mockPlanet1, mockPlanet2]),
			get: getMock,
			preload: preloadMock,
		});
	});

	it("getPlanet returns the planet", async () => {
		const { getPlanet } = usePlanetData();
		const planet = await getPlanet("P1");
		expect(planet.planet_name).toBe("Earth");
		expect(getMock).toHaveBeenCalledWith("P1");
	});

	it("getPlanetName returns formatted name", async () => {
		const { getPlanetName } = usePlanetData();
		const name = await getPlanetName("P1");
		expect(name).toBe("Earth (P1)");
	});

	it("loadPlanetName caches the name", async () => {
		const { loadPlanetName, planetNames } = usePlanetData();
		const name = await loadPlanetName("P1");

		expect(name).toBe("Earth (P1)");
		expect(planetNames.value["P1"]).toBe("Earth (P1)");
	});

	it("reload calls preload", async () => {
		const { reload } = usePlanetData();
		await reload();
		expect(preloadMock).toHaveBeenCalled();
	});

	it("loadPlanetNames caches multiple planet names", async () => {
		const { loadPlanetNames, planetNames } = usePlanetData();

		await loadPlanetNames(["P1", "P2", "P1"]); // includes duplicate P1

		expect(planetNames.value["P1"]).toBe("Earth (P1)");
		expect(planetNames.value["P2"]).toBe("Mars (P2)");
		expect(getMock).toHaveBeenCalledTimes(2); // each planet fetched only once
	});

	it("getPlanetName returns planetNaturalId on error", async () => {
		const { getPlanetName } = usePlanetData();

		// simulate getPlanet throwing an error by passing unknown ID
		const unknownId = "UNKNOWN";

		const name = await getPlanetName(unknownId);

		expect(name).toBe(unknownId);
	});

	describe("getPlanetSpecialMaterials", async () => {
		const specialMaterialCases = [
			{
				planet: { surface: true },
				areaCost: 25,
				result: [
					{
						ticker: "MCG",
						input: 100,
						output: 0,
					},
				],
				description: "With Surface",
			},
			{
				planet: { surface: false },
				areaCost: 25,
				result: [
					{
						ticker: "AEF",
						input: 9,
						output: 0,
					},
				],
				description: "No Surface",
			},
			{
				planet: { surface: true, gravity: 0.249 },
				areaCost: 25,
				result: [
					{
						ticker: "MCG",
						input: 100,
						output: 0,
					},
					{
						ticker: "MGC",
						input: 1,
						output: 0,
					},
				],
				description: "Low Gravity",
			},
			{
				planet: { surface: true, gravity: 2.51 },
				areaCost: 25,
				result: [
					{
						ticker: "MCG",
						input: 100,
						output: 0,
					},
					{
						ticker: "BL",
						input: 1,
						output: 0,
					},
				],
				description: "High Gravity",
			},
			{
				planet: { surface: true, pressure: 0.249 },
				areaCost: 25,
				result: [
					{
						ticker: "MCG",
						input: 100,
						output: 0,
					},
					{
						ticker: "SEA",
						input: 25,
						output: 0,
					},
				],
				description: "Low Pressure",
			},
			{
				planet: { surface: true, pressure: 2.01 },
				areaCost: 25,
				result: [
					{
						ticker: "MCG",
						input: 100,
						output: 0,
					},
					{
						ticker: "HSE",
						input: 1,
						output: 0,
					},
				],
				description: "Low Pressure",
			},
			{
				planet: { surface: true, temperature: -25.01 },
				areaCost: 25,
				result: [
					{
						ticker: "MCG",
						input: 100,
						output: 0,
					},
					{
						ticker: "INS",
						input: 250,
						output: 0,
					},
				],
				description: "Low Temperature",
			},
			{
				planet: { surface: true, temperature: 75.01 },
				areaCost: 25,
				result: [
					{
						ticker: "MCG",
						input: 100,
						output: 0,
					},
					{
						ticker: "TSH",
						input: 1,
						output: 0,
					},
				],
				description: "High Temperature",
			},
		];

		it.each(specialMaterialCases)(
			"Planet Special Materials: $description",
			async ({ planet, areaCost, result }) => {
				const { getPlanetSpecialMaterials } = usePlanetData();

				expect(
					// @ts-expect-error mock planet data
					getPlanetSpecialMaterials(planet, areaCost)
				).toStrictEqual(result);
			}
		);
	});
});
