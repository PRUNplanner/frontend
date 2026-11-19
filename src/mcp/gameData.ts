// Engine
import { groupRecipesByBuilding } from "@/features/planning/engine/buildings";

// Schemas
import {
	BuildingPayloadSchema,
	CXSparklinesSchema,
	ExchangePayloadSchema,
	MaterialPayloadSchema,
	PlanetSchema,
	PlanetSearchIndexSchema,
	RecipePayloadSchema,
} from "@/features/api/schemas/gameData.schemas";

// Util
import { ToolError } from "@/mcp/backend";
import { planetDisplayName } from "@/util/planetName";

import { MarketSummarySchema } from "@/features/api/schemas/marketSummary.schemas";
import { AnalyticsMaterialInsightsSchema } from "@/features/api/schemas/analyticsData.schemas";
import { ExplorationPayloadSchema } from "@/features/market_exploration/marketExploration.schemas";

// Types & Interfaces
import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";
import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";
import type { IBackend } from "@/mcp/backend";
import type { IGameData } from "@/features/planning/engine/engine.types";
import type {
	Building,
	CXSparklines,
	Exchange,
	Material,
	Planet,
	PlanetSearchIndexEntry,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";

/** game data plus the lookups the tools need besides the engine's maps */
export interface IMcpGameData extends IGameData {
	recipes: Recipe[];
	exchanges: ReadonlyMap<string, Exchange>;
	// exchange data by ticker id ("RAT.UNIVERSE"), throws if missing
	getExchange: (tickerId: string) => Exchange;
}

const MINUTE = 60_000;
// the frontend's VITE_GAME_DATA_STALE_MINUTES_* defaults
const TTL = { static: 1440, exchanges: 30, planets: 180 };

const cache = new Map<string, { at: number; value: Promise<unknown> }>();
const CACHE_MAX = 1000;

/**
 * One cached value for every user of the server; a failed load is not
 * kept, and concurrent calls share the request in flight
 */
function cached<T>(
	key: string,
	ttlMinutes: number,
	load: () => Promise<T>
): Promise<T> {
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < ttlMinutes * MINUTE) {
		// most recently used last, so game data outlives a run of planets
		cache.delete(key);
		cache.set(key, hit);
		return hit.value as Promise<T>;
	}
	const value = load();
	const entry = { at: Date.now(), value };
	cache.delete(key);
	cache.set(key, entry);
	// the server shares 4 GB with the whole stack: planets and other entries
	// stay bounded, the oldest go first
	while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
	value.catch(() => {
		if (cache.get(key) === entry) cache.delete(key);
	});
	return value;
}

export const getMaterials = (b: IBackend): Promise<Material[]> =>
	cached("materials", TTL.static, () =>
		b.get("/data/materials/", MaterialPayloadSchema, false)
	);
const getBuildings = (b: IBackend): Promise<Building[]> =>
	cached("buildings", TTL.static, () =>
		b.get("/data/buildings/", BuildingPayloadSchema, false)
	);
const getRecipes = (b: IBackend): Promise<Recipe[]> =>
	cached("recipes", TTL.static, () =>
		b.get("/data/recipes/", RecipePayloadSchema, false)
	);
export const getExchanges = (b: IBackend): Promise<Exchange[]> =>
	cached("exchanges", TTL.exchanges, () =>
		b.get("/data/exchanges/", ExchangePayloadSchema, false)
	);
const PLANET_ID = /^[A-Z]{2}-\d{3}[a-z]+$/i;

/**
 * A planet's natural id from an id in any case ("kw-688c") or its name
 * ("Etherwind", "Antares II b"); several or no matches are a tool error
 * @author jplacht
 *
 * @param {IBackend} b Backend client
 * @param {string} query Planet id or name
 * @returns {Promise<string>} Natural id, e.g. KW-688c
 */
