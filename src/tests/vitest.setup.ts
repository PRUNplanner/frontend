// https://github.com/dumbmatter/fakeIndexedDB
import "fake-indexeddb/auto";

import config from "@/lib/config";
import { afterEach, beforeEach, vi } from "vitest";

/**
 * Empties every store through a connection of its own. The app's cached
 * connection stays open (closing it breaks reads a previous test left
 * running), and a database that doesn't exist yet isn't created.
 */
function emptyDB(): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(config.INDEXEDDB_DBNAME);
		request.onupgradeneeded = () => request.transaction!.abort();
		request.onerror = (event) => {
			// the aborted upgrade: there was nothing to empty
			event.preventDefault();
			resolve();
		};
		request.onsuccess = () => {
			const db = request.result;
			const stores = [...db.objectStoreNames];
			if (!stores.length) {
				db.close();
				return resolve();
			}
			const tx = db.transaction(stores, "readwrite");
			stores.forEach((s) => tx.objectStore(s).clear());
			tx.oncomplete = () => {
				db.close();
				resolve();
			};
			tx.onerror = () => {
				db.close();
				reject(tx.error ?? new Error("Emptying the IndexedDB failed"));
			};
		};
	});
}

// Reset IndexedDB between test runs
beforeEach(async () => {
	await emptyDB();
	// optional: Node >= 25 shadows jsdom storage with its own (undefined) global
	globalThis.localStorage?.clear();
	globalThis.sessionStorage?.clear();
});

// never leak fake timers into the next test
afterEach(() => {
	vi.useRealTimers();
});

if (typeof navigator === "undefined") {
	(global as any).navigator = {
		storage: {
			persist: async () => true,
		},
	};
}

// jsdom has no ResizeObserver; PTooltip and PPopover observe their panel
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
};

// jsdom lays nothing out and has no scrollIntoView; a test that checks the
// scroll spies on it
Element.prototype.scrollIntoView ??= function () {};
