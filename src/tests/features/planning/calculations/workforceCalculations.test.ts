import { describe, expect, it } from "vitest";

// Composables
import { useWorkforceCalculation } from "@/features/planning/calculations/workforceCalculations";

describe("Planning: Workforce Calculations", async () => {
	describe("calculateSatisfaction", async () => {
		const satisfactionCases = [
			{
				capacity: 100,
				required: 100,
				lux1: false,
				lux2: false,
				expected: 0.7944444444444446,
				description: "Full used, no luxuries",
			},
			{
				capacity: 50,
				required: 100,
				lux1: false,
				lux2: false,
				expected: 0.3972222222222223,
				description: "Overused, no luxuries",
			},
			{
				capacity: 100,
				required: 50,
				lux1: false,
				lux2: false,
				expected: 0.7944444444444446,
				description: "Underused, no luxuries",
			},
			{
				capacity: 100,
				required: 100,
				lux1: true,
				lux2: false,
				expected: 0.8666666666666668,
				description: "Full used, lux1",
			},
			{
				capacity: 100,
				required: 100,
				lux1: false,
				lux2: true,
				expected: 0.9166666666666667,
				description: "Full used, lux2",
			},
			{
				capacity: 100,
				required: 100,
				lux1: true,
				lux2: true,
				expected: 1,
				description: "Full used, lux1 + lux2",
			},
		];

		it.each(satisfactionCases)(
			"Test $description",
			async ({ capacity, required, lux1, lux2, expected }) => {
				const { calculateSatisfaction } =
					await useWorkforceCalculation();

				expect(
					calculateSatisfaction(capacity, required, lux1, lux2)
				).toBe(expected);
			}
		);
	});

	describe("calculateSingleWorkforceConsumption", async () => {
		const consumptionCases = [
			{
				workforce: {
					name: "pioneer",
					required: 0,
					capacity: 0,
					left: 0,
					lux1: false,
					lux2: false,
					efficiency: 1,
				},
				expected: [],
				description: "No one is consuming",
			},
			{
				workforce: {
					name: "pioneer",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: false,
					lux2: false,
					efficiency: 1,
				},
				expected: [
					{
						input: 4,
						output: 0,
						ticker: "DW",
					},
					{
						input: 4,
						output: 0,
						ticker: "RAT",
					},
					{
						input: 0.5,
						output: 0,
						ticker: "OVE",
					},
				],
				description: "Regular Pioneer without luxuries",
			},
			{
				workforce: {
					name: "pioneer",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: true,
					lux2: false,
					efficiency: 1,
				},
				expected: [
					{
						input: 4,
						output: 0,
						ticker: "DW",
					},
					{
						input: 4,
						output: 0,
						ticker: "RAT",
					},
					{
						input: 0.5,
						output: 0,
						ticker: "OVE",
					},
					{
						input: 0.2,
						output: 0,
						ticker: "PWO",
					},
				],
				description: "Regular Pioneer only lux1",
			},
			{
				workforce: {
					name: "pioneer",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: false,
					lux2: true,
					efficiency: 1,
				},
				expected: [
					{
						input: 4,
						output: 0,
						ticker: "DW",
					},
					{
						input: 4,
						output: 0,
						ticker: "RAT",
					},
					{
						input: 0.5,
						output: 0,
						ticker: "OVE",
					},
					{
						input: 0.5,
						output: 0,
						ticker: "COF",
					},
				],
				description: "Regular Pioneer only lux2",
			},
			{
				workforce: {
					name: "pioneer",
					required: 200,
					capacity: 100,
					left: -100,
					lux1: false,
					lux2: false,
					efficiency: 1,
				},
				expected: [
					{
						input: 4,
						output: 0,
						ticker: "DW",
					},
					{
						input: 4,
						output: 0,
						ticker: "RAT",
					},
					{
						input: 0.5,
						output: 0,
						ticker: "OVE",
					},
				],
				description:
					"Regular Pioneer with required over capacity, no luxuries",
			},
		];

		it.each(consumptionCases)(
			"Test $description",
			async ({ workforce, expected }) => {
				const { calculateSingleWorkforceConsumption } =
					await useWorkforceCalculation();

				expect(
					// @ts-expect-error test mock data
					calculateSingleWorkforceConsumption(workforce)
				).toStrictEqual(expected);
			}
		);
	});

	describe("calculateWorkforceConsumption", async () => {
		it("Full workforce record", async () => {
			const { calculateWorkforceConsumption } =
				await useWorkforceCalculation();

			const testData = {
				pioneer: {
					name: "pioneer",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: true,
					lux2: false,
					efficiency: 1,
				},
				settler: {
					name: "settler",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: true,
					lux2: true,
					efficiency: 1,
				},
				technician: {
					name: "technician",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: true,
					lux2: true,
					efficiency: 1,
				},
				engineer: {
					name: "engineer",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: true,
					lux2: true,
					efficiency: 1,
				},
				scientist: {
					name: "scientist",
					required: 100,
					capacity: 100,
					left: 0,
					lux1: true,
					lux2: true,
					efficiency: 1,
				},
			};
			const result = [
				{
					input: 36.5,
					output: 0,
					ticker: "DW",
				},
				{
					input: 17,
					output: 0,
					ticker: "RAT",
				},
				{
					input: 0.5,
					output: 0,
					ticker: "OVE",
				},
				{
					input: 0.2,
					output: 0,
					ticker: "PWO",
				},
				{
					input: 0.5,
					output: 0,
					ticker: "EXO",
				},
				{
					input: 0.5,
					output: 0,
					ticker: "PT",
				},
				{
					input: 0.2,
					output: 0,
					ticker: "REP",
				},
				{
					input: 1,
					output: 0,
					ticker: "KOM",
				},
				{
					input: 1.5,
					output: 0,
					ticker: "MED",
				},
				{
					input: 0.5,
					output: 0,
					ticker: "HMS",
				},
				{
					input: 0.1,
					output: 0,
					ticker: "SCN",
				},
				{
					input: 0.1,
					output: 0,
					ticker: "SC",
				},
				{
					input: 1,
					output: 0,
					ticker: "ALE",
				},
				{
					input: 7.000000000000001,
					output: 0,
					ticker: "FIM",
				},
				{
					input: 0.2,
					output: 0,
					ticker: "HSS",
				},
				{
					input: 0.1,
					output: 0,
					ticker: "PDA",
				},
				{
					input: 0.2,
					output: 0,
					ticker: "VG",
				},
				{
					input: 1,
					output: 0,
					ticker: "GIN",
				},
				{
					input: 7.000000000000001,
					output: 0,
					ticker: "MEA",
				},
				{
					input: 0.2,
					output: 0,
					ticker: "LC",
				},
				{
					input: 0.05,
					output: 0,
					ticker: "WS",
				},
				{
					input: 0.1,
					output: 0,
					ticker: "NST",
				},
				{
					input: 1,
					output: 0,
					ticker: "WIN",
				},
			];

			// @ts-expect-error mock data
			expect(calculateWorkforceConsumption(testData)).toStrictEqual(
				result
			);
		});
	});
});
