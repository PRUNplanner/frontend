import { useIndexedDBStore } from "@/database/composables/useIndexedDBStore";

// Types & Interfaces
import type {
	Building,
	Exchange,
	Material,
	Planet,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";

export const materialsStore = useIndexedDBStore<Material, "ticker">(
	"gamedata_materials",
	"ticker" as const
);

export const planetsStore = useIndexedDBStore<Planet, "planet_natural_id">(
	"gamedata_planets",
	"planet_natural_id" as const
);

export const exchangesStore = useIndexedDBStore<Exchange, "ticker_id">(
	"gamedata_exchanges",
	"ticker_id" as const
);

export const recipesStore = useIndexedDBStore<Recipe, "recipe_id">(
	"gamedata_recipes",
	"recipe_id" as const
);

export const buildingsStore = useIndexedDBStore<Building, "building_ticker">(
	"gamedata_buildings",
	"building_ticker" as const
);
