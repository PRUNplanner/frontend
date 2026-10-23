import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import MaterialMarketCard from "@/features/material_tile/components/MaterialMarketCard.vue";
import PSparkline from "@/ui/charts/PSparkline.vue";
import { PButton } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { makeOverview } from "@/tests/features/material_tile/marketOverview";

// Types & Interfaces
import type { IMarketCheck } from "@/features/cx/marketCheck.types";

const push = vi.hoisted(() => vi.fn());
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

const sparkCalls = vi.hoisted(() => vi.fn());
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (_name: string, params: { exchange: string }) => ({
		execute: async () => {
			sparkCalls(params);
			return {
				exchange: params.exchange,
				days: 30,
				series: { RAT: [100, null, 102, 101] },
			};
		},
	}),
}));

const material = {
	material_id: "x",
	category_name: "consumables (basic)",
	category_id: "y",
	name: "rations",
	ticker: "RAT",
	weight: 0.21,
	volume: 0.1,
};

const check = (over: Partial<IMarketCheck> = {}): IMarketCheck => ({
	ticker: "RAT",
	delta: -12,
	exchange: "IC1",
	sharePct: 0.4,
	traded30d: 3000,
	traded7d: 700,
	bid: 98,
	ask: 102,
	spreadPct: 3.9,
	flags: [],
	level: null,
	...over,
});

async function mountCard(props: Record<string, unknown> = {}) {
	const { wrapper } = await mountComponent(MaterialMarketCard, {
		ticker: "RAT",
		material,
		categoryClass: "material-category-consumables-basic",
		overview: makeOverview(),
		...props,
	});
	await flushPromises();
	return wrapper;
}

const row = (wrapper: VueWrapper, cx: string) =>
	wrapper.find(`tr[data-cx="${cx}"]`);
const headers = (wrapper: VueWrapper) =>
	wrapper.findAll("th").map((th) => th.text());

