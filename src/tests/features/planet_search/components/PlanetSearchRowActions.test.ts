import { describe, it, expect, vi, beforeEach } from "vitest";
import { RouterLinkStub } from "@vue/test-utils";

import PlanetSearchRowActions from "@/features/planet_search/components/PlanetSearchRowActions.vue";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { mountComponent } from "@/tests/mountComponent";

// test data
import fixture from "@/tests/test_data/api_data_planet_search_index.json";

const session = vi.hoisted(() => ({ loggedIn: true }));
vi.mock("@/stores/userStore", () => ({
	useUserStore: () => ({
		get isLoggedIn() {
			return session.loggedIn;
		},
	}),
}));
const open = vi.hoisted(() => vi.fn());
vi.mock("@/features/account/useAuthPanel", () => ({
	useAuthPanel: () => ({ open }),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));

describe("PlanetSearchRowActions", () => {
	const planet = fixture[0];
	const mountRow = () =>
		mountComponent(PlanetSearchRowActions, {
			planet,
			pinned: false,
			showPin: true,
		});

	beforeEach(() => {
		open.mockClear();
		vi.mocked(trackEvent).mockClear();
	});

	it("links to a new plan in a new tab, logged in", async () => {
		session.loggedIn = true;
		const { wrapper } = await mountRow();

		const link = wrapper.findComponent(RouterLinkStub);
		expect(link.props("to")).toBe(`/plan/${planet.planet_natural_id}`);
		expect(link.attributes("target")).toBe("_blank");
		expect(link.attributes("aria-label")).toBe(
			"planet_search.results.create_plan"
		);

		await link.trigger("click");
		expect(trackEvent).toHaveBeenCalledWith("planet_search:action", {
			action: "plan_open",
		});
	});

	it("asks a visitor to log in, in place, then goes on to the plan", async () => {
		session.loggedIn = false;
		const { wrapper } = await mountRow();

		expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
		const plus = wrapper.find(
			'button[aria-label="planet_search.results.create_plan_login"]'
		);
		await plus.trigger("click");

		expect(open).toHaveBeenCalledWith("login", "planet_search_plan", {
			next: `/plan/${planet.planet_natural_id}`,
			context: {
				planet: expect.any(String),
				id: planet.planet_natural_id,
			},
		});
	});
});
