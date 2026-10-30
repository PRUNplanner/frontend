import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isProxy, ref } from "vue";

import type {
	Exchange,
	Material,
	PlanetSearchIndexEntry,
} from "@/features/api/schemas/gameData.schemas";
import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";
import { memoryStorage } from "@/tests/memoryStorage";
import market_summary from "@/tests/test_data/api_data_market_summary.json";

vi.mock("@/features/api/gameData.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/features/api/gameData.api")>()),
	callDataMaterials: vi.fn(),
	callDataExchanges: vi.fn(),
	callMarketSummary: vi.fn(),
	callCXSparklines: vi.fn(),
	callDataPlanetSearchIndex: vi.fn(),
}));
vi.mock("@/lib/analytics/useAnalytics", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: vi.fn(),
}));

const MINUTE = 60_000;

function material(ticker: string): Material {
	return {
		material_id: ticker,
		category_name: "c",
		category_id: "c",
		name: ticker,
		ticker,
		weight: 1,
		volume: 1,
	};
}

function exchange(ticker_id: string): Exchange {
	return { ticker_id, ticker: "A", exchange_code: "AI1" } as Exchange;
}

// fresh modules per test: each query reports its first load once per tab
async function load() {
	// the background write waits 5 s, then for an idle main thread
	vi.stubEnv("VITE_GAME_DATA_WRITE_DELAY_MS", "0");
	vi.stubGlobal("requestIdleCallback", (fn: () => void) => setTimeout(fn, 0));
	const pinia = await import("pinia");
	pinia.setActivePinia(pinia.createPinia());
	const api = await import("@/features/api/gameData.api");
	return {
		api,
		trackEvent: (await import("@/lib/analytics/useAnalytics")).trackEvent,
		db: await import("@/database/composables/useIndexedDBStore"),
		useDB: (await import("@/database/composables/useDB")).useDB,
		stores: await import("@/database/stores"),
		util: await import("@/lib/query_cache/queries/queries.util"),
		queryStore: (await import("@/lib/query_cache/queryStore")).useQueryStore(),
	};
}

describe("game data queries: IndexedDB first", () => {
	let m: Awaited<ReturnType<typeof load>>;

	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		m = await load();
		vi.mocked(m.api.callDataMaterials).mockResolvedValue([material("NEW")]);
		vi.mocked(m.api.callDataExchanges).mockResolvedValue([
			exchange("NEW.AI1"),
		]);
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(async () => {
		// close this module's connection, so the next test's database resets
		await m.db.resetDB();
	});

	async function seedMaterials(ageMinutes: number) {
		await m.util.persistGameData(
			m.stores.materialsStore,
			[material("OLD")],
			Date.now() - ageMinutes * MINUTE
		);
	}

	const lastEvent = () => vi.mocked(m.trackEvent).mock.lastCall;

	it("fetches into an empty database, then writes rows and meta", async () => {
		const data = await m.queryStore.execute("GetMaterials", undefined);

		expect(data).toEqual([material("NEW")]);
		await vi.waitFor(() => expect(m.trackEvent).toHaveBeenCalledOnce());
		expect(lastEvent()).toEqual([
			"perf:gamedata_load",
			expect.objectContaining({
				store: "materials",
				source: "network",
				is_stale: false,
				age_min: null,
				ms_total: expect.any(Number),
				ms_fetch: expect.any(Number),
				ms_idb_read: expect.any(Number),
				ms_idb_write: expect.any(Number),
			}),
		]);
		expect(await m.stores.materialsStore.getAll()).toEqual([
			material("NEW"),
		]);
		expect(
			await m.stores.gamedataMetaStore.get("gamedata_materials")
		).toEqual({
			store: "gamedata_materials",
			fetchedAt: expect.any(Number),
			rows: 1,
		});

		// once per tab
		await m.queryStore.execute("GetMaterials", undefined, {
			forceRefetch: true,
		});
		await new Promise((r) => setTimeout(r, 20));
		expect(m.trackEvent).toHaveBeenCalledOnce();
	});

	it("renders a fresh copy without any request", async () => {
		await seedMaterials(60);

		const data = await m.queryStore.execute("GetMaterials", undefined);

		expect(data).toEqual([material("OLD")]);
		expect(m.useDB(m.stores.materialsStore).getLoaded("OLD")).toEqual(
			material("OLD")
		);
		expect(m.api.callDataMaterials).not.toHaveBeenCalled();
		expect(lastEvent()?.[1]).toMatchObject({
			source: "cache",
			is_stale: false,
			age_min: 60,
		});
	});

	it("renders materials 2 days old and refreshes them in the background", async () => {
		await seedMaterials(2 * 24 * 60);

		const data = await m.queryStore.execute("GetMaterials", undefined);

		expect(data).toEqual([material("OLD")]);
		await vi.waitFor(() => expect(m.trackEvent).toHaveBeenCalledOnce());
		expect(m.api.callDataMaterials).toHaveBeenCalledOnce();
		expect(lastEvent()?.[1]).toMatchObject({
			source: "cache",
			is_stale: true,
			age_min: 2 * 24 * 60,
			ms_fetch: expect.any(Number),
			ms_idb_write: expect.any(Number),
		});
		expect(await m.stores.materialsStore.getAll()).toEqual([
			material("NEW"),
		]);
	});

	it("waits for the fetch when materials are older than 7 days", async () => {
		await seedMaterials(8 * 24 * 60);

		const data = await m.queryStore.execute("GetMaterials", undefined);

		expect(data).toEqual([material("NEW")]);
		await vi.waitFor(() => expect(m.trackEvent).toHaveBeenCalledOnce());
		expect(lastEvent()?.[1]).toMatchObject({
			source: "network",
			is_stale: true,
			age_min: 8 * 24 * 60,
		});
	});

	it("never returns exchange prices older than 30 minutes", async () => {
		await m.util.persistGameData(
			m.stores.exchangesStore,
			[exchange("OLD.AI1")],
			Date.now() - 31 * MINUTE
		);

		const data = await m.queryStore.execute("GetExchanges", undefined);

		expect(data).toEqual([exchange("NEW.AI1")]);
		expect(m.api.callDataExchanges).toHaveBeenCalledOnce();
		// its background write ends before the next test
		await vi.waitFor(() => expect(m.trackEvent).toHaveBeenCalledOnce());
	});

	it("treats rows without a meta row as empty (a cut-off write)", async () => {
		await m.stores.materialsStore.setMany([material("HALF")], true);

		const data = await m.queryStore.execute("GetMaterials", undefined);

		expect(data).toEqual([material("NEW")]);
		expect(m.api.callDataMaterials).toHaveBeenCalledOnce();
		await vi.waitFor(() => expect(m.trackEvent).toHaveBeenCalledOnce());
	});
});