export async function resolvePlanetId(
	b: IBackend,
	query: string
): Promise<string> {
	const q = query.trim();
	if (PLANET_ID.test(q))
		return q.slice(0, 6).toUpperCase() + q.slice(6).toLowerCase();
	const lower = q.toLowerCase();
	const index = await getPlanetSearchIndex(b);
	const names = (p: PlanetSearchIndexEntry) => [
		(p.planet_name ?? "").toLowerCase(),
		planetDisplayName(p.planet_natural_id, p.planet_name).toLowerCase(),
	];
	let found = index.filter((p) => names(p).includes(lower));
	if (!found.length)
		found = index.filter((p) => names(p).some((n) => n.includes(lower)));
	if (found.length === 1) return found[0].planet_natural_id;
	if (!found.length)
		throw new ToolError(
			`No planet named "${q}". Pass its id (like OT-580b) or search with find_planets name.`
		);
	throw new ToolError(
		`"${q}" matches ${found.length} planets: ${found
			.slice(0, 10)
			.map(
				(p) =>
					`${planetDisplayName(p.planet_natural_id, p.planet_name)} (${p.planet_natural_id})`
			)
			.join(", ")}${found.length > 10 ? ", …" : ""}. Pass the id.`
	);
}

/** a planet by its id or name, cached */
export async function getPlanet(
	b: IBackend,
	idOrName: string
): Promise<Planet> {
	const id = await resolvePlanetId(b, idOrName);
	return cached(`planet:${id}`, TTL.planets, () =>
		b.get(`/data/planet/${encodeURIComponent(id)}/`, PlanetSchema, false)
	);
}
export const getPlanetSearchIndex = (
	b: IBackend
): Promise<PlanetSearchIndexEntry[]> =>
	cached("search-index", TTL.planets, () =>
		b.get("/data/planets/search-index/", PlanetSearchIndexSchema, false)
	);

const HISTORY_MAX = 200;
// a history row packed as numbers, 7 per day: about 0.25 MB a material
// instead of about 1 MB as objects
const PACKED = [
	"date_epoch",
	"open_p",
	"close_p",
	"high_p",
	"low_p",
	"volume",
	"traded",
] as const;
const history = new Map<
	string,
	{ at: number; value: Promise<Map<string, Float64Array>> }
>();

/**
 * One material's full daily history per exchange (Market Exploration's
 * data): one request for all exchanges, shared by every user for an hour;
 * at most HISTORY_MAX materials stay, the least recently used go first.
 * Sent with the user's key, so the backend counts it against that user's
 * budget, not the server's IP
 */
export async function getHistory(
	b: IBackend,
	ticker: string,
	exchange: string
): Promise<Exploration[]> {
	let hit = history.get(ticker);
	if (!hit || Date.now() - hit.at >= 60 * MINUTE) {
		const value = b
			.get(
				`/data/cxpc/${encodeURIComponent(ticker)}/`,
				ExplorationPayloadSchema
			)
			.then((rows) => {
				const byExchange = new Map<string, Exploration[]>();
				for (const r of rows) {
					const list = byExchange.get(r.exchange_code) ?? [];
					list.push(r);
					byExchange.set(r.exchange_code, list);
				}
				return new Map(
					[...byExchange].map(([code, list]) => [
						code,
						Float64Array.from(
							list.flatMap((r) => PACKED.map((k) => r[k]))
						),
					])
				);
			});
		hit = { at: Date.now(), value };
		const entry = hit;
		// only this entry: a newer one for the ticker may have replaced it
		value.catch(() => {
			if (history.get(ticker) === entry) history.delete(ticker);
		});
	}
	// most recently used last; concurrent calls share the request in flight
	history.delete(ticker);
	history.set(ticker, hit);
	// ponytail: count-capped LRU (~0.25 MB a material); cap by bytes if memory gets tight
	while (history.size > HISTORY_MAX)
		history.delete(history.keys().next().value!);
	const packed = (await hit.value).get(exchange);
	if (!packed) return [];
	const rows: Exploration[] = [];
	for (let i = 0; i < packed.length; i += PACKED.length) {
		const row = { ticker, exchange_code: exchange } as Exploration;
		PACKED.forEach((k, j) => (row[k] = packed[i + j]));
		rows.push(row);
	}
	return rows;
}

/** what planned_by_players means, for every tool that shows it */
export const PLANNED_NOTE =
	"planned_by_players: what PRUNplanner players' empires changed in the last 30 days plan per day. Plans are intentions, not output; players outside PRUNplanner aren't counted, and a plan in several empires counts in each.";

