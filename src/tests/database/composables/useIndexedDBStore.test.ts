import { describe, it, expect, beforeEach, vi } from "vitest";
import { openDB } from "idb";

import config from "@/lib/config";
import {
	getDB,
	resetDB,
	useIndexedDBStore,
} from "@/database/composables/useIndexedDBStore";
import { DB_SCHEMA } from "@/database/schema";

import { IMaterial } from "@/features/api/gameData.types";

const fakeMaterial_1: IMaterial = {
	material_id: "foo",
	category_name: "foo category",
	category_id: "foo category id",
	name: "m1",
	ticker: "m1",
	weight: 5,
	volume: 7,
};
const fakeMaterial_2: IMaterial = {
	material_id: "moo",
	category_name: "moo category",
	category_id: "moo category id",
	name: "m2",
	ticker: "m2",
	weight: 5,
	volume: 7,
};

describe("useIndexedDBStore", () => {
	const store = useIndexedDBStore<IMaterial, "ticker">(
		"gamedata_materials",
		"ticker"
	);

	// Before each test, clear the store
	beforeEach(async () => {
		await indexedDB.deleteDatabase(config.INDEXEDDB_DBNAME);
		resetDB();
	});

	it("requestPersistence calls navigator.storage.persist if available", async () => {
		const persistSpy = vi.fn().mockResolvedValue(true);
		// @ts-expect-error
		navigator.storage = { persist: persistSpy };

		const { requestPersistence } =
			await import("@/database/composables/useIndexedDBStore");
		await requestPersistence();

		expect(persistSpy).toHaveBeenCalledTimes(1);
	});

	it("getDB creates stores from DB_SCHEMA", async () => {
		const db = await getDB();

		for (const storeName in DB_SCHEMA) {
			expect(db.objectStoreNames.contains(storeName)).toBe(true);
		}
	});

	it("getDB caches the database instance", async () => {
		const db1 = await getDB();
		const db2 = await getDB();

		expect(db1).toBe(db2);
	});

	describe("IndexedDB upgrade", () => {
		beforeEach(async () => {
			await resetDB();
		});

		it("deletes and recreates existing stores during upgrade", async () => {
			// pick one schema store to test
			const testStoreName = Object.keys(DB_SCHEMA)[0];

			// Step 1: create an old DB at version 1 with that store
			const db1 = await openDB(config.INDEXEDDB_DBNAME, 1, {
				upgrade(upgradeDb) {
					const { keyPath } = DB_SCHEMA[testStoreName];
					if (!upgradeDb.objectStoreNames.contains(testStoreName)) {
						upgradeDb.createObjectStore(testStoreName, { keyPath });
					}
				},
			});
			expect(db1.objectStoreNames.contains(testStoreName)).toBe(true);
			db1.close();

			// Step 2: bump version to trigger upgrade
			(globalThis as any).__INDEXEDDB_VERSION__ = 2;

			const db2 = await getDB();

			// Step 3: ensure the same store exists again (was deleted + recreated)
			expect(db2.objectStoreNames.contains(testStoreName)).toBe(true);

			// And all schema stores should exist
			for (const storeName in DB_SCHEMA) {
				expect(db2.objectStoreNames.contains(storeName)).toBe(true);
			}
		});
	});

	it("requestPersistence does nothing if navigator.storage is undefined", async () => {
		// @ts-expect-error
		delete navigator.storage;

		const { requestPersistence } =
			await import("@/database/composables/useIndexedDBStore");
		await expect(requestPersistence()).resolves.not.toThrow();
	});

	it("should insert and get a single item", async () => {
		await store.set(fakeMaterial_1);

		const result = await store.get("m1");
		expect(result).toEqual(fakeMaterial_1);
	});

	it("should return undefined for a missing item", async () => {
		const result = await store.get("does-not-exist");
		expect(result).toBeUndefined();
	});

	it("should insert and get multiple items with getAll", async () => {
		const materials: IMaterial[] = [fakeMaterial_1, fakeMaterial_2];

		await store.setMany(materials, true);
		const result = await store.getAll();

		expect(result).toHaveLength(2);
		expect(result).toEqual(expect.arrayContaining(materials));
	});

	it("should clear the store if wipe = true", async () => {
		const materials: IMaterial[] = [fakeMaterial_1, fakeMaterial_2];
		await store.setMany(materials, true);

		// wipe with a single item
		const newMaterials: IMaterial[] = [fakeMaterial_1];
		await store.setMany(newMaterials, true);

		const result = await store.getAll();
		expect(result).toEqual(newMaterials);
	});

	it("should append items if wipe = false", async () => {
		await store.setMany([fakeMaterial_1], true);
		await store.setMany([fakeMaterial_2], false);

		const result = await store.getAll();
		expect(result).toHaveLength(2);
	});

	it("should remove an item", async () => {
		const materials: IMaterial[] = [fakeMaterial_1, fakeMaterial_2];
		await store.setMany(materials, true);

		await store.remove("m1");
		const result = await store.getAll();

		expect(result).toEqual([fakeMaterial_2]);
	});

	it("gets statistics, existing records", async () => {
		const materials: IMaterial[] = [fakeMaterial_1, fakeMaterial_2];
		await store.setMany(materials, true);

		const result = await store.statistics();

		expect(result.records).toBe(2);
		expect(result.sizeMB).toBeGreaterThan(0);
	});

	it("gets statistics, existing records", async () => {
		const result = await store.statistics();

		expect(result.records).toBe(0);
		expect(result.sizeMB).toBe(0);
	});
});
