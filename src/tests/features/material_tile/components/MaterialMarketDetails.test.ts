import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import MaterialMarketDetails from "@/features/material_tile/components/MaterialMarketDetails.vue";
import MaterialDataChart from "@/features/market_exploration/components/MaterialDataChart.vue";
import { PButton } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { makeOverview } from "@/tests/features/material_tile/marketOverview";

// the chart loads market data, tested on its own
vi.mock(
	"@/features/market_exploration/components/MaterialDataChart.vue",
	() => ({
		default: {
			name: "MaterialDataChart",
			props: { materialTicker: String, metric: String },
			render: () => h("div"),
		},
	})
);

const material = {
	material_id: "x",
	category_name: "metals",
	category_id: "y",
	name: "iron",
	ticker: "FE",
	weight: 7.874,
	volume: 1,
};

async function mountDetails(props: Record<string, unknown> = {}) {
	const { wrapper } = await mountComponent(MaterialMarketDetails, {
		ticker: "FE",
		material,
		categoryClass: "material-category-metals",
		overview: makeOverview({
			exchange_status: {
				AI1: "ACTIVE",
				CI1: "STALE",
				IC1: "ACTIVE",
				NC1: "INACTIVE",
				UNIVERSE: "ACTIVE",
			},
		}),
		...props,
	});
	await flushPromises();
	return wrapper;
}

const headers = (wrapper: VueWrapper) =>
	wrapper.findAll("thead th").map((th) => th.text());

async function pick(wrapper: VueWrapper, view: string) {
	await wrapper
		.findAll('[role="group"] button')
		.find((b) => b.text() === `material_tile.details.views.${view}`)!
		.trigger("click");
}

describe("MaterialMarketDetails", () => {
	it("describes the material and how many exchanges are active", async () => {
		const wrapper = await mountDetails();
		const text = wrapper.text();

		expect(text).toContain("Iron");
		expect(text).toContain("7.87 t");
		expect(text).toContain("1.00 m³");
		expect(text).toContain("material_tile.details.data_of");
		expect(wrapper.find("[data-active]").classes()).toContain("text-warning");
		expect(wrapper.find("[data-plan-line]").exists()).toBe(false);
	});

	it("switches the exchange table between its three views", async () => {
		const wrapper = await mountDetails({ daily: -12 });

		expect(headers(wrapper)).toEqual([
			"material_tile.card.columns.cx",
			"material_tile.card.columns.ask",
			"material_tile.card.columns.bid",
			"material_tile.card.columns.spread",
			"material_tile.details.columns.spread_pct",
			"material_tile.card.columns.vwap_7d",
			"material_tile.card.columns.vwap_30d",
			"material_tile.card.columns.trend",
			"material_tile.details.columns.vs_universe",
		]);

		await pick(wrapper, "book");
		expect(headers(wrapper)).toEqual([
			"material_tile.card.columns.cx",
			"material_tile.details.columns.offered",
			"material_tile.details.columns.wanted",
			"material_tile.details.columns.delta",
			"material_tile.details.columns.ratio",
			"material_tile.details.columns.split",
		]);

		await pick(wrapper, "volume");
		expect(headers(wrapper)).toEqual([
			"material_tile.card.columns.cx",
			"material_tile.details.columns.traded_7d",
			"material_tile.details.columns.traded_30d",
			"material_tile.card.columns.per_day",
			"material_tile.details.columns.share_7d",
			"material_tile.details.columns.share_30d",
			"material_tile.details.columns.verdict",
		]);
		expect(wrapper.find('tr[data-cx="AI1"]').text()).toContain(
			"material_tile.card.verdict.watch"
		);
	});

	it("leaves the plan columns out without a daily flow", async () => {
		const wrapper = await mountDetails();
		await pick(wrapper, "volume");

		expect(headers(wrapper)).not.toContain(
			"material_tile.details.columns.verdict"
		);
	});

	it("shows the plan against the check, the same limits and your CX", async () => {
		const wrapper = await mountDetails({
			daily: 5,
			marketCheck: {
				ticker: "FE",
				delta: 5,
				exchange: "CI1",
				sharePct: 5,
				traded30d: 3000,
				traded7d: 700,
				bid: 98,
				ask: 102,
				spreadPct: 3.9,
				flags: [],
				level: null,
			},
		});

		const plan = wrapper.find("[data-plan-line]").text();
		expect(plan).toContain("material_tile.card.plan.plan_sells");
		expect(plan).toContain("material_tile.details.same_limits");
		expect(
			wrapper.findAll("[data-your-cx]").map((r) => r.attributes("data-cx"))
		).toEqual(["CI1"]);
	});

	it("explains the market's health in four tiles", async () => {
		const wrapper = await mountDetails();

		expect(
			wrapper.findAll("[data-health]").map((t) => t.attributes("data-health"))
		).toEqual(["breadth", "trend", "balance", "cohesion"]);
		// 500 offered, 500 wanted on each exchange
		expect(wrapper.find('[data-health="balance"]').text()).toContain(
			"material_tile.health.balance.even"
		);
	});

	it("switches the chart value", async () => {
		const wrapper = await mountDetails();
		const buttons = wrapper
			.findAllComponents(PButton)
			.filter((b) => b.text().startsWith("material_tile.chart.metric."));

		expect(buttons.map((b) => b.text())).toEqual([
			"material_tile.chart.metric.vwap",
			"material_tile.chart.metric.low",
			"material_tile.chart.metric.high",
			"material_tile.chart.metric.traded",
		]);
		expect(wrapper.findComponent(MaterialDataChart).props()).toEqual({
			materialTicker: "FE",
			metric: "vwap",
		});

		await buttons[3].trigger("click");
		expect(wrapper.findComponent(MaterialDataChart).props("metric")).toBe(
			"traded"
		);
	});
});
