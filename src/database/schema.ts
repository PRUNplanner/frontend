interface StoreSchema {
	keyPath: string;
	indexes?: IndexDef[];
}

interface IndexDef {
	name: string;
	keyPath: string;
	options?: IDBIndexParameters;
}

// define all stores in a schema object
export const DB_SCHEMA: Record<string, StoreSchema> = {
	gamedata_materials: {
		keyPath: "ticker",
		indexes: [
			{
				name: "byMaterialId",
				keyPath: "material_id",
				options: { unique: true },
			},
			{ name: "byCategoryId", keyPath: "category_id" },
		],
	},
	gamedata_planets: {
		keyPath: "planet_natural_id",
	},
	gamedata_exchanges: {
		keyPath: "ticker_id",
		indexes: [
			{
				name: "byMaterialTicker",
				keyPath: "ticker",
			},
			{
				name: "byExchangeCode",
				keyPath: "exchange_code",
			},
		],
	},
	gamedata_recipes: {
		keyPath: "recipe_id",
		indexes: [
			{
				name: "byBuildingTicker",
				keyPath: "building_ticker",
			},
		],
	},
	gamedata_buildings: {
		keyPath: "building_ticker",
	},
};
