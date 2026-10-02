import { type IDBPDatabase, openDB } from "idb";

import config from "@/lib/config";
import { DB_SCHEMA } from "@/database/schema";

type KeyOfStore<T, K extends keyof T> = T[K] extends IDBValidKey ? T[K] : never;
export interface IStoreStatistic {
	records: number;
	sizeMB: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function requestPersistence() {
	if (navigator && navigator.storage && navigator.storage.persist) {
		await navigator.storage.persist();
	}
}

export async function getDB() {
	if (!dbPromise) {
		dbPromise = openDB(
			config.INDEXEDDB_DBNAME,
			Number(__INDEXEDDB_VERSION__),
			{
				upgrade(upgradeDb) {
					for (const storeName in DB_SCHEMA) {
						const { keyPath, indexes } = DB_SCHEMA[storeName];
						if (upgradeDb.objectStoreNames.contains(storeName)) {
							upgradeDb.deleteObjectStore(storeName);
						}
						const store = upgradeDb.createObjectStore(storeName, {
							keyPath,
						});
						if (indexes) {
							for (const { name, keyPath, options } of indexes) {
								store.createIndex(name, keyPath, options);
							}
						}
					}
				},
				// the browser closed the connection (site data cleared, eviction):
				// the next call reopens it
				terminated() {
					dbPromise = null;
				},
			}
		).catch((err: unknown) => {
			dbPromise = null;
			throw err;
		});
	}
	// Request persistence after DB is ready
	try {
		await requestPersistence();
	} catch (err) {
		console.error("Error requesting store persistance.", err);
	}

	return dbPromise;
}

/**
 * Drops the cached connection so the next `getDB` reopens it, for a
 * connection that died without a `close` event.
 */
export function dropDB(): void {
	dbPromise
		?.then((db) => db.close())
		.catch(() => {
			// already closed or never opened
		});
	dbPromise = null;
}

/**
 * Testing / dev utility: completely resets the DB and clears cached dbPromise.
 */
export async function resetDB(): Promise<void> {
	if (dbPromise) {
		(await dbPromise).close();
		dbPromise = null;
	}
	// deleteDatabase returns a request, not a promise
	await new Promise<void>((resolve, reject) => {
		const request = indexedDB.deleteDatabase(config.INDEXEDDB_DBNAME);
		request.onsuccess = () => {
			resolve();
		};
		request.onerror = () => {
			reject(request.error ?? new Error("Deleting the IndexedDB failed"));
		};
	});
}

export function useIndexedDBStore<T extends object, K extends keyof T & string>(
	storeName: string,
	keyPath: K
) {
	// Basic CRUD methods for all IndexedDBStores

	async function get<K extends keyof T>(
		key: KeyOfStore<T, K>
	): Promise<T | undefined> {
		const db = await getDB();
		return db.get(storeName, key);
	}

	async function getAll(): Promise<T[]> {
		const db = await getDB();
		return db.getAll(storeName);
	}

	async function set(item: T): Promise<void> {
		const db = await getDB();
		await db.put(storeName, item);
	}

	async function setMany(items: T[], wipe: boolean = false): Promise<void> {
		const db = await getDB();
		const tx = db.transaction(storeName, "readwrite");
		const store = tx.objectStore(storeName);

		// requests run in order, so the clear (if set) lands before the puts.
		// Await every request: an aborted transaction (e.g. quota) rejects
		// them all, and unawaited ones become unhandled rejections
		await Promise.all([
			...(wipe ? [store.clear()] : []),
			...items.map((i) => store.put(i)),
			tx.done,
		]);
	}

	async function remove<K extends keyof T>(
		key: KeyOfStore<T, K>
	): Promise<void> {
		const db = await getDB();
		await db.delete(storeName, key);
	}

	async function statistics(): Promise<IStoreStatistic> {
		const db = await getDB();

		// record count
		const recordCount: number = await db.count(storeName);

		// estimate size from sampling
		const tx = db.transaction(storeName, "readonly");
		const store = tx.objectStore(storeName);

		const records: T[] = [];
		let cursor = await store.openCursor();
		while (cursor && records.length < 10) {
			records.push(cursor.value);
			cursor = await cursor.continue();
		}

		// stringify + measure
		const avgSize = records.length
			? records.reduce(
					(sum, r) => sum + new Blob([JSON.stringify(r)]).size,
					0
				) / records.length
			: 0;
		const approxSize = (avgSize * recordCount) / 1024 / 1024;

		return {
			records: recordCount,
			sizeMB: approxSize,
		};
	}

	return {
		storeName,
		keyPath,
		get,
		getAll,
		set,
		setMany,
		remove,
		statistics,
	} as const;
}
