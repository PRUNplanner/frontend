// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// Engine
import {
	getBuildingRecipes,
	groupRecipesByBuilding,
} from "@prunplanner/engine";
import {
	starterCandidates,
	starterExperts,
	typicalRecipes,
} from "@/features/plan_analytics/planInsights.util";

// MCP
import { createBackend } from "@/mcp/backend";
import { suggestBase } from "@/mcp/tools/suggestBase";
import {
	API_KEY,
	fakeBackend,
	fixtures,
	type IFakeBackend,
} from "@/tests/mcp/fakeBackend";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";
import type { Planet, Recipe } from "@prunplanner/engine/schemas";
import type { AnalyticsPlanetInsightsBuilding } from "@/features/api/schemas/analyticsData.schemas";

const PLANET = "KW-688c";
const INSIGHTS = /^\/analytics\/planet_insights\/[^/]+\/$/;

const building = (
	ticker: string,
	percentage: number,
	median_amount: number,
	extra: Partial<AnalyticsPlanetInsightsBuilding> = {}
): AnalyticsPlanetInsightsBuilding => ({
	ticker,
	plans: 10,
	users: 5,
	percentage,
	median_amount,
	recipes: [],
	mixes: [],
	...extra,
});
const recipe = (recipe_id: string, percentage: number, median_amount = 1) => ({
	recipe_id,
	plans: 5,
	percentage,
	median_amount,
});

// 9 buildings, least planned first: the tool sorts like the app
const BUILDINGS = [
	building("BMP", 3, 1),
	building("CHP", 5, 1),
	building("FRM", 8, 1),
	building("SME", 10, 1),
	building("INC", 19.9, 1),
	building("PP1", 25, 1.4, {
		recipes: [recipe("PP1#150xPE=>1xBDE", 40, 2)],
	}),
	building("EXT", 40, 2.6, { recipes: [recipe("EXT#SIO", 90)] }),
	building("RIG", 60, 1, { recipes: [recipe("RIG#H2O", 100)] }),
	building("FP", 90, 2.5, {
		recipes: [recipe("FP#10xH2O=>7xDW", 70)],
		// FP#unknown is not a recipe FP can run
		mixes: [
			{
				recipe_ids: ["FP#10xH2O=>7xDW", "FP#unknown"],
				plans: 5,
				percentage: 40,
				median_building_amount: 3,
				recipe_amounts: { "FP#10xH2O=>7xDW": 2, "FP#unknown": 1 },
			},
		],
	}),
];
const EXPERTS = [
	{ type: "Agriculture", plans_percentage: 80, median_amount: 2 },
	{ type: "Chemistry", plans_percentage: 20, median_amount: 1 },
];
const PAYLOAD = {
	status: "success",
	planet_natural_id: PLANET,
	total_plans_analyzed: 42,
	total_users: 17,
	insights_data: {
		expert_distribution: [],
		building_distribution: [],
		recipe_distribution: {},
		buildings: BUILDINGS,
		experts: EXPERTS,
	},
	last_updated: "2026-11-16T10:00:00Z",
};

let backend: IFakeBackend;
const run = (args: Record<string, unknown>, payload: unknown = PAYLOAD) => {
	backend = fakeBackend(undefined, [[INSIGHTS, payload]]);
	const env: IToolEnv = {
		appUrl: "https://app.test",
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		}),
	};
	return suggestBase.run(
		{ planet_natural_id: PLANET, ...args } as never,
		env
	) as Promise<{ text: string; data: any }>;
};

/** the starter card's candidates for the payload, as the app builds them */
function appCandidates() {
	const popular = [...BUILDINGS].sort((a, b) => b.percentage - a.percentage);
	const recipesByBuilding = groupRecipesByBuilding(
		fixtures.recipes as unknown as Recipe[]
	);
	const planet = fixtures.planet as unknown as Planet;
	return starterCandidates(
		popular,
		(t) => typicalRecipes(popular.find((b) => b.ticker === t)),
		(t) => getBuildingRecipes(recipesByBuilding, t, planet.resources)
	);
}

