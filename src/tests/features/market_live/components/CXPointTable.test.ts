import { describe, it, expect } from "vitest";

import CXPointTable from "@/features/market_live/components/CXPointTable.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";
import { formatAmount, formatNumber } from "@/util/numbers";

// Types & Interfaces
import type { CXDataPoint } from "@/features/market_live/cxExchange.types";

const point = (ticker: string, extra: Partial<CXDataPoint> = {}) =>
	({
		ticker,
		material_ticker: ticker,
		exchange_code: "NC1",
		last_updated: 0,
		volume: 0,
		buy_volume_total: 1234,
		sell_volume_total: 5678,
		buy_volume_change: 0,
		sell_volume_change: 0,
		...extra,
	}) as CXDataPoint;

async function mountTable(data: CXDataPoint[]) {
	const { wrapper } = await mountComponent(CXPointTable, { data });
	return wrapper;
}

describe("CXPointTable", () => {
	it("lists the header columns", async () => {
		const wrapper = await mountTable([]);

		expect(
			wrapper.findAll("thead th[data-col-key]").map((th) => th.text())
		).toEqual([
			"market_live.components.point_table.table.ticker",
			"market_live.components.point_table.table.price",
			"market_live.components.point_table.table.bid",
			"market_live.components.point_table.table.ask",
			"market_live.components.point_table.table.spread_pct",
			"market_live.components.point_table.table.buy_volume",
			"market_live.components.point_table.table.sell_volume",
		]);
	});

	it("formats prices and volumes, one row per ticker", async () => {
		const wrapper = await mountTable([
			point("RAT.NC1", {
				price: 100.5,
				bid: 99,
				ask: 102,
				spread_pct: 3.456,
			}),
		]);

		expect(tableRows(wrapper)).toEqual([
			{
				ticker: "RAT.NC1",
				price: formatNumber(100.5),
				bid: formatNumber(99),
				ask: formatNumber(102),
				spread_pct: formatNumber(3.456, 2),
				buy_volume_total: formatAmount(1234),
				sell_volume_total: formatAmount(5678),
			},
		]);
	});

	it("shows a dash for what the exchange doesn't quote", async () => {
		const wrapper = await mountTable([point("DW.NC1")]);

		const [row] = tableRows(wrapper);
		expect([row.price, row.bid, row.ask, row.spread_pct]).toEqual([
			"—",
			"—",
			"—",
			"—",
		]);
		expect(row.buy_volume_total).toBe(formatAmount(1234));
	});

	it("treats a zero bid, ask and spread as missing", async () => {
		const wrapper = await mountTable([
			point("FE.NC1", { price: 0, bid: 0, ask: 0, spread_pct: 0 }),
		]);

		const [row] = tableRows(wrapper);
		// a price of 0 is a price, the others are not quoted
		expect(row.price).toBe(formatNumber(0));
		expect([row.bid, row.ask, row.spread_pct]).toEqual(["—", "—", "—"]);
	});
});
