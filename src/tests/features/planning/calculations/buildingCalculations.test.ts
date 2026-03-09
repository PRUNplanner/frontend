import { describe, expect, it } from "vitest";

// Composables
import { useBuildingCalculation } from "@/features/planning/calculations/buildingCalculations";
import { IProductionBuilding } from "@/features/planning/usePlanCalculation.types";

describe("Planning: Workforce Calculations", async () => {
	describe("calculateMaterialIO", async () => {
		it("Calculate whole production material io", async () => {
			const { calculateMaterialIO } = await useBuildingCalculation();

			const fakeData: IProductionBuilding[] = [
				{
					amount: 1,
					totalBatchTime: 17280000 + 51840000,
					activeRecipes: [
						{
							recipeId: "foo",
							amount: 1,
							time: 17280000,
							// @ts-expect-error mock data
							recipe: {
								inputs: [
									{
										material_ticker: "DW",
										material_amount: 20,
									},
									{
										material_ticker: "EPO",
										material_amount: 5,
									},
								],
								outputs: [
									{
										material_ticker: "O",
										material_amount: 3,
									},
								],
							},
						},
						{
							recipeId: "moo",
							amount: 1,
							time: 51840000,
							// @ts-expect-error mock data
							recipe: {
								inputs: [
									{
										material_ticker: "MG",
										material_amount: 3,
									},
									{
										material_ticker: "O",
										material_amount: 1,
									},
								],
								outputs: [
									{
										material_ticker: "NR",
										material_amount: 3,
									},
								],
							},
						},
					],
				},
			];

			const result = calculateMaterialIO(fakeData);

			expect(result).toStrictEqual([
				{
					input: 25,
					output: 0,
					ticker: "DW",
				},
				{
					input: 6.25,
					output: 0,
					ticker: "EPO",
				},
				{
					input: 3.75,
					output: 0,
					ticker: "MG",
				},
				{
					input: 1.25,
					output: 3.75,
					ticker: "O",
				},
				{
					input: 0,
					output: 3.75,
					ticker: "NR",
				},
			]);
		});

		it("Skip recipes which amount = 0", async () => {
			const { calculateMaterialIO } = await useBuildingCalculation();

			const fakeData: IProductionBuilding[] = [
				{
					amount: 1,
					totalBatchTime: 17280000 + 51840000,
					activeRecipes: [
						{
							recipeId: "foo",
							amount: 0,
							time: 17280000,
							// @ts-expect-error mock data
							recipe: {
								inputs: [
									{
										material_ticker: "DW",
										material_amount: 20,
									},
									{
										material_ticker: "EPO",
										material_amount: 5,
									},
								],
								outputs: [
									{
										material_ticker: "O",
										material_amount: 3,
									},
								],
							},
						},
						{
							recipeId: "moo",
							amount: 1,
							time: 51840000,
							// @ts-expect-error mock data
							recipe: {
								inputs: [
									{
										material_ticker: "MG",
										material_amount: 3,
									},
									{
										material_ticker: "O",
										material_amount: 1,
									},
								],
								outputs: [
									{
										material_ticker: "NR",
										material_amount: 3,
									},
								],
							},
						},
					],
				},
			];

			const result = calculateMaterialIO(fakeData);

			expect(result).toStrictEqual([
				{
					input: 3.75,
					output: 0,
					ticker: "MG",
				},
				{
					input: 1.25,
					output: 0,
					ticker: "O",
				},
				{
					input: 0,
					output: 3.75,
					ticker: "NR",
				},
			]);
		});
	});
});
