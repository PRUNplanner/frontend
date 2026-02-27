import { describe, it, expect } from "vitest";

import {
	PreferenceType,
	ExchangeType,
} from "@/features/exchanges/manageCX.types";
import {
	ICXDataExchangeOption,
	ICXDataTickerOption,
} from "@/stores/planningStore.types";
import { useCXManagement } from "@/features/exchanges/useManageCX";
import { createPinia, setActivePinia } from "pinia";

describe("useCXManagement", async () => {
	setActivePinia(createPinia());

	const {
		canAddExchangePreference,
		canAddTickerPreference,
		updateExchangePreference,
		updateTickerPreference,
		deleteExchangePreference,
		deleteTickerPreference,
	} = await useCXManagement();

	describe("canAddExchangePreference", () => {
		it("should allow adding when list is empty", () => {
			expect(canAddExchangePreference([], "BUY").value).toBe(true);
		});

		it("should not allow BOTH if BUY or SELL exists", () => {
			const current: ICXDataExchangeOption[] = [
				{ type: "BUY", exchange: "AI1_30D" },
			];
			expect(canAddExchangePreference(current, "BOTH").value).toBe(false);
		});

		it("should not allow BUY if BOTH exists", () => {
			const current: ICXDataExchangeOption[] = [
				{ type: "BOTH", exchange: "AI1_30D" },
			];
			expect(canAddExchangePreference(current, "BUY").value).toBe(false);
		});

		it("should allow SELL if only BUY exists", () => {
			const current: ICXDataExchangeOption[] = [
				{ type: "BUY", exchange: "AI1_30D" },
			];
			expect(canAddExchangePreference(current, "SELL").value).toBe(true);
		});

		it("should return false for invalid preference type", () => {
			const current: ICXDataExchangeOption[] = [
				{ type: "BUY", exchange: "AI1_30D" },
			];
			// @ts-expect-error: testing invalid input
			expect(canAddExchangePreference(current, "INVALID").value).toBe(
				false
			);
		});
	});

	describe("canAddTickerPreference", () => {
		it("should allow adding when ticker is new", () => {
			expect(canAddTickerPreference([], "LST", "BUY").value).toBe(true);
		});

		it("should not allow BOTH if BUY exists for ticker", () => {
			const current: ICXDataTickerOption[] = [
				{ ticker: "LST", type: "BUY", value: 10 },
			];
			expect(canAddTickerPreference(current, "LST", "BOTH").value).toBe(
				false
			);
		});

		it("should not allow SELL if BOTH exists for ticker", () => {
			const current: ICXDataTickerOption[] = [
				{ ticker: "LST", type: "BOTH", value: 10 },
			];
			expect(canAddTickerPreference(current, "LST", "SELL").value).toBe(
				false
			);
		});

		it("should allow SELL if only BUY exists for ticker", () => {
			const current: ICXDataTickerOption[] = [
				{ ticker: "LST", type: "BUY", value: 10 },
			];
			expect(canAddTickerPreference(current, "LST", "SELL").value).toBe(
				true
			);
		});

		it("should return false for invalid ticker preference type", () => {
			const current: ICXDataTickerOption[] = [
				{ ticker: "LST", type: "BUY", value: 100 },
			];
			expect(
				// @ts-expect-error: testing invalid input
				canAddTickerPreference(current, "LST", "INVALID").value
			).toBe(false);
		});
	});

	describe("updateExchangePreference", () => {
		it("should add new preference", () => {
			const current: ICXDataExchangeOption[] = [];
			const updated = updateExchangePreference(current, "BUY", "AI1_30D");
			expect(updated).toContainEqual({
				type: "BUY",
				exchange: "AI1_30D",
			});
		});

		it("should update existing preference", () => {
			const current: ICXDataExchangeOption[] = [
				{ type: "BUY", exchange: "AI1_30D" },
			];
			const updated = updateExchangePreference(current, "BUY", "AI1_30D");
			expect(updated).toContainEqual({
				type: "BUY",
				exchange: "AI1_30D",
			});
		});

		it("should not add if not allowed", () => {
			const current: ICXDataExchangeOption[] = [
				{ type: "BOTH", exchange: "AI1_30D" },
			];
			const updated = updateExchangePreference(current, "BUY", "AI1_30D");
			expect(updated).toHaveLength(1);
			expect(updated[0].exchange).toBe("AI1_30D");
		});
	});

	describe("updateTickerPreference", () => {
		it("should add new ticker preference", () => {
			const current: ICXDataTickerOption[] = [];
			const updated = updateTickerPreference(current, "LST", "BUY", 100);
			expect(updated).toContainEqual({
				ticker: "LST",
				type: "BUY",
				value: 100,
			});
		});

		it("should update existing ticker preference", () => {
			const current: ICXDataTickerOption[] = [
				{ ticker: "LST", type: "BUY", value: 50 },
			];
			const updated = updateTickerPreference(current, "LST", "BUY", 200);
			expect(updated).toContainEqual({
				ticker: "LST",
				type: "BUY",
				value: 200,
			});
		});

		it("should not add if not allowed", () => {
			const current: ICXDataTickerOption[] = [
				{ ticker: "LST", type: "BOTH", value: 100 },
			];
			const updated = updateTickerPreference(current, "LST", "SELL", 50);
			expect(updated).toHaveLength(1);
			expect(updated[0].type).toBe("BOTH");
		});
	});

	describe("deleteExchangePreference", () => {
		it("should delete existing type", () => {
			const current: ICXDataExchangeOption[] = [
				{ type: "BUY", exchange: "AI1_30D" },
				{ type: "SELL", exchange: "AI1_30D" },
			];
			const updated = deleteExchangePreference(current, "BUY");
			expect(updated).toHaveLength(1);
			expect(updated[0].type).toBe("SELL");
		});
	});

	describe("deleteTickerPreference", () => {
		it("should delete existing ticker+type", () => {
			const current: ICXDataTickerOption[] = [
				{ ticker: "LST", type: "BUY", value: 100 },
				{ ticker: "LST", type: "SELL", value: 50 },
			];
			const updated = deleteTickerPreference(current, "LST", "BUY");
			expect(updated).toHaveLength(1);
			expect(updated[0].type).toBe("SELL");
		});
	});
});
