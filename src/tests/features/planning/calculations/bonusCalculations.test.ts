import { describe, expect, test, it } from "vitest";

// Types & Interfaces
import { useBonusCalculation } from "@/features/planning/calculations/bonusCalculations";
import { IWorkforceRecord } from "@/features/planning/usePlanCalculation.types";

const bonusCases = [
	{ amount: -5, expected: 0 },
	{ amount: 100, expected: 0 },
	{ amount: 1, expected: 0.0306 },
	{ amount: 2, expected: 0.0696 },
	{ amount: 3, expected: 0.1248 },
	{ amount: 4, expected: 0.1974 },
	{ amount: 5, expected: 0.284 },
];

const workforceCases: {
	building: any;
	workforce: IWorkforceRecord;
	expected: number;
}[] = [
	{
		building: {
			pioneers: 40,
			settlers: 30,
			technicians: 20,
			engineers: 10,
			scientists: 5,
		},
		workforce: {
			pioneer: {
				name: "pioneer",
				required: 100,
				capacity: 150,
				left: 50,
				lux1: true,
				lux2: false,
				efficiency: 0.5,
			},
			settler: {
				name: "settler",
				required: 100,
				capacity: 150,
				left: 50,
				lux1: true,
				lux2: false,
				efficiency: 0.25,
			},
			technician: {
				name: "technician",
				required: 100,
				capacity: 150,
				left: 50,
				lux1: true,
				lux2: false,
				efficiency: 0.4,
			},
			engineer: {
				name: "engineer",
				required: 100,
				capacity: 150,
				left: 50,
				lux1: true,
				lux2: false,
				efficiency: 0.1,
			},
			scientist: {
				name: "scientist",
				required: 100,
				capacity: 150,
				left: 50,
				lux1: true,
				lux2: false,
				efficiency: 1.5,
			},
		},
		expected: 0.419047619047619,
	},
	{
		building: {
			pioneers: 100,
			settlers: 50,
			technicians: 20,
			engineers: 10,
			scientists: 5,
		},
		workforce: {
			pioneer: {
				name: "pioneer",
				required: 100,
				capacity: 100,
				left: 0,
				lux1: true,
				lux2: true,
				efficiency: 1.25,
			},
			settler: {
				name: "settler",
				required: 100,
				capacity: 100,
				left: 0,
				lux1: true,
				lux2: true,
				efficiency: 1.625,
			},
			technician: {
				name: "technician",
				required: 100,
				capacity: 150,
				left: 50,
				lux1: true,
				lux2: false,
				efficiency: 0.4,
			},
			engineer: {
				name: "engineer",
				required: 100,
				capacity: 150,
				left: 50,
				lux1: true,
				lux2: false,
				efficiency: 0.1,
			},
			scientist: {
				name: "scientist",
				required: 100,
				capacity: 150,
				left: 50,
				lux1: true,
				lux2: false,
				efficiency: 1.5,
			},
		},
		expected: 1.204054054054054,
	},
];

const factionBonusCases = [
	{ building: { expertise: null }, empire: {}, expected: undefined },
	{
		building: { expertise: "AGRICULTURE" },
		empire: undefined,
		expected: undefined,
		description: "Building Expertise, no empire",
	},
	{
		building: { expertise: null },
		empire: undefined,
		expected: undefined,
		description: "Building Expertise null, no empire",
	},
	{
		building: { expertise: "AGRICULTURE" },
		empire: { empire_faction: "FOO" },
		expected: undefined,
		description: "Building Expertise, invalid faction",
	},
	{
		building: { expertise: "AGRICULTURE" },
		empire: {
			empire_faction: "HORTUS",
			empire_permits_used: 1,
			empire_permits_total: 3,
		},
		expected: {
			efficiencyType: "FACTION",
			value: 1.1400000000000001,
		},
		description: "Building Expertise, Hortus",
	},
	{
		building: { expertise: "METALLURGY" },
		empire: {
			empire_faction: "MORIA",
			empire_permits_used: 20,
			empire_permits_total: 21,
		},
		expected: {
			efficiencyType: "FACTION",
			value: 1.0438095238095237,
		},
		description: "Building Expertise, Moria",
	},
];

