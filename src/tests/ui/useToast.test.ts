import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	closeToast,
	pauseToast,
	resumeToast,
	toast,
	toasts,
	useToast,
} from "@/ui/useToast";

describe("useToast", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		[...toasts.value].forEach((t) => closeToast(t.id));
		vi.useRealTimers();
	});

	it("adds an info toast that closes after 6 s", () => {
		useToast()("Saved");
		expect(toasts.value).toEqual([
			{
				id: expect.any(Number),
				text: "Saved",
				type: "info",
				action: undefined,
				closable: false,
			},
		]);

		vi.advanceTimersByTime(5999);
		expect(toasts.value).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(toasts.value).toHaveLength(0);
	});

	it("keeps a toast with duration 0 until it is destroyed", () => {
		const handle = toast("Blocked", {
			type: "error",
			duration: 0,
			closable: true,
		});
		vi.advanceTimersByTime(60_000);
		expect(toasts.value).toMatchObject([
			{ text: "Blocked", type: "error", closable: true },
		]);

		handle.destroy();
		expect(toasts.value).toHaveLength(0);
	});

	it("stacks in order and destroys only its own", () => {
		const first = toast("one");
		toast("two");
		first.destroy();
		expect(toasts.value.map((t) => t.text)).toEqual(["two"]);
	});

	it("pauses on hover and restarts the full duration after", () => {
		toast("Undo?", { duration: 1000 });
		const { id } = toasts.value[0];

		vi.advanceTimersByTime(900);
		pauseToast(id);
		vi.advanceTimersByTime(5000);
		expect(toasts.value).toHaveLength(1);

		resumeToast(id);
		vi.advanceTimersByTime(999);
		expect(toasts.value).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(toasts.value).toHaveLength(0);
	});

	it("leaves a toast that stays alone on hover", () => {
		toast("Blocked", { duration: 0 });
		const { id } = toasts.value[0];
		pauseToast(id);
		resumeToast(id);
		vi.advanceTimersByTime(60_000);
		expect(toasts.value).toHaveLength(1);
	});
});
