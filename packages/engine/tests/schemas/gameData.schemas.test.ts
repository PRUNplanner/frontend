import { describe, it, expect } from "vitest";
import {
	BuildingSchema,
	ExchangeSchema,
	MaterialSchema,
	PlanetSchema,
	RecipeSchema,
} from "../../src/schemas/gameData.schemas";

// test data
import { recipes } from "../fixtures/gameData";
import { buildings } from "../fixtures/gameData";
import { materials } from "../fixtures/gameData";
import { exchanges } from "../fixtures/gameData";
import { planets } from "../fixtures/gameData";

describe("RecipeSchema validation", () => {
	recipes.forEach((recipe: any) => {
		it(`Validate recipe ${recipe.RecipeId}`, () => {
			const result = RecipeSchema.safeParse(recipe);
			expect(result.success).toBe(true);
		});
	});
});

describe("BuildingSchema validation", () => {
	buildings.forEach((building: any) => {
		it(`Validate building ${building.Ticker}`, () => {
			const result = BuildingSchema.safeParse(building);
			expect(result.success).toBe(true);
		});
	});
});

describe("MaterialSchema validation", () => {
	materials.forEach((material: any) => {
		it(`Validate material ${material.Ticker}`, () => {
			const result = MaterialSchema.safeParse(material);
			expect(result.success).toBe(true);
		});
	});
});

describe("ExchangeSchema validation", () => {
	exchanges.forEach((exchange: any) => {
		it(`Validate exchange ${exchange.TickerId}`, () => {
			const result = ExchangeSchema.safeParse(exchange);
			expect(result.success).toBe(true);
		});
	});
});

describe("PlanetSchema validation", () => {
	planets.forEach((planet: any) => {
		it(`Validate planet ${planet.PlanetNaturalId}`, () => {
			const result = PlanetSchema.safeParse(planet);
			expect(result.success).toBe(true);
		});
	});
});
