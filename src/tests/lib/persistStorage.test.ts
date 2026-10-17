import { describe, it, expect, beforeEach, vi } from "vitest";

const trackException = vi.fn();
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackException }));

// localStorage whose writes throw once full is set
const stored = new Map<string, string>();
let full = false;
const fakeStorage = {
	getItem: (key: string) => stored.get(key) ?? null,
	setItem: (key: string, value: string) => {
		if (full) throw new DOMException("full", "QuotaExceededError");
		stored.set(key, value);
	},
};

// the once-per-tab report is module state: a fresh copy per test
async function load() {
	vi.resetModules();
	return (await import("@/lib/persistStorage")).persistStorage;
}

describe("persistStorage", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", fakeStorage);
		stored.clear();
		full = false;
		trackException.mockReset();
	});

	it("writes and reads localStorage", async () => {
		const storage = await load();
		storage.setItem("k", "v");
		expect(storage.getItem("k")).toBe("v");
	});

	it("keeps the stored value on a full quota and reports once", async () => {
		const storage = await load();
		storage.setItem("k", "old");
		full = true;

		expect(() => storage.setItem("k", "x".repeat(4096))).not.toThrow();
		expect(() => storage.setItem("k", "new")).not.toThrow();

		expect(storage.getItem("k")).toBe("old");
		expect(trackException).toHaveBeenCalledOnce();
		expect(trackException).toHaveBeenCalledWith(
			expect.objectContaining({ name: "QuotaExceededError" }),
			{ key: "k", size_kb: 4 }
		);
	});

	it("writes nothing once stopped", async () => {
		const storage = await load();
		const { stopPersisting } = await import("@/lib/persistStorage");
		stopPersisting();
		storage.setItem("k", "v");
		expect(stored.has("k")).toBe(false);
	});
});
