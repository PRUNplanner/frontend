import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useAuthPanel } from "@/features/account/useAuthPanel";

describe("useAuthPanel", () => {
	const panel = useAuthPanel();
	const state = () => [panel.showLogin.value, panel.showRegistration.value];

	beforeEach(() => {
		panel.close();
		vi.mocked(trackEvent).mockClear();
		window.scrollTo = vi.fn();
	});

	it("toggles one form from the header and closes the other", () => {
		panel.toggleLogin();
		expect(state()).toEqual([true, false]);

		panel.toggleRegistration();
		expect(state()).toEqual([false, true]);

		panel.toggleRegistration();
		expect(state()).toEqual([false, false]);

		expect(vi.mocked(trackEvent).mock.calls).toEqual([
			["landing:auth_open", { panel: "login", source: "header" }],
			["landing:auth_open", { panel: "registration", source: "header" }],
		]);
	});

	it("opens a form for every user of the composable, where the page is", () => {
		useAuthPanel().open("registration", "closing");
		expect(state()).toEqual([false, true]);

		panel.open("login", "shared_plan");
		expect(state()).toEqual([true, false]);
		expect(window.scrollTo).not.toHaveBeenCalled();
		expect(trackEvent).toHaveBeenLastCalledWith("landing:auth_open", {
			panel: "login",
			source: "shared_plan",
		});
	});

	it("goes on to the login form after a registration, without an event", () => {
		panel.open("registration", "hero");
		vi.mocked(trackEvent).mockClear();

		panel.showLoginForm();

		expect(state()).toEqual([true, false]);
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("keeps where a login leads across the switch, until it closes", () => {
		const options = {
			next: "/plan/CH-771a",
			context: { planet: "Pyrgos", id: "CH-771a" },
		};
		panel.open("login", "planet_search_plan", options);
		expect(trackEvent).toHaveBeenLastCalledWith("landing:auth_open", {
			panel: "login",
			source: "planet_search_plan",
		});

		panel.switchTo("registration");
		panel.showLoginForm();
		expect(panel.next.value).toBe(options.next);
		expect(panel.context.value).toEqual(options.context);

		panel.close();
		expect(panel.next.value).toBeUndefined();
		expect(panel.context.value).toBeUndefined();
	});

	it("drops a page's next when the header opens the panel", () => {
		panel.open("login", "planet_search_plan", { next: "/plan/X" });
		panel.close();
		panel.toggleLogin();
		expect(panel.next.value).toBeUndefined();
	});

	it("switches the open panel's form", () => {
		panel.open("login", "hero");
		panel.switchTo("registration");

		expect(state()).toEqual([false, true]);
	});
});