describe("MaterialMarketCard", () => {
	beforeEach(() => {
		push.mockClear();
		sparkCalls.mockClear();
	});

	it("shows the material, the Universe VWAP and every exchange", async () => {
		const wrapper = await mountCard();

		expect(wrapper.text()).toContain("Rations");
		expect(wrapper.text()).toContain(
			"game.material_category.consumables_(basic)"
		);
		expect(wrapper.text()).toContain("material_tile.card.universe_vwap");
		expect(
			wrapper.findAll("tbody tr").map((tr) => tr.attributes("data-cx"))
		).toEqual(["AI1", "CI1", "IC1", "NC1", "UNIVERSE"]);
		expect(headers(wrapper)).toEqual([
			"material_tile.card.columns.cx",
			"material_tile.card.columns.ask",
			"material_tile.card.columns.bid",
			"material_tile.card.columns.spread",
			"material_tile.card.columns.vwap_7d",
			"material_tile.card.columns.vwap_30d",
			"material_tile.card.columns.trend",
			"material_tile.card.columns.history",
			"material_tile.card.columns.per_day",
		]);
		// Universe has no ask, bid or spread
		expect(
			row(wrapper, "UNIVERSE")
				.findAll("td")
				.slice(1, 4)
				.map((td) => td.text())
		).toEqual(["—", "—", "—"]);
	});

	it("has no plan line, no Plan column and no tint outside a plan", async () => {
		const wrapper = await mountCard();

		expect(wrapper.find("[data-plan-line]").exists()).toBe(false);
		expect(headers(wrapper)).not.toContain("material_tile.card.columns.plan");
		expect(wrapper.find("[data-your-cx]").exists()).toBe(false);
		// no data date in the card
		expect(wrapper.text()).not.toContain("2026");
	});

	it("shows a fine Market check as it is, on the plan's CX", async () => {
		const wrapper = await mountCard({ daily: -12, marketCheck: check() });

		expect(wrapper.find("[data-check-cx]").text()).toContain("IC1");
		const chip = wrapper.find("[data-plan-chip]");
		expect(chip.text()).toBe("material_tile.card.chip.fine");
		expect(chip.attributes("data-level")).toBe("fine");
		// 12 of 100 a day on the others: watch
		expect(wrapper.find("[data-plan-detail]").text()).toBe(
			"material_tile.card.others.watch"
		);
		expect(headers(wrapper)).toContain("material_tile.card.columns.plan");
		expect(
			wrapper.findAll("[data-your-cx]").map((r) => r.attributes("data-cx"))
		).toEqual(["IC1"]);
		expect(row(wrapper, "IC1").text()).toContain("material_tile.card.your_cx");
	});

	it("shows a flagged check with its flag's words and level", async () => {
		const wrapper = await mountCard({
			daily: -12,
			marketCheck: check({ flags: ["no_offers"], level: "red" }),
		});

		const chip = wrapper.find("[data-plan-chip]");
		expect(chip.text()).toBe("cx.market_flags.flags.no_offers");
		expect(chip.attributes("data-level")).toBe("red");
		expect(chip.classes()).toContain("text-negative");
	});

	it("checked against Universe tints the Universe row", async () => {
		const wrapper = await mountCard({
			daily: -12,
			marketCheck: check({
				exchange: "UNIVERSE",
				flags: ["all_exchanges"],
				level: "muted",
			}),
		});

		expect(wrapper.find("[data-plan-line]").text()).toContain(
			"material_tile.card.plan.check_universe"
		);
		expect(
			wrapper.findAll("[data-your-cx]").map((r) => r.attributes("data-cx"))
		).toEqual(["UNIVERSE"]);
	});

	it("without a check judges all four exchanges", async () => {
		const wrapper = await mountCard({ daily: 30, dailyContext: "setup" });

		expect(wrapper.find("[data-plan-line]").text()).toContain(
			"material_tile.card.plan.setup_sells"
		);
		expect(wrapper.find("[data-plan-line]").text()).toContain(
			"material_tile.card.plan.across"
		);
		// 30 of 100 a day: watch everywhere
		expect(wrapper.find("[data-plan-chip]").text()).toBe(
			"material_tile.card.cross.watch"
		);
		expect(wrapper.findAll("[data-share]").map((s) => s.text())).toEqual([
			"30.0 %",
			"30.0 %",
			"30.0 %",
			"30.0 %",
			"7.5 %",
		]);
	});

	it("marks a rarely traded market, missing bids and inactive exchanges", async () => {
		const wrapper = await mountCard({
			overview: makeOverview({
				sum_traded_30d: { AI1: 1, CI1: 2, IC1: 5, NC1: 3, UNIVERSE: 11 },
				bid: { AI1: 0, CI1: 500, IC1: 750, NC1: 400, UNIVERSE: 0 },
				ask: { AI1: 1e6, CI1: 949e3, IC1: 799e3, NC1: 799e3, UNIVERSE: 0 },
				exchange_status: {
					AI1: "INACTIVE",
					CI1: "INACTIVE",
					IC1: "INACTIVE",
					NC1: "INACTIVE",
					UNIVERSE: "INACTIVE",
				},
			}),
		});

		expect(wrapper.find("[data-rare]").text()).toBe("material_tile.card.rare");
		expect(row(wrapper, "AI1").find("[data-spread]").text()).toBe(
			"material_tile.card.no_bids"
		);
		expect(row(wrapper, "AI1").find("[data-status]").text()).toBe(
			"material_tile.card.status.INACTIVE"
		);
	});

	it("draws a sparkline per exchange on one scale", async () => {
		const wrapper = await mountCard();

		// once the card stayed open a moment
		expect(sparkCalls).not.toHaveBeenCalled();
		await vi.waitFor(() => expect(sparkCalls).toHaveBeenCalledTimes(4));
		await flushPromises();
		expect(sparkCalls).toHaveBeenCalledWith({
			exchange: "AI1",
			metric: "vwap_daily",
			tickers: ["RAT"],
		});
		const sparks = wrapper.findAllComponents(PSparkline);
		expect(sparks).toHaveLength(4);
		expect(sparks[0].props("domain")).toEqual([100, 102]);
	});

	it("drops Spread and Plan and stacks the VWAPs in the sheet", async () => {
		const wrapper = await mountCard({
			daily: -12,
			marketCheck: check(),
			sheet: true,
		});

		expect(headers(wrapper)).toEqual([
			"material_tile.card.columns.cx",
			"material_tile.card.columns.ask",
			"material_tile.card.columns.bid",
			"material_tile.card.columns.vwap",
			"material_tile.card.columns.history",
			"material_tile.card.columns.per_day",
		]);
	});

	it("stacks the VWAPs and drops Spread but keeps Plan when narrow", async () => {
		const wrapper = await mountCard({
			daily: -12,
			marketCheck: check(),
			narrow: true,
		});

		expect(headers(wrapper)).toEqual([
			"material_tile.card.columns.cx",
			"material_tile.card.columns.ask",
			"material_tile.card.columns.bid",
			"material_tile.card.columns.vwap",
			"material_tile.card.columns.history",
			"material_tile.card.columns.per_day",
			"material_tile.card.columns.plan",
		]);
	});

	it("has two secondary buttons: exploration and details", async () => {
		const wrapper = await mountCard();
		const buttons = wrapper.findAllComponents(PButton);

		expect(buttons.map((b) => b.props("type"))).toEqual([
			"secondary",
			"secondary",
		]);
		await wrapper.find("[data-exploration]").trigger("click");
		expect(push).toHaveBeenCalledWith({
			name: "market-exploration",
			query: { material: "RAT" },
		});

		await wrapper.find("[data-details]").trigger("click");
		const card = wrapper.findComponent(MaterialMarketCard);
		expect(card.emitted("details")).toHaveLength(1);
	});

	it("says a click opens Market details where it does", async () => {
		const wrapper = await mountCard({ clickOpensDetails: true });

		expect(wrapper.text()).toContain("material_tile.card.hint_details");
	});

	it("shows the pinned state with a close button", async () => {
		const wrapper = await mountCard({ pinned: true });

		expect(wrapper.text()).toContain("material_tile.card.pinned");
		expect(wrapper.text()).toContain("material_tile.card.hint_pinned");
		await wrapper
			.find('[aria-label="material_tile.card.close"]')
			.trigger("click");
		expect(
			wrapper.findComponent(MaterialMarketCard).emitted("close")
		).toBeTruthy();
	});
});
