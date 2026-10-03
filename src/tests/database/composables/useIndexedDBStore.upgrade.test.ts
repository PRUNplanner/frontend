import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import config from "@/lib/config";
import {
	dbBlocked,
	dropDB,
	getDB,
} from "@/database/composables/useIndexedDBStore";
import { useVersionCheck } from "@/lib/useVersionCheck";

// own file: an outdated connection stays outdated for the module's life

function open(version: number): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(config.INDEXEDDB_DBNAME, version);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

const VERSION = Number(__INDEXEDDB_VERSION__);

describe("getDB: version upgrades from another tab", () => {
	it("waits on an older tab's connection, then opens", async () => {
		// an old release's tab: no versionchange handler, keeps it open
		const old = await open(1);

		const opening = getDB();
		await vi.waitFor(() => expect(dbBlocked.value).toBe(true));

		old.close();
		await opening;
		expect(dbBlocked.value).toBe(false);
		// let the next test's database reset through
		dropDB();
	});

	it("closes for a newer version and marks the app outdated", async () => {
		await getDB();
		const { updateAvailable } = useVersionCheck();
		updateAvailable.value = false;

		// the newer tab's open succeeds instead of hanging on this one
		const newer = await open(VERSION + 1);
		await nextTick();

		expect(updateAvailable.value).toBe(true);
		// never reopens at its old version
		await expect(getDB()).rejects.toThrow(/newer PRUNplanner version/);
		newer.close();
	});
});
