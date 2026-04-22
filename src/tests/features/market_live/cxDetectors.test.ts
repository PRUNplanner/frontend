import { describe, it, expect, vi, beforeEach } from "vitest";

import { CXDataPoint } from "@/features/market_live/cxExchange.types";
import { DetectorConfig } from "@/features/market_live/cxDetectors.types";
import { processUserDetectors } from "@/features/market_live/cxDetectors";

describe("Market Detector Engine", () => {
	// Mock globals for deterministic testing
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-22T12:00:00Z"));

		// Mock crypto.randomUUID
		vi.stubGlobal("crypto", {
			randomUUID: () => "test-uuid-123",
		});
	});

	// @ts-expect-error mock data
	const mockNewData: CXDataPoint = {
		material_ticker: "IRON",
		exchange_code: "CI1",
		price: 150,
		volume: 500,
		category: "Metal",
	};

	// @ts-expect-error mock data
	const mockOldData: CXDataPoint = {
		material_ticker: "IRON",
		exchange_code: "CI1",
		price: 100,
		volume: 400,
		category: "metal",
	};

	it("evaluates all logic gates (AND/OR), operators, and targets", () => {
		const configs: DetectorConfig[] = [
			{
				id: "config-1",
				name: "Complex Price Alert",
				enabled: true,
				severity: "HIGH",
				logic: {
					operator: "AND",
					conditions: [
						{
							field: "price",
							operator: "gt",
							target: { type: "previous_pct", offset: 20 }, // 100 + 20% = 120. 150 > 120 (True)
						},
						{
							field: "category",
							operator: "matches",
							target: { type: "static", value: "METAL" }, // Case-insensitive (True)
						},
					],
				},
			},
			{
				id: "config-2",
				name: "Volume Drop or Static Threshold",
				enabled: true,
				severity: "HIGH",
				logic: {
					operator: "OR",
					conditions: [
						{
							field: "volume",
							operator: "lt",
							target: { type: "static", value: 100 }, // 500 < 100 (False)
						},
						{
							field: "price",
							operator: "eq",
							target: { type: "previous" }, // 150 === 100 (False)
						},
					],
				},
			},
			{
				id: "config-disabled",
				name: "Disabled Rule",
				enabled: false,
				severity: "HIGH",
				logic: {
					operator: "AND",
					conditions: [
						{
							field: "price",
							operator: "gt",
							target: { type: "static", value: 1 },
						},
					],
				},
			},
		];

		const events = processUserDetectors(configs, mockOldData, mockNewData);

		// Assertions
		expect(events).toHaveLength(1); // Only config-1 should trigger

		const event = events[0];
		expect(event.ticker).toBe("IRON.CI1");
		expect(event.severity).toBe("HIGH");
		expect(event.id).toBe("test-uuid-123");
		expect(event.timestamp.toISOString()).toBe("2026-04-22T12:00:00.000Z");

		// Check generated message
		expect(event.message).toBe("price gt 120 AND category matches METAL");

		// Metadata Verification
		expect(event.metadata.triggers[0]).toMatchObject({
			field: "price",
			currentValue: 150,
			thresholdReached: 120,
			comparisonType: "previous_pct",
		});
	});

	it("handles edge cases: null data, missing fields, and mismatches", () => {
		const config: DetectorConfig = {
			id: "edge-1",
			name: "Edge Case",
			enabled: true,
			severity: "HIGH",
			logic: {
				operator: "AND",
				conditions: [
					{
						field: "price",
						operator: "gt",
						target: { type: "previous" },
					},
				],
			},
		};

		// 1. No old data for a 'previous' target should return no events
		expect(
			processUserDetectors([config], undefined, mockNewData)
		).toHaveLength(0);

		// 2. Mismatched types (String vs Number) should not trigger
		const mismatchConfig: DetectorConfig = {
			...config,
			logic: {
				operator: "AND",
				conditions: [
					{
						field: "category",
						operator: "gt",
						target: { type: "static", value: 100 },
					},
				],
			},
		};
		expect(
			processUserDetectors([mismatchConfig], mockOldData, mockNewData)
		).toHaveLength(0);
	});
});
