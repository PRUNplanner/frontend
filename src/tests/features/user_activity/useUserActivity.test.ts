import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { useUserActivity } from "@/features/user_activity/useUserActivity";

describe("useUserActivity", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(0)); // start clock at t=0
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should not delay if user was recently active", () => {
		const { shouldDelay } = useUserActivity(300_000, 10_800_000);
		expect(shouldDelay()).toBe(false);
	});

	it("should delay if inactivity exceeds threshold", () => {
		const { shouldDelay } = useUserActivity(300_000, 10_800_000);

		// advance both timers + system time
		vi.advanceTimersByTime(301_000);
		vi.setSystemTime(new Date(301_000));

		expect(shouldDelay()).toBe(true);
	});

	it("should delay once idle after an earlier check", () => {
		const { shouldDelay } = useUserActivity(300_000, 10_800_000);
		expect(shouldDelay()).toBe(false);

		vi.advanceTimersByTime(301_000);
		vi.setSystemTime(new Date(301_000));

		expect(shouldDelay()).toBe(true);
	});

	it("should reset forced activity after maxDelay", () => {
		const { shouldDelay } = useUserActivity(300_000, 10_800_000);

		// simulate inactivity
		vi.advanceTimersByTime(301_000);
		vi.setSystemTime(new Date(301_000));
		expect(shouldDelay()).toBe(true);

		// simulate maxDelay passed since lastForcedActivity
		vi.advanceTimersByTime(10_800_001);
		vi.setSystemTime(new Date(301_000 + 10_800_001));

		expect(shouldDelay()).toBe(false);
	});

	it("should update lastActivity on simulated user event", async () => {
		const { shouldDelay, lastActivity } = useUserActivity(
			300_000,
			10_800_000
		);

		// go idle
		vi.advanceTimersByTime(301_000);
		vi.setSystemTime(new Date(301_000));
		expect(shouldDelay()).toBe(true);

		// simulate mousemove
		window.dispatchEvent(new Event("mousemove"));
		vi.advanceTimersByTime(250);
		vi.setSystemTime(new Date(301_250));
		await nextTick();

		expect(Date.now() - lastActivity.value).toBeLessThan(300_000);
		expect(shouldDelay()).toBe(false);
	});

	it("listens passively, never blocking scroll or touch", () => {
		const add = vi.spyOn(window, "addEventListener");
		useUserActivity();

		const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
		expect(add.mock.calls.map(([event]) => event)).toStrictEqual(events);
		for (const [, , options] of add.mock.calls)
			expect(options).toStrictEqual({ passive: true });
		add.mockRestore();
	});

	it("records a burst of events once, 200 ms after its first event", () => {
		const { lastActivity } = useUserActivity();
		expect(lastActivity.value).toBe(0);

		window.dispatchEvent(new Event("mousemove"));
		vi.advanceTimersByTime(150);
		// no leading update, and later events don't push it back
		window.dispatchEvent(new Event("scroll"));
		expect(lastActivity.value).toBe(0);
		vi.advanceTimersByTime(50);
		expect(lastActivity.value).toBe(200);
		vi.advanceTimersByTime(1000);
		expect(lastActivity.value).toBe(200);

		// the next burst starts its own window
		window.dispatchEvent(new Event("keydown"));
		vi.advanceTimersByTime(199);
		expect(lastActivity.value).toBe(200);
		vi.advanceTimersByTime(1);
		expect(lastActivity.value).toBe(1400);
	});
});
