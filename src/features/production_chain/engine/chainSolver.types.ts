// Types & Interfaces
import type {
	Building,
	Exchange,
	Material,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";
import type { IPriceBook } from "@/features/cx/priceBook";

export type ChainSource = "make" | "buy" | "extract";
export type ChainRawSource = "buy" | "extract";
export type ChainByproductMode = "cover" | "sell";

export interface IChainTarget {
	ticker: string;
	perDay: number;
}

/** What the user chose; everything else falls back to the defaults */
export interface IChainInput {
	targets: IChainTarget[];
	/** global efficiency in %, 100 = base recipe times */
	efficiency: number;
	rawSource: ChainRawSource;
	byproducts: ChainByproductMode;
	/** per ticker overrides */
	source: Record<string, ChainSource>;
	recipeId: Record<string, string>;
	planetId: Record<string, string>;
}

/** One planet a material can be extracted on */
export interface IChainExtractionSite {
	planetId: string;
	planetName: string;
	/** units per extractor and day at 100 % */
	dailyExtraction: number;
	buildingTicker: string;
}

export interface IChainExtractionOptions {
	/** 90th percentile planet of all planets with the resource */
	typical: IChainExtractionSite;
	sites: IChainExtractionSite[];
}

/** Game data and prices the solver reads; plain maps, no Vue */
export interface IChainContext {
	/** recipes by output ticker, without extraction recipes */
	recipesByOutput: ReadonlyMap<string, Recipe[]>;
	buildings: ReadonlyMap<string, Building>;
	materials: ReadonlyMap<string, Material>;
	prices: IPriceBook;
	/** exchange data by id, e.g. "RAT.AI1"; throws when missing */
	getExchange: (tickerId: string) => Exchange;
	/** materials a planet resource can provide */
	resources: ReadonlySet<string>;
	/** per resource, undefined until the planet index is loaded */
	extraction?: ReadonlyMap<string, IChainExtractionOptions>;
}

export type ChainMarketLevel = "red" | "amber";

export interface IChainMarketShare {
	/** % of the 30 day average daily volume, null without trades */
	sharePct: number | null;
	level: ChainMarketLevel | null;
	exchange: string;
}

export interface IChainCostParts {
	/** per unit, after the joint output share */
	inputs: number;
	upkeepWear: number;
	/** share of the recipe's cost this output carries, 1 for one output */
	share: number;
}

export interface IChainRow {
	ticker: string;
	/** demand after byproduct cover */
	perDay: number;
	/** demand covered by byproducts */
	covered: number;
	source: ChainSource;
	target: boolean;
	/** what the user wants of it, 0 for intermediates */
	targetPerDay: number;
	canMake: boolean;
	canExtract: boolean;
	recipe: Recipe | null;
	recipeCount: number;
	defaultRecipeId: string | null;
	buildingTicker: string | null;
	/** exact buildings for this material */
	buildings: number;
	/** extraction site, null when not extracted or not loaded yet */
	site: IChainExtractionSite | null;
	typicalSite: boolean;
	/** extracting, but the planet index isn't loaded yet */
	pending: boolean;
	unitCost: number;
	costParts: IChainCostParts | null;
	/** CX BUY price, 0 without one */
	price: number;
	/** CX SELL price */
	sellPrice: number;
	/** exchange the material is priced on */
	exchange: string | null;
	/** consumers in the chain */
	users: string[];
	cheaper: boolean;
	/** buying it (or selling a target) against the CX volume */
	market: IChainMarketShare | null;
}

export interface IChainLink {
	input: string;
	consumer: string;
	perDay: number;
}

export interface IChainByproduct {
	ticker: string;
	produced: number;
	used: number;
	sold: number;
	from: string[];
	sellPrice: number;
	market: IChainMarketShare | null;
}

export interface IChainBuildingType {
	ticker: string;
	exact: number;
	built: number;
	materials: string[];
	expertise: string | null;
}

export interface IChainHab {
	ticker: string;
	amount: number;
	area: number;
}

export interface IChainTotals {
	targetsValue: number;
	byproductsValue: number;
	outputValue: number;
	bought: number;
	boughtCount: number;
	upkeep: number;
	wear: number;
	profit: number;
	built: number;
	exact: number;
	area: number;
	habArea: number;
	workforce: Record<WorkforceType, number>;
	expertise: Record<string, number>;
	construction: number;
	constructionMaterials: { ticker: string; amount: number }[];
	habs: IChainHab[];
	/** days, null without profit */
	payback: number | null;
}

export interface IChainWarnings {
	cheaper: string[];
	thin: string[];
	cycles: string[];
}

export interface IChainResult {
	/** inputs first, targets last */
	order: string[];
	rows: Record<string, IChainRow>;
	links: IChainLink[];
	byproducts: IChainByproduct[];
	buildingTypes: IChainBuildingType[];
	totals: IChainTotals;
	warnings: IChainWarnings;
}

export interface IChainRecipeEffect {
	recipe: Recipe;
	unitCost: number;
	inUse: boolean;
	isDefault: boolean;
	byproducts: boolean;
	deltaProfit: number;
	deltaBuilt: number;
}
