import { describe, it, expect, beforeAll } from "vitest";

// Engine
import { calculateCOGM } from "@/features/planning/engine/cogm";
import {
	calculateMaterialIO,
	combineMaterialIOMinimal,
	enhanceMaterialIOMinimal,
} from "@/features/planning/engine/materialIO";
import { createPriceBook } from "@/features/cx/priceBook";
import { useExchangeData } from "@/database/services/useExchangeData";
import { usePlanContext } from "@/features/planning/usePlanContext";

// Types & Interfaces
import type { Recipe } from "@/features/api/schemas/gameData.schemas";
import type {
	IMaterialIOMinimal,
	IProductionBuilding,
	IProductionBuildingRecipe,
} from "@/features/planning/usePlanCalculation.types";

// test data
import recipes from "@/tests/test_data/api_data_recipes.json";
import { setupPlanningTestData } from "@/tests/features/planning/usePlanCalculation.fixtures";
import { golden } from "@/tests/golden";

/**
 * Golden: the ticker order the engine's COGM and material IO functions
 * produce from inputs in shuffled ticker order.
 */

const RECIPE_IDS = [
	"APF#1xHCP 1xNS 1xH2O 1xWAI 1xPCB 1xSAR 1xGV 1xFC 1xBAC=>1xAIR",
	"AML#2xZIR=>1xZR 2xSIO",
	"CHP#3xHAL 1xH2O=>2xNA 1xCL",
	"TNP#1xTCO=>1xTC 1xO",
];

// deterministic shuffle: every third element first, then the rest reversed
function shuffle<T>(list: T[]): T[] {
	const picked = list.filter((_, i) => i % 3 === 1);
	const rest = list.filter((_, i) => i % 3 !== 1).reverse();
	return [...picked, ...rest];
}

function recipe(id: string): Recipe {
	const r = structuredClone(recipes.find((e) => e.recipe_id === id)!);
	r.inputs = shuffle(r.inputs);
	r.outputs = shuffle(r.outputs);
	return r;
}

function activeRecipe(id: string, amount = 1): IProductionBuildingRecipe {
	return {
		recipeId: id,
		amount,
		recipe: { ...recipe(id), dailyRevenue: 0, roi: 0, profitPerArea: 0 },
		dailyShare: 0,
		time: 0,
		cogm: undefined,
	};
}

function building(
	name: string,
	ids: string[],
	amount: number
): IProductionBuilding {
	const activeRecipes = ids.map((id, i) => activeRecipe(id, i + 1));
	return {
		name,
		amount,
		activeRecipes,
		totalBatchTime: activeRecipes.reduce(
			(sum, ar) => sum + ar.recipe.time_ms * ar.amount,
			0
		),
	} as IProductionBuilding;
}

const minimal = (tickers: string[], scale: number): IMaterialIOMinimal[] =>
	tickers.map((ticker, i) => ({
		ticker,
		input: (i + 1) * scale,
		output: (tickers.length - i) * scale * 0.5,
	}));

describe("engine ticker order (golden)", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});

	it("COGM inputs and outputs", async () => {
		const prices = createPriceBook(
			undefined,
			undefined,
			useExchangeData().getExchangeTickerLoaded
		);
		const result = RECIPE_IDS.map((id) => {
			const ar = activeRecipe(id);
			return {
				recipeId: id,
				given: {
					inputs: ar.recipe.inputs.map((m) => m.material_ticker),
					outputs: ar.recipe.outputs.map((m) => m.material_ticker),
				},
				cogm: calculateCOGM(ar, 1.25, 250_000, 1_500, prices),
			};
		});

		await expect(golden(result)).toMatchFileSnapshot(
			"./__snapshots__/sortOrder.golden.json"
		);
	});

	it("material IO combine, enhance and production IO", async () => {
		const { materials } = await usePlanContext().loadGameData();
		const a = minimal(["SIO", "AL", "O", "FE", "H2O"], 2);
		const b = minimal(["H2O", "ZR", "AL", "C", "SIO", "BE"], 3);
		const c = minimal(["O", "CL", "NA", "AL"], 5);
		const combined = combineMaterialIOMinimal([a, b, c]);
		const production = calculateMaterialIO([
			building("TNP", [RECIPE_IDS[3]], 2),
			building("CHP", [RECIPE_IDS[2]], 3),
			building("AML", [RECIPE_IDS[1], "AML#2xBER=>1xBE 1xAL 1xSIO"], 1),
		]);

		await expect(
			golden({
				combined,
				enhanced: enhanceMaterialIOMinimal(materials, combined),
				production,
				productionEnhanced: enhanceMaterialIOMinimal(
					materials,
					production
				),
			})
		).toMatchFileSnapshot("./__snapshots__/sortOrder.materialIO.golden.json");
	});
});
