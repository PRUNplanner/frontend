import { afterEach, describe, expect, it } from "vitest";

import { dropInvalidMessages, i18n, localeLazyLoaders } from "@/lib/i18n";

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

describe("dropInvalidMessages values", () => {
	it("keeps values that are no text or group", () => {
		const input = { count: 3, empty: null, flag: false };

		const result = dropInvalidMessages(input);

		expect(result.dropped).toStrictEqual([]);
		expect(result.messages).toStrictEqual(input);
	});
});

describe("missing messages", () => {
	afterEach(() => {
		i18n.global.locale.value = "en_US";
	});

	it("shows the key in keymode", () => {
		i18n.global.locale.value = "keymode";

		expect(t("wrapper.not_a_message")).toBe("wrapper.not_a_message");
	});

	it("returns the key of a message that no locale has", () => {
		i18n.global.locale.value = "de_DE";

		expect(t("terms.not_a_message")).toBe("terms.not_a_message");
	});

	it("falls back to en_US for a locale without messages", () => {
		const en = t("wrapper.planning_data.plan");
		i18n.global.locale.value = "de_DE";

		expect(t("wrapper.planning_data.plan")).toBe(en);
	});
});

describe("localeLazyLoaders", () => {
	it("resolves the message files of a locale", async () => {
		const files = Object.keys(localeLazyLoaders).filter((path) =>
			path.startsWith("/src/locales/de_DE/")
		);

		const messages = await Promise.all(
			files.map((path) => localeLazyLoaders[path]())
		);

		expect(files.length).toBeGreaterThan(0);
		for (const mod of messages) expect(typeof mod).toBe("object");
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
		expect(t("material_tile.chart.metric.traded")).toBe("Traded Volume");
	});

	it("uses physical volume for cargo", () => {
		expect(t("xit.table.volume_value", { value: 1 })).toBe("Volume: 1");
		expect(t("hq_upgrade_calculator.cost.total_volume")).toBe(
			"Total Volume"
		);
	});
});
