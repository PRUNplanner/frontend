import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComponentPublicInstance } from "vue";

import { trackContext, trackVueError } from "@/lib/analytics/useAnalytics";
import { captureException, register } from "@/lib/analytics/usePostHog";

vi.mock("@/lib/analytics/usePostHog", () => ({
	capture: vi.fn(),
	captureException: vi.fn(),
	identify: vi.fn(),
	register: vi.fn(),
	reset: vi.fn(),
	setUserProp: vi.fn(),
}));

const instance = (options: object) =>
	({ $options: options }) as unknown as ComponentPublicInstance;

describe("useAnalytics", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	describe("trackVueError", () => {
		it("captures with component and info, and still logs", () => {
			const error = new Error("boom");

			trackVueError(error, instance({ name: "PlanView" }), "setup function");

			expect(captureException).toHaveBeenCalledWith(error, {
				component: "PlanView",
				vue_info: "setup function",
			});
			expect(console.error).toHaveBeenCalledWith(error);
		});

		it("falls back to the script setup file name", () => {
			trackVueError(
				new Error("boom"),
				instance({ __name: "PlanBonuses" }),
				"native event handler"
			);

			expect(captureException).toHaveBeenCalledWith(
				expect.any(Error),
				{ component: "PlanBonuses", vue_info: "native event handler" }
			);
		});

		it("works without a component instance", () => {
			trackVueError(new Error("boom"), null, "app errorHandler");

			expect(captureException).toHaveBeenCalledWith(
				expect.any(Error),
				{ component: undefined, vue_info: "app errorHandler" }
			);
		});
	});

	it.each([
		Object.assign(new Error('{"detail":"nope"}'), { status: 400 }),
		new Error("Validation error: [...]"),
	])("trackVueError only logs an apiService error", (error) => {
		trackVueError(error, instance({ name: "EmpireView" }), "setup function");

		expect(captureException).not.toHaveBeenCalled();
		expect(console.error).toHaveBeenCalledWith(error);
	});

	it("trackContext registers super properties", () => {
		trackContext({ route_name: "empire" });

		expect(register).toHaveBeenCalledWith({ route_name: "empire" });
	});
});