describe("suggest_base", () => {
	beforeEach(() => {
		backend = fakeBackend();
	});

	it("returns the app's starter setup and calculates it", async () => {
		const { text, data } = await run({});
		const app = appCandidates();

		expect(data.plans_analyzed).toBe(42);
		expect(data.others_run.buildings.map((b: any) => b.ticker)).toEqual([
			"FP",
			"RIG",
			"EXT",
			"PP1",
			"INC",
			"SME",
			"FRM",
			"CHP",
			"BMP",
		]);
		expect(data.starter_setup.buildings).toEqual(
			app.map((c) => ({
				ticker: c.ticker,
				in_plans_percentage: c.percentage,
				amount: c.amount,
				recipes: c.recipes.map((r) => ({
					recipe_id: r.recipeid,
					amount: r.amount,
				})),
				outputs: c.outputs,
				selected: c.percentage >= 20,
			}))
		);
		// the 8 most planned; FP keeps only the recipe it can run
		expect(app).toHaveLength(8);
		expect(app[0]).toMatchObject({
			ticker: "FP",
			amount: 3,
			recipes: [{ recipeid: "FP#10xH2O=>7xDW", amount: 2 }],
		});
		expect(data.starter_setup.experts).toEqual(starterExperts(EXPERTS));
		expect(data.starter_setup.experts).toEqual([
			{ type: "Agriculture", amount: 2 },
		]);

		const calc = data.calculation;
		expect(calc.habitation).toBe(
			"Habs sized by the plan editor's optimiser (auto)."
		);
		expect(
			calc.buildings.map((b: any) => [
				b.ticker,
				b.amount,
				b.recipes.map((r: any) => [r.recipe_id, r.amount]),
			])
		).toEqual([
			["FP", 3, [["FP#10xH2O=>7xDW", 2]]],
			["RIG", 1, [["RIG#H2O", 1]]],
			["EXT", 3, [["EXT#SIO", 1]]],
			["PP1", 1, [["PP1#150xPE=>1xBDE", 2]]],
		]);
		expect(Object.keys(calc.infrastructure).length).toBeGreaterThan(0);
		expect(calc.price_basis.basis).toBe("plan");
		expect(text).toContain("profit");

		expect(backend.requests.every((r) => r.method === "GET")).toBe(true);
		expect(backend.requests.map((r) => r.path)).toContain(
			`/analytics/planet_insights/${PLANET}/`
		);
	});

	it("takes a planet name: insights are asked for its exact id", async () => {
		const { data } = await run({
			planet_natural_id: "etherwind",
			calculate: false,
		});
		expect(data.planet).toBe(PLANET);
		expect(backend.requests.map((r) => r.path)).toContain(
			`/analytics/planet_insights/${PLANET}/`
		);
	});

	it("adds included starter buildings, rejects others", async () => {
		const { data } = await run({ include: ["inc"], calculate: false });
		expect(
			data.starter_setup.buildings
				.filter((b: any) => b.selected)
				.map((b: any) => b.ticker)
		).toEqual(["FP", "RIG", "EXT", "PP1", "INC"]);
		expect(data.calculation).toBeUndefined();

		await expect(run({ include: ["BMP"] })).rejects.toThrow(
			"BMP not in the starter setup of KW-688c"
		);
	});

	it("says when the planet has too few plans", async () => {
		const { text, data } = await run(
			{},
			{
				status: "below_threshold",
				planet_natural_id: PLANET,
				total_plans_analyzed: 0,
			}
		);
		expect(text).toContain("Too few plans");
		expect(data).toMatchObject({
			status: "below_threshold",
			plans_analyzed: 0,
		});
		expect(data.calculation).toBeUndefined();
	});
});
