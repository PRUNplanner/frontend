import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ComponentPublicInstance } from "vue";

import {
	flushPlanEdits,
	identifyUser,
	trackContext,
	trackEvent,
	trackPageview,
	trackPlanEdit,
	trackVueError,
} from "@/lib/analytics/useAnalytics";
import {
	capture,
	captureException,
	identify,
	register,
} from "@/lib/analytics/usePostHog";

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

	describe("trackEvent", () => {
		it("captures the event with its properties", () => {
			trackEvent("plan:save", {
				planet_natural_id: "OT-580b",
				trigger: "shortcut",
			});

			expect(capture).toHaveBeenCalledWith("plan:save", {
				planet_natural_id: "OT-580b",
				trigger: "shortcut",
			});
		});

		it("drops the automatic habitation optimization", () => {
			trackEvent("plan:hab_optimize", { goal: "auto" });
			expect(capture).not.toHaveBeenCalled();

			trackEvent("plan:hab_optimize", { goal: "area" });
			expect(capture).toHaveBeenCalledWith("plan:hab_optimize", {
				goal: "area",
			});
		});
	});

	describe("trackPlanEdit", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});
		afterEach(() => {
			flushPlanEdits();
			vi.useRealTimers();
		});

		const edit = (amount: number, building_ticker = "FRM") => ({
			planet_natural_id: "OT-580b",
			field: "building_amount" as const,
			building_ticker,
			amount,
		});
		// as sent: trackPlanEdit adds whether it is a shared plan's copy
		const sent = (amount: number, is_shared = false) => ({
			...edit(amount),
			is_shared,
		});

		it("sends a burst of clicks as one event with the final amount", () => {
			for (let amount = 1; amount <= 10; amount++)
				trackPlanEdit(edit(amount));
			expect(capture).not.toHaveBeenCalled();

			vi.advanceTimersByTime(1000);

			expect(capture).toHaveBeenCalledTimes(1);
			expect(capture).toHaveBeenCalledWith("plan:edit", sent(10));
		});

		it("keeps edits of other controls apart", () => {
			trackPlanEdit(edit(2, "FRM"));
			trackPlanEdit(edit(3, "RIG"));
			trackPlanEdit({
				planet_natural_id: "OT-580b",
				field: "infrastructure",
				infrastructure_type: "HB1",
				amount: 4,
			});
			trackPlanEdit({
				planet_natural_id: "OT-580b",
				field: "infrastructure",
				infrastructure_type: "HB2",
				amount: 1,
			});

			vi.advanceTimersByTime(1000);

			expect(capture).toHaveBeenCalledTimes(4);
		});

		it("sends a later edit of the same control again", () => {
			trackPlanEdit(edit(2));
			vi.advanceTimersByTime(1000);
			trackPlanEdit(edit(3));
			vi.advanceTimersByTime(1000);

			expect(capture).toHaveBeenCalledTimes(2);
			expect(capture).toHaveBeenLastCalledWith("plan:edit", sent(3));
		});

		it("flushPlanEdits sends pending edits now, once", () => {
			trackPlanEdit(edit(5));

			flushPlanEdits();
			expect(capture).toHaveBeenCalledWith("plan:edit", sent(5));

			vi.advanceTimersByTime(1000);
			expect(capture).toHaveBeenCalledTimes(1);
		});

		it("marks edits on a shared plan's copy", () => {
			window.history.pushState({}, "", "/shared/abc");
			trackPlanEdit(edit(7));
			flushPlanEdits();
			window.history.pushState({}, "", "/");

			expect(capture).toHaveBeenCalledWith("plan:edit", sent(7, true));
		});
	});

	it("trackPageview registers route_name, then sends $pageview", () => {
		trackPageview("plan");

		expect(register).toHaveBeenCalledWith({ route_name: "plan" });
		expect(capture).toHaveBeenCalledWith("$pageview");
		expect(vi.mocked(register).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(capture).mock.invocationCallOrder[0]
		);
	});

	it.each([
		["key", "PRUN", true],
		[null, "PRUN", false],
		["key", null, false],
	])(
		"identifyUser sets the profile's person properties (key %s, name %s)",
		(fio_apikey, prun_username, is_fio_enabled) => {
			identifyUser({
				id: 7,
				username: "foo",
				email: "foo@example.com",
				is_email_verified: true,
				fio_apikey,
				prun_username,
			});

			expect(identify).toHaveBeenCalledWith("7", {
				username: "foo",
				prun_username,
				is_fio_enabled,
				has_verified_email: true,
			});
		}
	);
});