export interface IPlannedMaterial {
	production: number;
	consumption: number;
	net: number;
}

/**
 * What PRUNplanner players' empires (changed in the last 30 days) plan per
 * material and day, from the empire states the Empire page (and the MCP)
 * store; public, shared by every user for an hour
 */
export const getPlannedMaterials = (
	b: IBackend
): Promise<Map<string, IPlannedMaterial>> =>
	cached("planned-materials", 60, () =>
		b
			.get(
				"/analytics/planning_insights/materials/",
				AnalyticsMaterialInsightsSchema,
				false
			)
			.then(
				(rows) =>
					new Map(
						rows.map(([ticker, production, consumption, net]) => [
							ticker,
							{ production, consumption, net },
						])
					)
			)
	);

/** the public market report's summary, as long as the edge keeps it */
export const getMarketSummary = (b: IBackend): Promise<MarketSummary> =>
	cached("market-summary", 15, () =>
		b.get("/data/market/summary/", MarketSummarySchema, false)
	);

/**
 * Daily VWAP of every ticker on one exchange for the last 30 days, oldest
 * first; one request per exchange and hour for every user (the endpoint is
 * throttled per IP)
 */
export const getSparks = (
	b: IBackend,
	exchange: string
): Promise<CXSparklines> =>
	cached(`spark:${exchange}`, 60, () =>
		b.get(
			`/data/cxpc/spark/${encodeURIComponent(exchange)}/?days=30`,
			CXSparklinesSchema,
			false
		)
	);

/**
 * A 30-day daily VWAP series summed up: range, median, last, trend (the
 * last 7 trading days against the first 7)
 * @author jplacht
 */
export function historySummary(series: (number | null)[] | undefined) {
	const values = (series ?? []).filter((v): v is number => v !== null);
	if (!values.length) return null;
	// the series runs up to today (oldest first): how old the last trade is
	const lastIndex = series!.reduce<number>(
		(at, v, i) => (v !== null ? i : at),
		-1
	);
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	const median =
		sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
	const avg = (list: number[]) =>
		list.reduce((s, v) => s + v, 0) / list.length;
	const head = avg(values.slice(0, 7));
	const tail = avg(values.slice(-7));
	const r = (v: number) => Math.round(v * 100) / 100;
	return {
		days_traded: values.length,
		min: r(sorted[0]),
		median: r(median),
		max: r(sorted[sorted.length - 1]),
		last: r(values[values.length - 1]),
		last_days_ago: series!.length - 1 - lastIndex,
		trend_pct:
			values.length >= 14 && head
				? r(((tail - head) / head) * 100)
				: null,
	};
}

// maps built from the last loaded arrays, rebuilt when one of them reloads
let derived: { sources: unknown[]; data: IMcpGameData } | undefined;

/**
 * Game data for the engine and the tools, like usePlanContext.loadGameData
 * @author jplacht
 *
 * @param {IBackend} b Backend client
 * @returns {Promise<IMcpGameData>} Game data
 */
export async function loadGameData(b: IBackend): Promise<IMcpGameData> {
	const sources = await Promise.all([
		getMaterials(b),
		getBuildings(b),
		getRecipes(b),
		getExchanges(b),
	]);
	if (derived && derived.sources.every((s, i) => s === sources[i]))
		return derived.data;

	const [materials, buildings, recipes, exchangeList] = sources;
	const exchanges = new Map(exchangeList.map((e) => [e.ticker_id, e]));
	const data: IMcpGameData = {
		materials: new Map(materials.map((m) => [m.ticker, m])),
		buildings: new Map(buildings.map((m) => [m.building_ticker, m])),
		recipesByBuilding: groupRecipesByBuilding(recipes),
		recipes,
		exchanges,
		getExchange(tickerId) {
			const exchange = exchanges.get(tickerId);
			if (!exchange)
				throw new Error(
					`Exchange data for ticker '${tickerId}' not found.`
				);
			return exchange;
		},
	};
	derived = { sources, data };
	return data;
}
