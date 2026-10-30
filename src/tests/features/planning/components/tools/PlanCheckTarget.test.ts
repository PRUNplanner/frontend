import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

import { reportError, trackEvent } from "@/lib/analytics/useAnalytics";
import PlanCheckTarget from "@/features/planning/components/tools/PlanCheckTarget.vue";
import { PInputNumber, PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { setupPlanningTestData } from "@/tests/features/planning/usePlanCalculation.fixtures";

// Types & Interfaces
import type { IPlanContext } from "@/features/planning/engine/engine.types";
import type { IPriceBook, IPriceSource } from "@/features/cx/priceBook";
import type { ISensitivityRow } from "@/features/planning/util/whatIf.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));
const explorationQuery = vi.fn();
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (_name: string, params: unknown) => ({
		execute: () => explorationQuery(params),
	}),
}));

const DAY = 86_400_000;

const source = (volume: IPriceSource["volume"]): IPriceSource => ({
	level: "fallback",
	exchange: volume === "UNIVERSE" ? null : volume,
	key: null,
	zero: false,
	volume,
});
const PRICES: Record<string, [number, "SELL" | "BUY", IPriceSource]> = {
	FE: [1000, "SELL", source("AI1")],
	RAT: [150, "BUY", source("UNIVERSE")],
	// sold at no price
	ZZZ: [0, "SELL", source("UNIVERSE")],
};
const ctx = {
	prices: {
		getPrice: (ticker) => PRICES[ticker][0],
		getPriceSource: (ticker) => PRICES[ticker][2],
	} satisfies IPriceBook,
} as unknown as IPlanContext;

const rows = (...tickers: string[]): ISensitivityRow[] =>
	tickers.map((ticker) => ({
		ticker,
		side: PRICES[ticker][1] === "SELL" ? "sell" : "buy",
		// buying more costs more, selling for more earns more
		slope: PRICES[ticker][1] === "SELL" ? 6000 : -3000,
		breakEven: "never",
	}));

async function mountTool(props: Record<string, unknown> = {}) {
	const { wrapper } = await mountComponent(PlanCheckTarget, {
		ctx,
		profit: 4000,
		rows: rows("RAT", "FE", "ZZZ"),
		...props,
	});
	return wrapper;
}

const result = (w: Awaited<ReturnType<typeof mountTool>>) =>
	w.find("[data-target-result]");
const range = (w: Awaited<ReturnType<typeof mountTool>>) =>
	w.find("[data-target-range]");
// a pending range fetch
interface Pending {
	resolve: (v: unknown) => void;
	reject: (e: Error) => void;
}
// a failed range fetch reports its error
function silenceErrors() {
	return vi.mocked(reportError).mockClear();
}
async function setTarget(
	w: Awaited<ReturnType<typeof mountTool>>,
	value: number | null
) {
	w.findComponent(PInputNumber).vm.$emit("update:value", value);
	await flushPromises();
}

