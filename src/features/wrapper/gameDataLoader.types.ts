import type {
	Building,
	Exchange,
	Material,
	Planet,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import type { StepState } from "@/features/wrapper/dataLoader.types";

export interface GameDataLoaderProps {
	readonly minimal?: boolean | undefined;
	readonly loadMaterials?: boolean | undefined;
	readonly loadExchanges?: boolean | undefined;
	readonly loadBuildings?: boolean | undefined;
	readonly loadRecipes?: boolean | undefined;
	readonly loadPlanet?: string | undefined;
	readonly loadPlanetMultiple?: string[] | undefined;
}

export interface GameDataLoaderEmits {
	(e: "complete"): void;
	(e: "data:materials", data: Material[]): void;
	(e: "data:exchanges", data: Exchange[]): void;
	(e: "data:buildings", data: Building[]): void;
	(e: "data:recipes", data: Recipe[]): void;
	(e: "data:planet", data: Planet): void;
	(e: "data:planet:multiple", data: Planet[]): void;
}

export interface GameDataSteps {
	material: StepState<Material[]>;
	exchange: StepState<Exchange[]>;
	building: StepState<Building[]>;
	recipe: StepState<Recipe[]>;
	planet: StepState<Planet>;
	planetMultiple: StepState<Planet[]>;
}
