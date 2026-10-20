import { afterEach, describe, expect, it, vi } from "vitest";
import type { RouteLocationNormalized } from "vue-router";

import router from "@/router";

// every route loads its view lazily; stub them so loading stays cheap
const stub = vi.hoisted(() => ({ default: { template: "<div />" } }));

vi.mock("@/views/APIKeyView.vue", () => stub);
vi.mock("@/views/EmpireView.vue", () => stub);
vi.mock("@/views/ExchangesView.vue", () => stub);
vi.mock("@/views/HelpView.vue", () => stub);
vi.mock("@/views/HomepageView.vue", () => stub);
vi.mock("@/views/ImprintToSView.vue", () => stub);
vi.mock("@/views/ManageView.vue", () => stub);
vi.mock("@/views/NotImplementedView.vue", () => stub);
vi.mock("@/views/PasswordResetView.vue", () => stub);
vi.mock("@/views/PlanLoadView.vue", () => stub);
vi.mock("@/views/PlanetSearchView.vue", () => stub);
vi.mock("@/views/ProfileView.vue", () => stub);
vi.mock("@/views/QueryCacheView.vue", () => stub);
vi.mock("@/views/RequestPasswordResetView.vue", () => stub);
vi.mock("@/views/VerifyEmailView.vue", () => stub);
vi.mock("@/views/dev/KitView.vue", () => stub);
vi.mock("@/views/fio/FIOBurnView.vue", () => stub);
vi.mock("@/views/fio/FIORepairView.vue", () => stub);
vi.mock("@/views/tools/HQUpgradeCalculatorView.vue", () => stub);
vi.mock("@/views/tools/MarketExplorationView.vue", () => stub);
vi.mock("@/views/tools/MarketLiveDataView.vue", () => stub);
vi.mock("@/views/tools/MarketReportView.vue", () => stub);
vi.mock("@/views/tools/ProductionChainView.vue", () => stub);
vi.mock("@/views/tools/ROIOverviewView.vue", () => stub);
vi.mock("@/views/tools/ResourceROIOverviewView.vue", () => stub);
vi.mock("@/views/tools/UpkeepPriceCalculatorView.vue", () => stub);

const at = (path: string, hash = "") =>
	({ path, hash }) as RouteLocationNormalized;

const scroll = router.options.scrollBehavior!;

describe("router routes", () => {
	it("registers the kit page in dev builds", () => {
		expect(router.resolve("/dev/kit").name).toBe("dev-kit");
	});

	it("loads the view of every route", async () => {
		const routes = router.getRoutes();
		expect(routes.length).toBeGreaterThan(20);

		for (const r of routes) {
			const load = r.components!.default as () => Promise<typeof stub>;
			expect((await load()).default, r.name as string).toBe(stub.default);
		}
	});
});

describe("router scrollBehavior", () => {
	it("keeps the scroll position on a query change on the same page", () => {
		expect(scroll(at("/search"), at("/search"), null)).toBe(false);
	});

	it("scrolls to the hash element on another page", () => {
		expect(scroll(at("/help", "#changelog"), at("/"), null)).toEqual({
			el: "#changelog",
		});
	});

	it("scrolls to the top on another page", () => {
		expect(scroll(at("/help"), at("/"), null)).toEqual({ top: 0 });
	});

	describe("restoring a saved position", () => {
		afterEach(() => {
			vi.useRealTimers();
			vi.restoreAllMocks();
		});

		const setHeights = (scrollHeight: number) => {
			vi.spyOn(
				document.documentElement,
				"scrollHeight",
				"get"
			).mockReturnValue(scrollHeight);
			vi.spyOn(window, "innerHeight", "get").mockReturnValue(500);
		};

		it("restores at once when the page is tall enough", async () => {
			setHeights(2000);
			const saved = { left: 0, top: 800 };

			await expect(scroll(at("/a"), at("/b"), saved)).resolves.toBe(
				saved
			);
		});

		it("waits for a page that is still growing", async () => {
			vi.useFakeTimers({ toFake: ["requestAnimationFrame", "Date"] });
			setHeights(600);
			const saved = { left: 0, top: 800 };
			const done = vi.fn();
			(scroll(at("/a"), at("/b"), saved) as Promise<unknown>).then(done);

			await vi.advanceTimersByTimeAsync(500);
			expect(done).not.toHaveBeenCalled();

			setHeights(2000);
			await vi.advanceTimersByTimeAsync(100);
			expect(done).toHaveBeenCalledWith(saved);
		});

		it("gives up after three seconds", async () => {
			vi.useFakeTimers({ toFake: ["requestAnimationFrame", "Date"] });
			setHeights(600);
			const saved = { left: 0, top: 800 };
			const done = vi.fn();
			(scroll(at("/a"), at("/b"), saved) as Promise<unknown>).then(done);

			await vi.advanceTimersByTimeAsync(2900);
			expect(done).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(300);
			expect(done).toHaveBeenCalledWith(saved);
		});
	});
});
