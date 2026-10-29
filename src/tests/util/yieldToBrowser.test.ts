import { afterEach, describe, expect, it, vi } from "vitest";

import { yieldToBrowser } from "@/util/yieldToBrowser";

describe("yieldToBrowser", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it("uses scheduler.yield where it exists", async () => {
		const yieldFn = vi.fn(() => Promise.resolve());
		vi.stubGlobal("scheduler", { yield: yieldFn });
		await yieldToBrowser();
		expect(yieldFn).toHaveBeenCalledOnce();
	});

	it("falls back to a macrotask", async () => {
		vi.stubGlobal("scheduler", undefined);
		vi.useFakeTimers();
		let done = false;
		const p = yieldToBrowser().then(() => (done = true));
		await Promise.resolve();
		expect(done).toBe(false);
		await vi.advanceTimersByTimeAsync(0);
		await p;
		expect(done).toBe(true);
	});
});
