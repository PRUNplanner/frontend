import { beforeAll, describe, expect, it } from "vitest";

import { exchangesStore } from "@/database/stores";
import { useExchangeData } from "@/database/services/useExchangeData";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";

describe("useExchangeData", () => {
	beforeAll(async () => {
		// @ts-expect-error
		await exchangesStore.setMany(exchanges);
	});

	describe("getExchangeTicker", () => {
		it("getExchangeTicker: fail", async () => {
			const { getExchangeTicker } = await useExchangeData();

			await expect(() => getExchangeTicker("foo")).rejects.toThrowError();
		});

		it("getExchangeTicker: valid", async () => {
			const { getExchangeTicker } = await useExchangeData();

			const result = await getExchangeTicker("RAT.AI1");
			console.log(result);
			expect(result).toBeDefined();
			expect(result.ticker_id).toBe("RAT.AI1");
		});
	});

	describe("getMaterialExchangeOverview", () => {
		it("valid overview result", async () => {
			const { getMaterialExchangeOverview } = await useExchangeData();

			const result = await getMaterialExchangeOverview("CL");

			expect(result.vwap_daily).toBeDefined();
			expect(result.vwap_7d).toBeDefined();
			expect(result.vwap_30d).toBeDefined();
			expect(result.sum_traded_7d).toBeDefined();
			expect(result.sum_traded_30d).toBeDefined();
			expect(result.calendar_date).toBeDefined();
			expect(result.exchange_status).toBeDefined();
		});
	});
});