describe("Planning: Bonus Calculations ", async () => {
	describe("calculateExpertBonus", async () => {
		test.each(bonusCases)(
			"Bonus: $amount => $expected",
			async ({ amount, expected }) => {
				const { calculateExpertBonus } = await useBonusCalculation();

				expect(calculateExpertBonus(amount)).toBe(expected);
			}
		);
	});

	describe("calculateBuildingWorkforceEfficiency", async () => {
		test.each(workforceCases)(
			"Efficiency: $expected",
			async ({ building, workforce, expected }) => {
				const { calculateBuildingWorkforceEfficiency } =
					await useBonusCalculation();

				expect(
					calculateBuildingWorkforceEfficiency(building, workforce)
				).toBe(expected);
			}
		);
	});

	describe("calculateBuildingFactionBonus", async () => {
		test.each(factionBonusCases)(
			"Faction Bonus: $description => $expected",
			async ({ building, empire, expected }) => {
				const { calculateBuildingFactionBonus } =
					await useBonusCalculation();

				if (typeof expected === "object") {
					expect(
						// @ts-ignore test data mocking
						calculateBuildingFactionBonus(building, empire)
					).toStrictEqual(expected);
				} else {
					expect(
						// @ts-ignore test data mocking
						calculateBuildingFactionBonus(building, empire)
					).toBe(expected);
				}
			}
		);
	});

	describe("calculateBuildingEfficiency", async () => {
		it("Calculate all Efficiency factors and total, advertising COGC", async () => {
			const { calculateBuildingEfficiency } = await useBonusCalculation();

			const testBuilding = {
				building_ticker: "FRM",
				pioneers: 20,
				settlers: 50,
				technicians: 10,
				engineers: 5,
				scientists: 5,
				expertise: "METALLURGY",
			};
			const testPlanet = { fertility: 0.85 };
			const testCorpHQ = true;
			const testCOGC = "METALLURGY";
			const testWorkforce = {
				pioneer: {
					name: "pioneer",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: true,
					lux2: true,
					efficiency: 1.25,
				},
				settler: {
					name: "settler",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: true,
					lux2: true,
					efficiency: 1.625,
				},
				technician: {
					name: "technician",
					required: 100,
					capacity: 150,
					left: 50,
					lux1: true,
					lux2: false,
					efficiency: 0.4,
				},
				engineer: {
					name: "engineer",
					required: 100,
					capacity: 150,
					left: 50,
					lux1: true,
					lux2: false,
					efficiency: 0.1,
				},
				scientist: {
					name: "scientist",
					required: 100,
					capacity: 150,
					left: 50,
					lux1: true,
					lux2: false,
					efficiency: 1.5,
				},
			};
			const testExpert = {
				Metallurgy: { name: "Metallurgy", amount: 3, bonus: 0.1248 },
			};
			const testEmpire = {
				empire_faction: "MORIA",
				empire_permits_used: 20,
				empire_permits_total: 21,
			};

			const result = calculateBuildingEfficiency(
				// @ts-expect-error mock test data
				testBuilding,
				testPlanet,
				testCorpHQ,
				testCOGC,
				testWorkforce,
				testExpert,
				testEmpire
			);

			expect(result).toStrictEqual({
				totalEfficiency: 2.667424020458554,
				elements: [
					{
						efficiencyType: "FERTILITY",
						value: 1.2575757575757576,
					},
					{
						efficiencyType: "HQ",
						value: 1.1,
					},
					{
						efficiencyType: "COGC",
						value: 1.25,
					},
					{
						efficiencyType: "EXPERT",
						value: 1.1248,
					},
					{
						efficiencyType: "WORKFORCE",
						value: 1.3138888888888889,
					},
					{
						efficiencyType: "FACTION",
						value: 1.0438095238095237,
					},
				],
			});
		});
		it("Calculate all Efficiency factors and total, workforce COGC", async () => {
			const { calculateBuildingEfficiency } = await useBonusCalculation();

			const testBuilding = {
				building_ticker: "FRM",
				pioneers: 20,
				settlers: 50,
				technicians: 10,
				engineers: 5,
				scientists: 5,
				expertise: "METALLURGY",
			};
			const testPlanet = { fertility: 0.85 };
			const testCorpHQ = true;
			const testCOGC = "SETTLERS";
			const testWorkforce = {
				pioneer: {
					name: "pioneer",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: true,
					lux2: true,
					efficiency: 1.25,
				},
				settler: {
					name: "settler",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: true,
					lux2: true,
					efficiency: 1.625,
				},
				technician: {
					name: "technician",
					required: 100,
					capacity: 150,
					left: 50,
					lux1: true,
					lux2: false,
					efficiency: 0.4,
				},
				engineer: {
					name: "engineer",
					required: 100,
					capacity: 150,
					left: 50,
					lux1: true,
					lux2: false,
					efficiency: 0.1,
				},
				scientist: {
					name: "scientist",
					required: 100,
					capacity: 150,
					left: 50,
					lux1: true,
					lux2: false,
					efficiency: 1.5,
				},
			};
			const testExpert = {
				Metallurgy: { name: "Metallurgy", amount: 3, bonus: 0.1248 },
			};
			const testEmpire = {
				empire_faction: "MORIA",
				empire_permits_used: 20,
				empire_permits_total: 21,
			};

			const result = calculateBuildingEfficiency(
				// @ts-expect-error mock test data
				testBuilding,
				testPlanet,
				testCorpHQ,
				testCOGC,
				testWorkforce,
				testExpert,
				testEmpire
			);

			expect(result).toStrictEqual({
				totalEfficiency: 2.3473331380035276,
				elements: [
					{
						efficiencyType: "FERTILITY",
						value: 1.2575757575757576,
					},
					{
						efficiencyType: "HQ",
						value: 1.1,
					},
					{
						efficiencyType: "EXPERT",
						value: 1.1248,
					},
					{
						efficiencyType: "COGC",
						value: 1.1,
					},
					{
						efficiencyType: "WORKFORCE",
						value: 1.3138888888888889,
					},
					{
						efficiencyType: "FACTION",
						value: 1.0438095238095237,
					},
				],
			});
		});
		it("Calculate all Efficiency factors and total, workforce COGC", async () => {
			const { calculateBuildingEfficiency } = await useBonusCalculation();

			const testBuilding = {
				building_ticker: "FRM",
				pioneers: 20,
				settlers: 50,
				technicians: 10,
				engineers: 5,
				scientists: 5,
				expertise: "METALLURGY",
			};
			const testPlanet = { fertility: -1.0 };
			const testCorpHQ = true;
			const testCOGC = "SETTLERS";
			const testWorkforce = {
				pioneer: {
					name: "pioneer",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: true,
					lux2: true,
					efficiency: 1.25,
				},
				settler: {
					name: "settler",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: true,
					lux2: true,
					efficiency: 1.625,
				},
				technician: {
					name: "technician",
					required: 100,
					capacity: 150,
					left: 50,
					lux1: true,
					lux2: false,
					efficiency: 0.4,
				},
				engineer: {
					name: "engineer",
					required: 100,
					capacity: 150,
					left: 50,
					lux1: true,
					lux2: false,
					efficiency: 0.1,
				},
				scientist: {
					name: "scientist",
					required: 100,
					capacity: 150,
					left: 50,
					lux1: true,
					lux2: false,
					efficiency: 1.5,
				},
			};
			const testExpert = {
				Metallurgy: { name: "Metallurgy", amount: 3, bonus: 0.1248 },
			};
			const testEmpire = {
				empire_faction: "MORIA",
				empire_permits_used: 20,
				empire_permits_total: 21,
			};

			const result = calculateBuildingEfficiency(
				// @ts-expect-error mock test data
				testBuilding,
				testPlanet,
				testCorpHQ,
				testCOGC,
				testWorkforce,
				testExpert,
				testEmpire
			);

			expect(result).toStrictEqual({
				totalEfficiency: 0,
				elements: [
					{
						efficiencyType: "FERTILITY",
						value: 0,
					},
					{
						efficiencyType: "HQ",
						value: 1.1,
					},
					{
						efficiencyType: "EXPERT",
						value: 1.1248,
					},
					{
						efficiencyType: "COGC",
						value: 1.1,
					},
					{
						efficiencyType: "WORKFORCE",
						value: 1.3138888888888889,
					},
					{
						efficiencyType: "FACTION",
						value: 1.0438095238095237,
					},
				],
			});
		});
	});
});
