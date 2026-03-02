import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "@/stores/userStore";

import router from "@/router";

// mock views, otherwise loading of components will take long

vi.mock("@/views/PlanLoadView.vue", () => ({
	default: { template: "<div />" },
}));

vi.mock("@/views/EmpireView.vue", () => ({
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

			router.push({ name: "plan", params: { planetNaturalId: "abc" } });
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
	});
});
