import { afterEach, describe, expect, it, vi } from "vitest";

import { readStorage, useStoredFlag, writeStorage } from "@/lib/storage";

describe("lib/storage", () => {
	afterEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		vi.restoreAllMocks();
	});

	it("reads and writes localStorage, null removes the key", () => {
		expect(readStorage("k")).toBeNull();
		writeStorage("k", "v");
		expect(localStorage.getItem("k")).toBe("v");
		expect(readStorage("k")).toBe("v");
		writeStorage("k", null);
		expect(localStorage.getItem("k")).toBeNull();
	});

	it("uses the given storage", () => {
		writeStorage("k", "s", "session");
		expect(sessionStorage.getItem("k")).toBe("s");
		expect(localStorage.getItem("k")).toBeNull();
		expect(readStorage("k", "session")).toBe("s");
	});

	it("survives a blocked or full storage", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("full");
		});
		vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		expect(readStorage("k")).toBeNull();
		expect(() => writeStorage("k", "v")).not.toThrow();
		expect(() => writeStorage("k", null)).not.toThrow();
	});

	it("survives a storage global that throws when read", () => {
		const desc = Object.getOwnPropertyDescriptor(window, "sessionStorage")!;
		Object.defineProperty(window, "sessionStorage", {
			configurable: true,
			get: () => {
				throw new DOMException("blocked", "SecurityError");
			},
		});
		try {
			expect(readStorage("k", "session")).toBeNull();
			expect(() => writeStorage("k", "v", "session")).not.toThrow();
		} finally {
			Object.defineProperty(window, "sessionStorage", desc);
		}
	});

	describe("useStoredFlag", () => {
		it("starts at the fallback when nothing or junk is stored", () => {
			expect(useStoredFlag("f", true).value).toBe(true);
			expect(useStoredFlag("f", false).value).toBe(false);
			localStorage.setItem("f", "yes");
			expect(useStoredFlag("f", true).value).toBe(true);
			expect(useStoredFlag("f", false).value).toBe(false);
		});

		it("reads the stored 1 / 0 over the fallback", () => {
			localStorage.setItem("f", "1");
			expect(useStoredFlag("f", false).value).toBe(true);
			localStorage.setItem("f", "0");
			expect(useStoredFlag("f", true).value).toBe(false);
		});

		it("writes 1 / 0 on every change", () => {
			const flag = useStoredFlag("f", false);
			flag.value = true;
			expect(localStorage.getItem("f")).toBe("1");
			flag.value = false;
			expect(localStorage.getItem("f")).toBe("0");
		});
	});
});
