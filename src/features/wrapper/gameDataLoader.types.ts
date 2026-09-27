import type {
	Building,
	Exchange,
	Material,
	Planet,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import { StepConfig } from "./dataLoader.types";

export type GameDataLoaderProps = {
	readonly minimal?: boolean | undefined;
	readonly loadMaterials?: boolean | undefined;
	readonly loadExchanges?: boolean | undefined;
	readonly loadBuildings?: boolean | undefined;
	readonly loadRecipes?: boolean | undefined;
	readonly loadPlanet?: string | undefined;
	readonly loadPlanetMultiple?: string[] | undefined;
};

export type GameDataLoaderEmits = {
	(e: "complete"): void;
	(e: "data:materials", data: Material[]): void;
	(e: "data:exchanges", data: Exchange[]): void;
	(e: "data:buildings", data: Building[]): void;
	(e: "data:recipes", data: Recipe[]): void;
	(e: "data:planet", data: Planet): void;
	(e: "data:planet:multiple", data: Planet[]): void;
};

export type GameDataStepConfigsType = [
	StepConfig<Material[]>,
	StepConfig<Exchange[]>,
	StepConfig<Building[]>,
	StepConfig<Recipe[]>,
	StepConfig<Planet>,
	StepConfig<Planet[]>,
];
