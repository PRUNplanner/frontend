import { describe, it, expect, vi, beforeEach } from "vitest";

import { useDB } from "@/database/composables/useDB";
import {
	getDB,
	resetDB,
	useIndexedDBStore,
} from "@/database/composables/useIndexedDBStore";
import { storeAndPreload } from "@/lib/query_cache/queries/queries.util";

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
