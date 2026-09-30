import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "@/stores/userStore";

import router from "@/router";
import { trackPageview } from "@/lib/analytics/useAnalytics";

vi.mock("@/lib/analytics/useAnalytics", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/analytics/useAnalytics")>()),
	trackPageview: vi.fn(),
}));

// mock views, otherwise loading of components will take long

vi.mock("@/views/HomepageView.vue", () => ({
	default: { template: "<div />" },
}));

vi.mock("@/views/PlanLoadView.vue", () => ({
	default: { template: "<div />" },
}));

vi.mock("@/views/EmpireView.vue", () => ({
	default: { template: "<div />" },
}));

vi.mock("@/views/PlanetSearchView.vue", () => ({
	default: { template: "<div />" },
}));

vi.mock("@/views/ManageView.vue", () => ({
	default: { template: "<div />" },
}));

describe("Router NavigationGuard", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it(
		"redirects to homepage with state if not logged in and route requires auth",
		{ timeout: 10_000 },
		async () => {
			const userStore = useUserStore();
			// logged out
			userStore.logout();

			await router.push({
				name: "plan",
				params: { planetNaturalId: "abc" },
			});
			await router.isReady();

			expect(router.currentRoute.value.name).toBe("homepage");
		}
	);

	it(
		"redirects to empire if logged in and tries to access homepage",
		{ timeout: 10_000 },
		async () => {
			const userStore = useUserStore();
			// logging in
			userStore.setToken("foo", "moo");

			await router.push({
				name: "shared-plan",
				params: { sharedPlanUuid: "x" },
			});
			await router.isReady();

			await router.push({ name: "homepage" });

			// Wait for redirection
			await router.isReady();

			expect(router.currentRoute.value.name).toBe("empire");
		}
	);

	it("allows access to shared-plan without auth", async () => {
		const userStore = useUserStore();
		userStore.logout();

		await router.push({
			name: "shared-plan",
			params: { sharedPlanUuid: "123" },
		});
		await router.isReady();

		expect(router.currentRoute.value.name).toBe("shared-plan");
	});

	it("allows access to auth route if logged in", async () => {
		const userStore = useUserStore();
		// logging in
		userStore.setToken("foo", "moo");

		await router.push({ name: "plan", params: { planetNaturalId: "xyz" } });
		await router.isReady();

		expect(router.currentRoute.value.name).toBe("plan");
		// pageviews are grouped by route name, the URL carries ids
		expect(trackPageview).toHaveBeenLastCalledWith("plan");
	});

	it("counts a query change on the same page as no pageview", async () => {
		useUserStore().setToken("foo", "moo");
		await router.push({ name: "search" });
		vi.mocked(trackPageview).mockClear();

		// planet search writes its filters into the query
		await router.replace({ name: "search", query: { q: "fertile" } });

		expect(trackPageview).not.toHaveBeenCalled();
	});

	it("counts a refused navigation as no pageview", async () => {
		useUserStore().setToken("foo", "moo");
		await router.push({ name: "search" });
		vi.mocked(trackPageview).mockClear();
		const stop = router.beforeEach(() => false);

		await router.push({ name: "manage" });
		stop();

		expect(router.currentRoute.value.name).toBe("search");
		expect(trackPageview).not.toHaveBeenCalled();
	});
});
