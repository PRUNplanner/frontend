// Types & Interfaces
import type { IPriceSource } from "@/features/cx/priceBook";
import type {
	IMaterialIOMinimal,
	IProductionBuildingRecipe,
} from "@/features/planning/usePlanCalculation.types";

/** what a calculated plan contributes that doesn't depend on prices */
export interface IExchangePlanBase {
	planUuid: string;
	planName: string;
	planet: string;
	empireUuid: string | undefined;
	// in an empire that uses the preference, else shown on request
	linked: boolean;
	// daily delta per material, < 0 bought, > 0 sold
	materials: { ticker: string; delta: number }[];
	// per active recipe, the inputs of calculateCOGM
	recipes: {
		recipe: IProductionBuildingRecipe;
		efficiency: number;
		// per building, priced like the engine does
		constructionMaterials: IMaterialIOMinimal[];
		workforceMaterials: IMaterialIOMinimal[];
	}[];
}

export interface IPlanetPrice {
	planet: string;
	price: number;
	source: IPriceSource;
}

/** one side (buy or sell) of a material across the planets using it */
export interface IMaterialSide {
	planets: IPlanetPrice[];
	min: number;
	max: number;
	// planets get different prices or sources
	varies: boolean;
}

export interface IMaterialPriceRow {
	ticker: string;
	buy: IMaterialSide | null;
	sell: IMaterialSide | null;
	// planets buying or selling it
	planets: string[];
}

export interface ICOGMEntry {
	planUuid: string;
	planName: string;
	planet: string;
	// COGM per unit
	value: number;
}

/** a material's COGM in the linked plans: the lowest and every plan */
export interface IMaterialCOGM {
	ticker: string;
	value: number;
	entries: ICOGMEntry[];
}
