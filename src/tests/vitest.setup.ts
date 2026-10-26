// https://github.com/dumbmatter/fakeIndexedDB
import "fake-indexeddb/auto";

import { resetDB } from "@/database/composables/useIndexedDBStore";
import { afterEach, beforeEach, vi } from "vitest";

// Reset IndexedDB between test runs
beforeEach(async () => {
	// close the cached connection and delete the DB from fake-indexeddb
	await resetDB();
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
