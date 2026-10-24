import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import type { Slots } from "vue";
import { flushPromises } from "@vue/test-utils";

import ProductionChainView from "@/views/tools/ProductionChainView.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	index,
	seedGameData,
} from "@/tests/features/production_chain/chain.fixtures";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers
const { passThrough, nav, trackEvent, execute } = vi.hoisted(() => ({
	passThrough: (name: string) => ({
		__esModule: true,
		default: {
			name,
			setup:
				(_: unknown, { slots }: { slots: Slots }) =>
				() =>
					slots.default?.(),
		},
	}),
	nav: {
		route: { query: {} as Record<string, string> },
		replace: vi.fn(),
	},
	trackEvent: vi.fn(),
	execute: vi.fn(),
}));

vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader")
);
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	passThrough("WrapperGameDataLoader")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => ({
	default: { name: "HelpDrawer", render: () => null },
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent }));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: () => ({ execute }),
}));
vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	useRoute: () => nav.route,
	useRouter: () => ({
		replace: nav.replace,
		resolve: () => ({ href: "/production-chain" }),
	}),
}));

const STORAGE_KEY = "prunplanner_production_chain";

const toolUses = () =>
	trackEvent.mock.calls.filter(([event]) => event === "tool:use");

describe("ProductionChainView", () => {
	beforeAll(seedGameData);

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		nav.route.query = {};
		nav.replace.mockClear();
		trackEvent.mockClear();
		execute.mockReset();
		execute.mockResolvedValue(index);
		localStorage.clear();
	});

	afterEach(() => vi.useRealTimers());

	it("starts empty without a link or a last chain (AC 15)", async () => {
		const { wrapper } = await mountComponent(ProductionChainView);
		expect(wrapper.find("[data-testid='chain-empty']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='chain-result-profit']").exists()).toBe(
			false
		);
		const createPlans = wrapper.find("[data-testid='chain-create-plans']");
		expect(createPlans.attributes("disabled")).toBeDefined();
		expect(execute).not.toHaveBeenCalled();
	});

	it("restores the chain from the URL, untracked (AC 15)", async () => {
		nav.route.query = {
			t: "DW:100,RAT:50",
			eff: "80",
			raw: "buy",
			byp: "sell",
			src: "C:buy",
		};
		const { wrapper } = await mountComponent(ProductionChainView);
		expect(wrapper.find("[data-testid='chain-empty']").exists()).toBe(false);
		expect(wrapper.find("[data-testid='chain-row-DW']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='chain-row-RAT']").exists()).toBe(true);
		expect(wrapper.findAll("[data-testid='chain-target']").length).toBe(2);
		vi.advanceTimersByTime(2000);
		expect(toolUses()).toEqual([]);
		expect(nav.replace).not.toHaveBeenCalled();
	});

	it("writes changes to the URL and the browser, and tracks them", async () => {
		nav.route.query = { t: "DW:100" };
		const { wrapper } = await mountComponent(ProductionChainView);
		await wrapper
			.find("button[aria-label='production_chains.targets.more']")
			.trigger("click");
		await flushPromises();
		const query = nav.replace.mock.calls.at(-1)![0].query;
		expect(query.t).toBe("DW:110");
		expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).t).toBe("DW:110");

		vi.advanceTimersByTime(1100);
		expect(toolUses()).toHaveLength(1);
		expect(toolUses()[0][1]).toMatchObject({
			tool_name: "production_chain",
			targets: ["DW"],
			target_count: 1,
			efficiency: 100,
			raw_source: "buy",
			byproducts: "cover",
		});
	});

	it("opens the last chain from the browser without a link", async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ t: "OVE:50" }));
		const { wrapper } = await mountComponent(ProductionChainView);
		expect(wrapper.find("[data-testid='chain-row-OVE']").exists()).toBe(true);
	});

	it("loads the planet index only when something extracts (AC 6)", async () => {
		nav.route.query = { t: "DW:100", raw: "extract" };
		const { wrapper } = await mountComponent(ProductionChainView);
		await flushPromises();
		expect(execute).toHaveBeenCalledTimes(1);
		await vi.waitFor(() =>
			expect(
				wrapper.find("button[aria-label='production_chains.table.choose_planet']").exists()
			).toBe(true)
		);
	});
});
