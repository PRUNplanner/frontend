import { describe, it, expect } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import AlertFeedDetail from "@/features/market_live/components/AlertFeedDetail.vue";
import { mountComponent } from "@/tests/mountComponent";
import { formatAmount, formatNumber } from "@/util/numbers";

// Types & Interfaces
import type { CXDataPoint } from "@/features/market_live/cxExchange.types";

const data = {
	ticker: "RAT.NC1",
	material_ticker: "RAT",
	exchange_code: "NC1",
	last_updated: 0,
	volume: 0,
	price: 100,
	bid: 98,
	ask: 103,
	spread: 5,
	spread_pct: 5.1,
	buy_volume_total: 300,
	sell_volume_total: 100,
	buy_volume_change: -20,
	sell_volume_change: 1500,
	buy_vwap: 99.5,
	sell_vwap: 101.25,
} as CXDataPoint;

// the parameters only show with messages
const messages = {
	market_live: {
		components: {
			details: {
				bid: "Bid {value}",
				ask: "Ask {value}",
				vwap: "VWAP {value}",
				change: "Change {value}",
				buy_volume_value: "Buys {value}",
				sell_volume_value: "Sells {value}",
			},
		},
	},
};

async function mountDetail(point: Partial<CXDataPoint> = {}) {
	const { wrapper } = await mountComponent(
		AlertFeedDetail,
		{ data: { ...data, ...point } },
		{ messages }
	);
	return wrapper;
}

// the four columns as text lines, without their heading
const columns = (wrapper: VueWrapper) =>
	wrapper.findAll(".grid > div").map((col) =>
		col
			.findAll("div")
			.slice(1)
			.map((d) => d.text())
	);

describe("AlertFeedDetail", () => {
	it("shows price, spread and both volumes with their details", async () => {
		const wrapper = await mountDetail();

		expect(columns(wrapper)).toEqual([
			[formatNumber(100), "Bid 98.00", "Ask 103.00"],
			[formatNumber(5), `${formatNumber(5.1)} %`],
			[formatAmount(300), "VWAP 99.50", `Change ${formatAmount(-20)}`],
			[formatAmount(100), "VWAP 101.25", `Change ${formatAmount(1500)}`],
		]);
		expect(wrapper.text()).toContain(
			`Buys ${formatAmount(300)}Sells ${formatAmount(100)}`
		);
	});

	it("shares the bar by demand: 300 bought of 400 is 75 %", async () => {
		const wrapper = await mountDetail();

		const [buy, sell] = wrapper.findAll("[style]");
		expect(buy.attributes("style")).toContain("width: 75%");
		expect(sell.attributes("style")).toContain("width: 25%");
	});

	it("rounds the share to whole percent", async () => {
		const wrapper = await mountDetail({
			buy_volume_total: 1,
			sell_volume_total: 2,
		});

		const [buy, sell] = wrapper.findAll("[style]");
		expect(buy.attributes("style")).toContain("width: 33%");
		expect(sell.attributes("style")).toContain("width: 67%");
	});

	it("shows an unquoted price, spread and bid as unavailable", async () => {
		const wrapper = await mountDetail({
			price: undefined,
			bid: undefined,
			ask: undefined,
			spread: undefined,
			spread_pct: undefined,
			buy_vwap: undefined,
			sell_vwap: undefined,
		});

		expect(columns(wrapper)).toEqual([
			["—", "Bid —", "Ask —"],
			["—", "— %"],
			[formatAmount(300), "VWAP —", `Change ${formatAmount(-20)}`],
			[formatAmount(100), "VWAP —", `Change ${formatAmount(1500)}`],
		]);
	});
});