describe("game data queries: background write", () => {
	it("returns and fills memory before the IndexedDB write ends", async () => {
		vi.resetModules();
		vi.clearAllMocks();
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const m = await load();
		vi.mocked(m.api.callDataMaterials).mockResolvedValue([material("NEW")]);
		// every write hangs, reads go through
		const db = await m.db.getDB();
		const transaction = db.transaction.bind(db);
		const hanging = new Promise(() => {});
		const write = vi.spyOn(db, "transaction").mockImplementation(((
			stores: string[],
			mode?: IDBTransactionMode
		) =>
			mode === "readwrite"
				? {
						objectStore: () => ({
							delete: () => hanging,
							clear: () => hanging,
							put: () => hanging,
						}),
						done: hanging,
					}
				: transaction(stores, mode)) as never);

		const data = await m.queryStore.execute("GetMaterials", undefined);

		expect(data).toEqual([material("NEW")]);
		expect(m.useDB(m.stores.materialsStore).getLoaded("NEW")).toEqual(
			material("NEW")
		);
		await vi.waitFor(() =>
			expect(write).toHaveBeenCalledWith(
				["gamedata_materials", "gamedata_meta"],
				"readwrite"
			)
		);
		// its phases are reported when the write ends
		expect(m.trackEvent).not.toHaveBeenCalled();
		write.mockRestore();
		await m.db.resetDB();
	});
});

describe("market report queries", () => {
	const KEY = "prunplanner_market_summary";
	let m: Awaited<ReturnType<typeof load>>;
	const summary = market_summary as MarketSummary;

	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		vi.stubGlobal("localStorage", memoryStorage());
		m = await load();
		vi.mocked(m.api.callMarketSummary).mockResolvedValue(summary);
	});

	afterEach(() => vi.unstubAllGlobals());

	it("stores the fetched summary for the next visit", async () => {
		expect(await m.queryStore.execute("GetMarketSummary", undefined)).toBe(
			summary
		);
		expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(summary);
	});

	it("serves a stored summary at once, then always refreshes it", async () => {
		localStorage.setItem(KEY, JSON.stringify({ ...summary, as_of: 1 }));

		expect(
			(await m.queryStore.execute("GetMarketSummary", undefined)).as_of
		).toBe(1);
		await vi.waitFor(() =>
			expect(m.api.callMarketSummary).toHaveBeenCalledOnce()
		);
		await vi.waitFor(() =>
			expect(JSON.parse(localStorage.getItem(KEY)!).as_of).toBe(
				summary.as_of
			)
		);
	});

	it("ignores a stored copy that fails validation", async () => {
		localStorage.setItem(KEY, JSON.stringify({ as_of: "yesterday" }));
		expect(await m.queryStore.execute("GetMarketSummary", undefined)).toBe(
			summary
		);
	});

	it("sparklines keep their old key without the new params", async () => {
		const payload = { exchange: "AI1", days: 30, series: {} };
		vi.mocked(m.api.callCXSparklines).mockResolvedValue(payload);

		await m.queryStore.execute("GetCXSparklines", { exchange: "AI1" });
		await m.queryStore.execute("GetCXSparklines", {
			exchange: "AI1",
			days: 91,
			metric: "vwap_7d",
			tickers: ["DW"],
		});

		expect(Object.keys(m.queryStore.cacheState)).toEqual(
			expect.arrayContaining([
				'["gamedata","cxsparklines","AI1"]',
				'["gamedata","cxsparklines","AI1",91,"vwap_7d",["DW"]]',
			])
		);
		expect(m.api.callCXSparklines).toHaveBeenLastCalledWith(
			"AI1",
			91,
			"vwap_7d",
			["DW"]
		);
	});
});

describe("planet search index query", () => {
	it("stays raw on a cache hit, even inside a ref", async () => {
		vi.resetModules();
		const m = await load();
		const index = [
			{ planet_natural_id: "OT-580b" },
		] as PlanetSearchIndexEntry[];
		vi.mocked(m.api.callDataPlanetSearchIndex).mockResolvedValue(index);

		await m.queryStore.execute("GetPlanetSearchIndex", undefined);
		const hit = await m.queryStore.execute("GetPlanetSearchIndex", undefined);

		expect(hit).toBe(index);
		expect(m.api.callDataPlanetSearchIndex).toHaveBeenCalledOnce();
		expect(isProxy(hit)).toBe(false);
		expect(isProxy(ref(hit).value)).toBe(false);
	});
});
