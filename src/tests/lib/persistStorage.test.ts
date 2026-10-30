import { describe, it, expect, beforeEach, vi } from "vitest";

const trackException = vi.fn();
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackException,
}));

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

// the once-per-key report is module state: a fresh copy per test
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

	it("reports a failure of another key again", async () => {
		const storage = await load();
		full = true;

		storage.setItem("prunplanner_planning", "a");
		storage.setItem("prunplanner_planning", "b");
		storage.setItem("prunplanner_user", "c");

		expect(trackException).toHaveBeenCalledTimes(2);
		expect(trackException).toHaveBeenLastCalledWith(expect.anything(), {
			key: "prunplanner_user",
			size_kb: 0,
		});
	});

	it("writes nothing once stopped", async () => {
		const storage = await load();
		const { stopPersisting } = await import("@/lib/persistStorage");
		stopPersisting();
		storage.setItem("k", "v");
		expect(stored.has("k")).toBe(false);
	});

	it("reads nothing from a blocked storage", async () => {
		const storage = await load();
		vi.stubGlobal("localStorage", {
			getItem: () => {
				throw new DOMException("blocked", "SecurityError");
			},
		});
		expect(storage.getItem("prunplanner_user")).toBeNull();
	});
});
