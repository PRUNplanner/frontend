// https://github.com/dumbmatter/fakeIndexedDB
import "fake-indexeddb/auto";

import config from "@/lib/config";
import { afterEach, beforeEach, vi } from "vitest";

// Reset IndexedDB between test runs
beforeEach(async () => {
	// Close and delete DB from fake-indexeddb
	await indexedDB.deleteDatabase(config.INDEXEDDB_DBNAME);
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