describe("PlanCheckTarget", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});

	beforeEach(() => {
		explorationQuery.mockResolvedValue([]);
	});

	it("starts on the largest sold material with the profit rounded up to 10k", async () => {
		const wrapper = await mountTool();

		expect(wrapper.findComponent(PSelect).props("value")).toBe("FE");
		expect(wrapper.findComponent(PInputNumber).props("value")).toBe(10_000);
		// 4,000 + 6,000 more profit needs twice today's 1,000
		expect(result(wrapper).text()).toContain("2,000 ȼ");
		const change = result(wrapper).find("[data-price-change]");
		expect(change.text()).toBe("+100.0 %");
		expect(change.classes()).toContain("text-positive");
		const text = wrapper.find("dl").text();
		expect(text).toContain("1,000 ȼ");
		// FE.AI1 bid and ask
		expect(text).toContain("1,020 · 1,100 ȼ");
		// nothing is fetched or tracked before the solver is used
		expect(range(wrapper).exists()).toBe(false);
		expect(explorationQuery).not.toHaveBeenCalled();
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("starts on the first row when nothing is sold", async () => {
		const wrapper = await mountTool({ rows: rows("RAT") });

		expect(wrapper.findComponent(PSelect).props("value")).toBe("RAT");
		expect(wrapper.find("dl").text()).toContain(
			"plan.tools.plan_check.target.bid_ask"
		);
	});

	it("renders nothing without materials", async () => {
		const wrapper = await mountTool({ rows: [] });

		expect(wrapper.find("[data-target-price]").exists()).toBe(false);
	});

	it("tracks the first use only and loads the 30-day range of the volume exchange", async () => {
		explorationQuery.mockResolvedValue([
			{ date_epoch: 100 * DAY, traded: 5, low_p: 900, high_p: 1100 },
			{ date_epoch: 90 * DAY, traded: 2, low_p: 800, high_p: 1000 },
			// older than 30 days before the last trade
			{ date_epoch: 60 * DAY, traded: 2, low_p: 1, high_p: 9999 },
			// nothing traded
			{ date_epoch: 99 * DAY, traded: 0, low_p: 1, high_p: 9999 },
		]);
		const wrapper = await mountTool();

		await setTarget(wrapper, 8_000);
		await setTarget(wrapper, 9_000);

		expect(trackEvent).toHaveBeenCalledTimes(1);
		expect(trackEvent).toHaveBeenCalledWith("plan:plancheck_target", {
			has_target: true,
		});
		expect(explorationQuery).toHaveBeenCalledTimes(1);
		expect(explorationQuery).toHaveBeenCalledWith({
			exchangeTicker: "AI1",
			materialTicker: "FE",
		});
		expect(range(wrapper).text()).toBe("800 – 1,100 ȼ");
		// 1,000 × (1 + 5,000 / 6,000) is above the range
		expect(wrapper.text()).toContain("plan.tools.plan_check.target.above");
	});

	it("shows … while loading and tells when the range could not be loaded", async () => {
		let reject!: (e: Error) => void;
		explorationQuery.mockReturnValue(
			new Promise((_, r) => {
				reject = r;
			})
		);
		const error = silenceErrors();
		const wrapper = await mountTool();
		await setTarget(wrapper, 8_000);
		expect(range(wrapper).text()).toBe("…");

		reject(new Error("offline"));
		await flushPromises();

		expect(range(wrapper).text()).toBe(
			"plan.tools.plan_check.target.range_error"
		);
		expect(reportError).toHaveBeenCalledTimes(1);
		expect(wrapper.text()).not.toContain(
			"plan.tools.plan_check.target.above"
		);
	});

	it("says so when nothing traded in the last 30 days", async () => {
		const wrapper = await mountTool();
		await setTarget(wrapper, 8_000);

		expect(range(wrapper).text()).toBe("cx.market_flags.popover.none");
		expect(wrapper.text()).not.toContain(
			"plan.tools.plan_check.target.below"
		);
	});

	it("checks all four exchanges for UNIVERSE and reads the price of all of them", async () => {
		explorationQuery.mockImplementation(
			async ({ exchangeTicker }: { exchangeTicker: string }) => [
				{
					date_epoch: DAY,
					traded: 1,
					low_p: exchangeTicker === "NC1" ? 100 : 400,
					high_p: 500,
				},
			]
		);
		const wrapper = await mountTool();
		wrapper.findComponent(PSelect).vm.$emit("update:value", "RAT");
		await flushPromises();
		// 150 × (1 + (2,000 − 4,000) / −3,000) = 250
		await setTarget(wrapper, 2_000);

		expect(
			explorationQuery.mock.calls.map(([p]) => p.exchangeTicker).sort()
		).toEqual(["AI1", "CI1", "IC1", "NC1"]);
		expect(range(wrapper).text()).toBe("100 – 500 ȼ");
		// no CX ticker for UNIVERSE: no bid or ask
		expect(wrapper.find("dl").text()).toContain(
			"cx.market_flags.popover.none · cx.market_flags.popover.none"
		);
		// 150 × 1.667 = 250 is inside, so no hint
		expect(wrapper.text()).not.toContain("target.above");
		expect(wrapper.text()).not.toContain("target.below");
	});

	it("colours a target below today's profit and flags it under the range", async () => {
		explorationQuery.mockResolvedValue([
			{ date_epoch: DAY, traded: 3, low_p: 900, high_p: 1100 },
		]);
		const wrapper = await mountTool();
		// 1,000 × (1 − 2,000 / 6,000) = 667 sold
		await setTarget(wrapper, 2_000);

		expect(result(wrapper).text()).toContain("667 ȼ");
		const change = result(wrapper).find("[data-price-change]");
		expect(change.text()).toBe("-33.3 %");
		expect(change.classes()).toContain("text-negative");
		expect(wrapper.text()).toContain("plan.tools.plan_check.target.below");
	});

	it.each([
		// −6,000 / 6,000 takes the price to 0
		{ target: -2_000, why: "that takes the price to zero" },
		{ target: null, why: "that is cleared" },
	])("calls a target $why unreachable", async ({ target }) => {
		const wrapper = await mountTool();
		await setTarget(wrapper, target);

		expect(result(wrapper).text()).toContain(
			"plan.tools.plan_check.target.unreachable"
		);
	});

	it("tracks a cleared target as none", async () => {
		const wrapper = await mountTool();
		await setTarget(wrapper, null);

		expect(trackEvent).toHaveBeenCalledWith("plan:plancheck_target", {
			has_target: false,
		});
	});

	it("is unreachable for a material without a price today", async () => {
		const wrapper = await mountTool({ rows: rows("ZZZ") });

		expect(result(wrapper).text()).toContain(
			"plan.tools.plan_check.target.unreachable"
		);
		expect(wrapper.find("dl").text()).toContain("0 ȼ");
	});

	it.each([
		{
			stale: "range",
			settle: (p: Pending) =>
				p.resolve([
					{ date_epoch: DAY, traded: 1, low_p: 1, high_p: 2 },
				]),
		},
		{
			stale: "range error",
			settle: (p: Pending) => p.reject(new Error("offline")),
		},
	])(
		"ignores a $stale that arrives after the material changed",
		async ({ settle }) => {
			silenceErrors();
			let first!: Pending;
			explorationQuery.mockReturnValueOnce(
				new Promise((resolve, reject) => {
					first = { resolve, reject };
				})
			);
			const wrapper = await mountTool();
			await setTarget(wrapper, 8_000);

			explorationQuery.mockResolvedValue([
				{ date_epoch: DAY, traded: 1, low_p: 10, high_p: 20 },
			]);
			wrapper.findComponent(PSelect).vm.$emit("update:value", "ZZZ");
			await flushPromises();
			settle(first);
			await flushPromises();

			expect(range(wrapper).text()).toBe("10 – 20 ȼ");
		}
	);

	it("shows no result for a material that is not in the list", async () => {
		const wrapper = await mountTool();
		wrapper.findComponent(PSelect).vm.$emit("update:value", "NOPE");
		await flushPromises();

		expect(result(wrapper).exists()).toBe(false);
		expect(wrapper.find("dl").exists()).toBe(false);
	});
});
