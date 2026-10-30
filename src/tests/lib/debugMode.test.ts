import { describe, it, expect, beforeEach, vi } from "vitest";

const toast = vi.fn();
vi.mock("@/ui/useToast", () => ({ toast }));

const stored = new Map<string, string>();
let broken = false;
const fakeStorage = {
	getItem: (key: string) => {
		if (broken) throw new DOMException("denied", "SecurityError");
		return stored.get(key) ?? null;
	},
	setItem: (key: string, value: string) => {
		if (broken) throw new DOMException("denied", "SecurityError");
		stored.set(key, value);
	},
	removeItem: (key: string) => {
		if (broken) throw new DOMException("denied", "SecurityError");
		stored.delete(key);
	},
};

// the switch is read once on import: a fresh copy per test
async function load() {
	vi.resetModules();
	return await import("@/lib/debugMode");
}

describe("debugMode", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", fakeStorage);
		stored.clear();
		broken = false;
		toast.mockReset();
	});

	it.each([
		[null, false],
		["calc", true],
		["cache, calc", true],
		["cache", false],
		["calculation", false],
	])("reads %s from storage as %s", async (value, on) => {
		if (value !== null) stored.set("prunplanner_debug", value);
		expect((await load()).calcDebug.value).toBe(on);
	});

	it("turns on and off, keeping other modes", async () => {
		stored.set("prunplanner_debug", "cache");
		const { calcDebug, setCalcDebug } = await load();

		setCalcDebug(true);
		expect(calcDebug.value).toBe(true);
		expect(stored.get("prunplanner_debug")).toBe("cache,calc");
		expect(toast).toHaveBeenLastCalledWith(
			"Calculation debug on. Open a plan to see it.",
			{ type: "info" }
		);

		setCalcDebug(false);
		expect(calcDebug.value).toBe(false);
		expect(stored.get("prunplanner_debug")).toBe("cache");
		expect(toast).toHaveBeenLastCalledWith("Calculation debug off.", {
			type: "info",
		});
	});

	it("removes the key when no mode is left", async () => {
		const { setCalcDebug } = await load();
		setCalcDebug(true);
		setCalcDebug(false);

		expect(stored.has("prunplanner_debug")).toBe(false);
	});

	it("is off without storage and still switches for the tab", async () => {
		broken = true;
		const { calcDebug, setCalcDebug } = await load();
		expect(calcDebug.value).toBe(false);

		setCalcDebug(true);
		expect(calcDebug.value).toBe(true);
	});

	it("a stored mode without a meaning is kept and ignored", async () => {
		stored.set("prunplanner_debug", "gaps");
		const { calcDebug, setCalcDebug } = await load();
		expect(calcDebug.value).toBe(false);

		setCalcDebug(true);
		expect(stored.get("prunplanner_debug")).toBe("gaps,calc");
	});

	it("follows other tabs through the storage event", async () => {
		const { calcDebug } = await load();

		window.dispatchEvent(
			new StorageEvent("storage", {
				key: "prunplanner_debug",
				newValue: "calc",
			})
		);
		expect(calcDebug.value).toBe(true);

		window.dispatchEvent(new StorageEvent("storage", { key: "other" }));
		expect(calcDebug.value).toBe(true);

		// storage cleared in another tab
		window.dispatchEvent(new StorageEvent("storage", { key: null }));
		expect(calcDebug.value).toBe(false);
	});
});
