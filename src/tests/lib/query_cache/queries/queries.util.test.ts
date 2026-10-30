import { describe, it, expect, vi, beforeEach } from "vitest";

import { useDB } from "@/database/composables/useDB";
import {
	getDB,
	resetDB,
	useIndexedDBStore,
} from "@/database/composables/useIndexedDBStore";
import {
	persistGameData,
	readGameData,
	storeAndPreload,
	whenIdle,
} from "@/lib/query_cache/queries/queries.util";
import { gamedataMetaStore } from "@/database/stores";

import type { Material } from "@/features/api/schemas/gameData.schemas";

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

describe("storeAndPreload", () => {
	// a fresh handle per test, so the shared in-memory state starts empty
	let store: ReturnType<typeof useIndexedDBStore<Material, "ticker">>;

	beforeEach(async () => {
		await resetDB();
		store = useIndexedDBStore<Material, "ticker">(
			"gamedata_materials",
			"ticker"
		);
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	it("writes to IndexedDB and preloads", async () => {
		await storeAndPreload(store, [material("A")], true);

		expect(await store.getAll()).toEqual([material("A")]);
		expect(useDB(store).getLoaded("A")).toEqual(material("A"));
		expect(console.warn).not.toHaveBeenCalled();
	});

	it("keeps the data in memory when the write fails", async () => {
		vi.spyOn(store, "setMany").mockRejectedValue(
			new DOMException("quota", "QuotaExceededError")
		);

		await expect(
			storeAndPreload(store, [material("A")], true)
		).resolves.toBeUndefined();

		expect(useDB(store).getLoaded("A")).toEqual(material("A"));
		expect(console.warn).toHaveBeenCalledOnce();
	});

	it("keeps the data in memory when the read-back fails", async () => {
		vi.spyOn(store, "getAll").mockRejectedValue(
			new DOMException("closing", "InvalidStateError")
		);

		await storeAndPreload(store, [material("A")], true);

		expect(useDB(store).getLoaded("A")).toEqual(material("A"));
	});

	it("reopens the connection after InvalidStateError or UnknownError only", async () => {
		const db1 = await getDB();
		vi.spyOn(store, "setMany").mockRejectedValueOnce(
			new DOMException("quota", "QuotaExceededError")
		);
		await storeAndPreload(store, [material("A")], true);
		expect(await getDB()).toBe(db1);

		vi.spyOn(store, "setMany").mockRejectedValueOnce(
			new DOMException("closing", "InvalidStateError")
		);
		await storeAndPreload(store, [material("A")], true);
		expect(await getDB()).not.toBe(db1);

		const db2 = await getDB();
		vi.spyOn(store, "setMany").mockRejectedValueOnce(
			new DOMException("lost", "UnknownError")
		);
		await storeAndPreload(store, [material("A")], true);
		expect(await getDB()).not.toBe(db2);
	});

	it("upserts into the loaded rows without wipe", async () => {
		await storeAndPreload(store, [material("A")], true);
		vi.spyOn(store, "setMany").mockRejectedValue(
			new DOMException("closing", "InvalidStateError")
		);

		await storeAndPreload(store, [material("B")]);

		const db = useDB(store);
		expect(db.getLoaded("A")).toEqual(material("A"));
		expect(db.getLoaded("B")).toEqual(material("B"));
		expect(db.allData.value).toHaveLength(2);
	});
});

describe("persistGameData / readGameData", () => {
	let store: ReturnType<typeof useIndexedDBStore<Material, "ticker">>;
	const DAY = 24 * 60 * 60_000;

	beforeEach(async () => {
		await resetDB();
		store = useIndexedDBStore<Material, "ticker">(
			"gamedata_materials",
			"ticker"
		);
		vi.spyOn(console, "warn")
			.mockImplementation(() => {})
			.mockClear();
	});

	it("replaces the rows and writes the meta row with them", async () => {
		await persistGameData(store, [material("A"), material("B")], 1);
		await persistGameData(store, [material("C")], 2);

		expect(await store.getAll()).toEqual([material("C")]);
		expect(await gamedataMetaStore.get("gamedata_materials")).toEqual({
			store: "gamedata_materials",
			fetchedAt: 2,
			rows: 1,
		});
	});

	it("leaves no meta row when a write fails halfway", async () => {
		await persistGameData(store, [material("A")], Date.now());

		// no key: this put throws after the meta delete and the first rows
		await persistGameData(
			store,
			[material("B"), {} as Material],
			Date.now()
		);

		expect(
			await gamedataMetaStore.get("gamedata_materials")
		).toBeUndefined();
		expect((await readGameData(store, 60_000)).data).toBeNull();
		expect(console.warn).toHaveBeenCalledOnce();
	});

	it("reopens the connection after InvalidStateError", async () => {
		const db = await getDB();
		vi.spyOn(db, "transaction").mockImplementationOnce(() => {
			throw new DOMException("closing", "InvalidStateError");
		});

		await expect(
			persistGameData(store, [material("A")], 1)
		).resolves.toBeUndefined();
		expect(await getDB()).not.toBe(db);
	});

	it("reads a complete copy younger than the maximum age", async () => {
		const fetchedAt = Date.now() - DAY;
		await persistGameData(store, [material("A")], fetchedAt);

		expect(await readGameData(store, 2 * DAY)).toEqual({
			fetchedAt,
			data: [material("A")],
		});
		expect(useDB(store).getLoaded("A")).toEqual(material("A"));
		// too old: the age, no rows
		expect(await readGameData(store, DAY / 2)).toEqual({
			fetchedAt,
			data: null,
		});
	});

	it("reads rows without a meta row, or fewer rows than it lists, as none", async () => {
		await store.setMany([material("A")], true);
		expect(await readGameData(store, DAY)).toEqual({
			fetchedAt: null,
			data: null,
		});

		await gamedataMetaStore.set({
			store: "gamedata_materials",
			fetchedAt: Date.now(),
			rows: 2,
		});
		expect((await readGameData(store, DAY)).data).toBeNull();
	});

	it("reads nothing when IndexedDB fails", async () => {
		vi.spyOn(gamedataMetaStore, "get").mockRejectedValueOnce(
			new DOMException("lost", "UnknownError")
		);

		expect(await readGameData(store, DAY)).toEqual({
			fetchedAt: null,
			data: null,
		});
		expect(console.warn).toHaveBeenCalledOnce();
	});
});

describe("whenIdle", () => {
	it("waits the delay, then for an idle main thread", () => {
		vi.useFakeTimers();
		const idle: (() => void)[] = [];
		vi.stubGlobal("requestIdleCallback", (cb: () => void) => idle.push(cb));
		const fn = vi.fn();

		whenIdle(fn, 5000);
		vi.advanceTimersByTime(4999);
		expect(idle).toHaveLength(0);
		vi.advanceTimersByTime(1);
		expect(fn).not.toHaveBeenCalled();
		idle[0]();
		expect(fn).toHaveBeenCalledOnce();
		vi.unstubAllGlobals();
	});

	it("runs right after the delay without requestIdleCallback (Safari)", () => {
		vi.useFakeTimers();
		vi.stubGlobal("requestIdleCallback", undefined);
		const fn = vi.fn();

		whenIdle(fn, 5000);
		vi.advanceTimersByTime(5000);
		expect(fn).toHaveBeenCalledOnce();
		vi.unstubAllGlobals();
	});
});
