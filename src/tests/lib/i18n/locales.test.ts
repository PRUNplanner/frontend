import { describe, expect, it } from "vitest";

import { dropInvalidMessages, i18n } from "@/lib/i18n";

const { t } = i18n.global;

describe("dropInvalidMessages", () => {
	it("finds no invalid message in en_US", () => {
		const en_US = i18n.global.getLocaleMessage("en_US");

		expect(
			dropInvalidMessages(en_US as Record<string, unknown>).dropped
		).toStrictEqual([]);
	});

	it("drops messages vue-i18n can't compile and keeps the rest", () => {
		const result = dropInvalidMessages({
			wrapper: {
				broken_link: "@:{terms.materials}数据",
				raw_at: "name@example.com",
				ok_link: "@:{'terms.materials'}数据",
				ok_at: "name{'@'}example.com",
				ok_named: "Volume: {value}",
			},
		});

		expect(result.dropped).toStrictEqual([
			"wrapper.broken_link",
			"wrapper.raw_at",
		]);
		expect(result.messages).toStrictEqual({
			wrapper: {
				ok_link: "@:{'terms.materials'}数据",
				ok_at: "name{'@'}example.com",
				ok_named: "Volume: {value}",
			},
		});
	});
});

describe("en_US volume terms", () => {
	it("uses traded volume for market data", () => {
		expect(t("market_exploration.overview.table.volume_7d")).toBe(
			"Traded Volume 7D"
		);
		expect(t("market_exploration.overview.table.volume_30d")).toBe(
			"Traded Volume 30D"
		);
		expect(t("market_exploration.kpis.universe_traded_7d")).toBe(
			"Universe Traded Volume 7D"
		);
		expect(t("material_tile.chart.labels.traded")).toBe("Traded Volume");
		expect(t("cx_info_table.traded_volume")).toBe("Traded Volume");
	});

	it("uses physical volume for cargo", () => {
		expect(t("xit.table.volume_value", { value: 1 })).toBe("Volume: 1");
		expect(t("hq_upgrade_calculator.cost.total_volume")).toBe(
			"Total Volume"
		);
	});
});
