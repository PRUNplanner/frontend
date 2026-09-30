import { describe, it, expect, beforeEach, vi } from "vitest";

import { useAuthPanel } from "@/features/account/useAuthPanel";

describe("useAuthPanel", () => {
	const panel = useAuthPanel();
	const state = () => [panel.showLogin.value, panel.showRegistration.value];

	beforeEach(() => {
		panel.close();
		window.scrollTo = vi.fn();
	});

	it("toggles one panel and closes the other", () => {
		panel.toggleLogin();
		expect(state()).toEqual([true, false]);

		panel.toggleRegistration();
		expect(state()).toEqual([false, true]);

		panel.toggleRegistration();
		expect(state()).toEqual([false, false]);
	});

	it("opens a panel for every user of the composable and scrolls up", () => {
		useAuthPanel().open("registration");
		expect(state()).toEqual([false, true]);

		panel.open("login");
		expect(state()).toEqual([true, false]);
		expect(window.scrollTo).toHaveBeenCalledTimes(2);
	});
});
