import { ref } from "vue";
import { beforeAll, describe, expect, it } from "vitest";
import { flushPromises } from "@vue/test-utils";

import { buildingsStore, recipesStore } from "@/database/stores";
import { IPlanDataBuilding } from "@/stores/planningStore.types";

// test data
import buildings from "@/tests/test_data/api_data_buildings.json";
import recipes from "@/tests/test_data/api_data_recipes.json";

// Composables
import { useBuildingData } from "@/database/services/useBuildingData";
import { usePlanCalculationHandlers } from "@/features/planning/usePlanCalculationHandlers";

describe("Planning: Workforce Calculations", async () => {
	beforeAll(async () => {
		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);
		const { preloadBuildings, preloadRecipes } = await useBuildingData();

		await preloadBuildings();
		await preloadRecipes();
		await flushPromises();
	});

	it("handleResetModified", async () => {
		const fakeName = ref(undefined);

		const { handleChangePlanName, modified, handleResetModified } =
			await usePlanCalculationHandlers(
				// @ts-expect-error mock data
				ref({}),
				ref({}),
				fakeName,
				ref({})
			);

		expect(modified.value).toBeFalsy();
		handleChangePlanName("moo");
		expect(modified.value).toBeTruthy();
		handleResetModified();
		expect(modified.value).toBeFalsy();
	});

	it("handleChangePlanName", async () => {
		const fakeName = ref(undefined);

		const { handleChangePlanName } = await usePlanCalculationHandlers(
			// @ts-expect-error mock data
			ref({}),
			ref({}),
			fakeName,
			ref({})
		);

		handleChangePlanName("moo");
		expect(fakeName.value).toBe("moo");
		handleChangePlanName(" moo");
		expect(fakeName.value).toBe("moo");
		handleChangePlanName("moo ");
		expect(fakeName.value).toBe("moo");
		handleChangePlanName(" moo ");
		expect(fakeName.value).toBe("moo");
	});

	it("handleUpdateCorpHQ", async () => {
		const fakePlanet = {
			plan_corphq: true,
		};

		const { handleUpdateCorpHQ } = await usePlanCalculationHandlers(
			// @ts-expect-error mock data
			ref(fakePlanet),
			ref({}),
			ref(),
			ref({})
		);

		handleUpdateCorpHQ(false);
		expect(fakePlanet.plan_corphq).toBeFalsy();
	});

	it("handleUpdateCOGC", async () => {
		const fakePlanet = {
			plan_cogc: "CHEMISTRY",
		};

		const { handleUpdateCOGC } = await usePlanCalculationHandlers(
			// @ts-expect-error mock data
			ref(fakePlanet),
			ref({}),
			ref(),
			ref({})
		);

		handleUpdateCOGC("CONSTRUCTION");
		expect(fakePlanet.plan_cogc).toBe("CONSTRUCTION");
	});

	describe("handleUpdateCOGC", async () => {
		it("permit value valid", async () => {
			const fakePlanet = {
				plan_permits_used: 1,
			};

			const { handleUpdatePermits } = await usePlanCalculationHandlers(
				// @ts-expect-error mock data
				ref(fakePlanet),
				ref({}),
				ref(),
				ref({})
			);

			handleUpdatePermits(2);
			expect(fakePlanet.plan_permits_used).toBe(2);
		});

		it("permit value valid, lower clamp", async () => {
			const fakePlanet = {
				plan_permits_used: 1,
			};

			const { handleUpdatePermits } = await usePlanCalculationHandlers(
				// @ts-expect-error mock data
				ref(fakePlanet),
				ref({}),
				ref(),
				ref({})
			);

			handleUpdatePermits(0);
			expect(fakePlanet.plan_permits_used).toBe(1);
		});

		it("permit value valid, upper clamp", async () => {
			const fakePlanet = {
				plan_permits_used: 1,
			};

			const { handleUpdatePermits } = await usePlanCalculationHandlers(
				// @ts-expect-error mock data
				ref(fakePlanet),
				ref({}),
				ref(),
				ref({})
			);

			handleUpdatePermits(4);
			expect(fakePlanet.plan_permits_used).toBe(3);
		});
	});

	describe("handleUpdateWorkforceLux", async () => {
		const fakePlanet = {
			workforce: [
				{
					type: "pioneer",
					lux1: false,
					lux2: false,
				},
			],
		};

		it("Found, lux 1", async () => {
			const { handleUpdateWorkforceLux } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlanet),
					ref(),
					ref({})
				);

			handleUpdateWorkforceLux("pioneer", "lux1", true);
			expect(fakePlanet.workforce[0].lux1).toBeTruthy;
		});

		it("Found, lux 2", async () => {
			const { handleUpdateWorkforceLux } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlanet),
					ref(),
					ref({})
				);

			handleUpdateWorkforceLux("pioneer", "lux2", true);
			expect(fakePlanet.workforce[0].lux2).toBeTruthy;
		});
	});

	describe("handleUpdateExpert", async () => {
		const fakePlanet = {
			experts: [
				{
					type: "Agriculture",
					amount: 0,
				},
			],
		};

		it("Update, valid value", async () => {
			const { handleUpdateExpert } = await usePlanCalculationHandlers(
				// @ts-expect-error mock data
				ref({}),
				ref(fakePlanet),
				ref(),
				ref({})
			);

			handleUpdateExpert("Agriculture", 2);
			expect(fakePlanet.experts[0].amount).toBe(2);
		});

		it("Update, invalid value lower clamp", async () => {
			const { handleUpdateExpert } = await usePlanCalculationHandlers(
				// @ts-expect-error mock data
				ref({}),
				ref(fakePlanet),
				ref(),
				ref({})
			);

			handleUpdateExpert("Agriculture", -1);
			expect(fakePlanet.experts[0].amount).toBe(0);
		});

		it("Update, invalid value upper clamp", async () => {
			const { handleUpdateExpert } = await usePlanCalculationHandlers(
				// @ts-expect-error mock data
				ref({}),
				ref(fakePlanet),
				ref(),
				ref({})
			);

			handleUpdateExpert("Agriculture", 6);
			expect(fakePlanet.experts[0].amount).toBe(5);
		});
	});

	describe("handleUpdateWorkforceLux", async () => {
		const fakePlan = {
			infrastructure: [
				{
					building: "HB1",
					amount: 0,
				},
			],
		};

		it("Update, existing infrastructure", async () => {
			const { handleUpdateInfrastructure } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref({})
				);

			handleUpdateInfrastructure("HB1", 6);
			expect(fakePlan.infrastructure[0].amount).toBe(6);
		});

		it("Update, infrastructure not yet existing", async () => {
			const { handleUpdateInfrastructure } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref({ infrastructure: [] }),
					ref(),
					ref({})
				);

			handleUpdateInfrastructure("HB1", 6);
			expect(fakePlan.infrastructure[0].amount).toBe(6);
		});
	});

	describe("handleUpdateBuildingAmount", async () => {
		const fakePlan = {
			buildings: [
				{
					name: "foo",
					amount: 0,
					active_recipes: [],
				},
			],
		};

		it("Update at valid index", async () => {
			const { handleUpdateBuildingAmount } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref({})
				);

			handleUpdateBuildingAmount(0, 6);
			expect(fakePlan.buildings[0].amount).toBe(6);
		});

		it("Update at invalid index", async () => {
			const { handleUpdateBuildingAmount } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref({})
				);

			expect(() => handleUpdateBuildingAmount(1, 6)).toThrowError();
		});
	});

	describe("handleDeleteBuilding", async () => {
		it("Delete at valid index: 0", async () => {
			const fakePlan = {
				buildings: [
					{
						name: "foo",
						amount: 0,
						active_recipes: [],
					},
					{
						name: "moo",
						amount: 0,
						active_recipes: [],
					},
				],
			};

			const { handleDeleteBuilding } = await usePlanCalculationHandlers(
				// @ts-expect-error mock data
				ref({}),
				ref(fakePlan),
				ref(),
				ref({})
			);

			handleDeleteBuilding(0);
			expect(fakePlan.buildings[0].name).toBe("moo");
			expect(fakePlan.buildings[1]).toBeUndefined();
		});

		it("Delete at valid index: > 0", async () => {
			const fakePlan = {
				buildings: [
					{
						name: "foo",
						amount: 0,
						active_recipes: [],
					},
					{
						name: "moo",
						amount: 0,
						active_recipes: [],
					},
				],
			};

			const { handleDeleteBuilding } = await usePlanCalculationHandlers(
				// @ts-expect-error mock data
				ref({}),
				ref(fakePlan),
				ref(),
				ref({})
			);

			handleDeleteBuilding(1);
			expect(fakePlan.buildings[1]).toBeUndefined();
		});

		it("Delete at invalid index", async () => {
			const fakePlan = {
				buildings: [
					{
						name: "foo",
						amount: 0,
						active_recipes: [],
					},
					{
						name: "moo",
						amount: 0,
						active_recipes: [],
					},
				],
			};

			const { handleDeleteBuilding } = await usePlanCalculationHandlers(
				// @ts-expect-error mock data
				ref({}),
				ref(fakePlan),
				ref(),
				ref({})
			);

			expect(() => handleDeleteBuilding(999)).toThrowError();
		});
	});

	describe("handleCreateBuilding", async () => {
		it("Update, invalid value upper clamp", async () => {
			const fakePlan = {
				buildings: [],
			};

			const { handleCreateBuilding } = await usePlanCalculationHandlers(
				// @ts-expect-error mock data
				ref({}),
				ref(fakePlan),
				ref(),
				ref({})
			);

			expect(fakePlan.buildings.length).toBe(0);
			await handleCreateBuilding("BMP");
			expect(fakePlan.buildings.length).toBe(1);
		});
	});

	describe("handleCreateBuildingAndRecipe", async () => {
		it("Create and add Recipe", async () => {
			const fakePlan: { buildings: IPlanDataBuilding[] } = {
				buildings: [],
			};

			const { handleCreateBuildingAndRecipe } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref({})
				);

			expect(fakePlan.buildings.length).toBe(0);
			await handleCreateBuildingAndRecipe("EXT", "EXT#FEO");
			expect(fakePlan.buildings.length).toBe(1);
			expect(fakePlan.buildings[0].name).toBe("EXT");
			expect(fakePlan.buildings[0].active_recipes.length).toBe(1);
			await handleCreateBuildingAndRecipe("EXT", "EXT#FEO");
			expect(fakePlan.buildings.length).toBe(1);
			expect(fakePlan.buildings[0].active_recipes.length).toBe(1);
		});
	});

	describe("handleUpdateBuildingRecipeAmount", async () => {
		it("Update Amount, invalid building index", async () => {
			const fakePlan = {
				buildings: [],
			};

			const { handleUpdateBuildingRecipeAmount } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref({})
				);

			expect(() =>
				handleUpdateBuildingRecipeAmount(0, 0, 5)
			).toThrowError();
		});

		it("Update Amount, invalid recipe index", async () => {
			const fakePlan = {
				buildings: [
					{
						active_recipes: [],
					},
				],
			};

			const { handleUpdateBuildingRecipeAmount } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref({})
				);

			expect(() =>
				handleUpdateBuildingRecipeAmount(0, 0, 5)
			).toThrowError();
		});

		it("Update Amount, valid update", async () => {
			const fakePlan = {
				buildings: [
					{
						active_recipes: [
							{
								amount: 0,
							},
						],
					},
				],
			};

			const { handleUpdateBuildingRecipeAmount } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref({})
				);

			handleUpdateBuildingRecipeAmount(0, 0, 100);
			expect(fakePlan.buildings[0].active_recipes[0].amount).toBe(100);
		});
	});

	describe("handleDeleteBuildingRecipe", async () => {
		it("Delete Recipe, invalid building index", async () => {
			const fakePlan = {
				buildings: [],
			};

			const { handleDeleteBuildingRecipe } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref({})
				);

			expect(() => handleDeleteBuildingRecipe(0, 0)).toThrowError();
		});

		it("Delete Recipe, invalid recipe index", async () => {
			const fakePlan = {
				buildings: [
					{
						active_recipes: [],
					},
				],
			};

			const { handleDeleteBuildingRecipe } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref({})
				);

			expect(() => handleDeleteBuildingRecipe(0, 0)).toThrowError();
		});

		it("Delete Recipe, valid deletion, first index", async () => {
			const fakePlan = {
				buildings: [
					{
						active_recipes: [
							{
								amount: 0,
							},
						],
					},
				],
			};

			const { handleDeleteBuildingRecipe } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref({})
				);

			handleDeleteBuildingRecipe(0, 0);
			expect(fakePlan.buildings[0].active_recipes.length).toBe(0);
		});

		it("Delete Recipe, valid deletion, other index", async () => {
			const fakePlan = {
				buildings: [
					{
						active_recipes: [
							{
								amount: 0,
							},
							{
								amount: 0,
							},
						],
					},
				],
			};

			const { handleDeleteBuildingRecipe } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref({})
				);

			handleDeleteBuildingRecipe(0, 1);
			expect(fakePlan.buildings[0].active_recipes.length).toBe(1);
		});
	});

	describe("handleAddBuildingRecipe", async () => {
		it("Add Recipe, invalid building index", async () => {
			const fakePlan = {
				buildings: [],
			};

			const { handleAddBuildingRecipe } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref({})
				);

			expect(() => handleAddBuildingRecipe(0)).toThrowError();
		});

		it("Add Recipe, undefined production building", async () => {
			const fakePlan = {
				buildings: [{}],
			};

			const fakePlanResult = {
				production: {
					buildings: [undefined],
				},
			};

			const { handleAddBuildingRecipe } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref(fakePlanResult)
				);

			expect(() => handleAddBuildingRecipe(0)).toThrowError();
		});

		it("Add Recipe, no recipe options at production building", async () => {
			const fakePlan = {
				buildings: [{}],
			};

			const fakePlanResult = {
				production: {
					buildings: [
						{
							recipeOptions: [],
						},
					],
				},
			};

			const { handleAddBuildingRecipe } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref(fakePlanResult)
				);

			expect(() => handleAddBuildingRecipe(0)).toThrowError();
		});

		it("Add Recipe, valid add", async () => {
			const fakePlan = {
				buildings: [
					{
						active_recipes: [],
					},
				],
			};

			const fakePlanResult = {
				production: {
					buildings: [
						{
							recipeOptions: [{ RecipeId: "moo" }],
						},
					],
				},
			};

			const { handleAddBuildingRecipe } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref(fakePlanResult)
				);

			handleAddBuildingRecipe(0);
			expect(fakePlan.buildings[0].active_recipes.length).toBe(1);
		});
	});

	describe("handleAddBuildingRecipe", async () => {
		it("Change, wrong building Index", async () => {
			const fakePlan = {
				buildings: [],
			};

			const fakePlanResult = {
				production: {
					buildings: [],
				},
			};

			const { handleChangeBuildingRecipe } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref(fakePlanResult)
				);

			expect(() =>
				handleChangeBuildingRecipe(0, 0, "moo")
			).toThrowError();
		});

		it("Change, wrong recipe Index", async () => {
			const fakePlan = {
				buildings: [
					{
						active_recipes: [],
					},
				],
			};

			const fakePlanResult = {
				production: {
					buildings: [],
				},
			};

			const { handleChangeBuildingRecipe } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref(fakePlanResult)
				);

			expect(() =>
				handleChangeBuildingRecipe(0, 0, "moo")
			).toThrowError();
		});

		it("Change Recipe, valid change", async () => {
			const fakePlan = {
				buildings: [
					{
						active_recipes: [
							{
								recipeid: "foo",
							},
						],
					},
				],
			};

			const fakePlanResult = {
				production: {
					buildings: [
						{
							recipeOptions: [{ RecipeId: "13" }],
						},
					],
				},
			};

			const { handleChangeBuildingRecipe } =
				await usePlanCalculationHandlers(
					// @ts-expect-error mock data
					ref({}),
					ref(fakePlan),
					ref(),
					ref(fakePlanResult)
				);

			handleChangeBuildingRecipe(0, 0, "moo");
			expect(fakePlan.buildings[0].active_recipes.length).toBe(1);
			expect(fakePlan.buildings[0].active_recipes[0].recipeid).toBe(
				"moo"
			);
		});
	});
});
