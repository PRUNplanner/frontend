import { useIndexedDBStore } from "@/database/composables/useIndexedDBStore";

// Types & Interfaces
import {
	IBuilding,
	IExchange,
	IMaterial,
	IPlanet,
	IRecipe,
} from "@/features/api/gameData.types";

export const materialsStore = useIndexedDBStore<IMaterial, "ticker">(
	"gamedata_materials",
	"ticker" as const
);

export const planetsStore = useIndexedDBStore<IPlanet, "planet_natural_id">(
	"gamedata_planets",
	"planet_natural_id" as const
);

export const exchangesStore = useIndexedDBStore<IExchange, "ticker_id">(
	"gamedata_exchanges",
	"ticker_id" as const
);

export const recipesStore = useIndexedDBStore<IRecipe, "recipe_id">(
	"gamedata_recipes",
	"recipe_id" as const
);

export const buildingsStore = useIndexedDBStore<IBuilding, "building_ticker">(
	"gamedata_buildings",
	"building_ticker" as const
);
