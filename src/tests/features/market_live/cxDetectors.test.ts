import { describe, it, expect, vi, beforeEach } from "vitest";

import type { CXDataPoint } from "@/features/market_live/cxExchange.types";
import type { DetectorConfig } from "@/features/market_live/cxDetectors.types";
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

	it.each([
		["gt", 149, true],
		["gt", 150, false],
		["lt", 151, true],
		["lt", 150, false],
		["eq", 150, true],
		["eq", 151, false],
		["neq", 151, true],
		["neq", 150, false],
		["eq", "Metal", true],
		["eq", "metal", false],
		["matches", "metal", true],
		["matches", "Steel", false],
	] as const)("%s %s fires: %s", (operator, value, fires) => {
		const config = {
			id: "op",
			name: "Operator",
			enabled: true,
			severity: "HIGH",
			logic: {
				operator: "AND",
				conditions: [
					{
						field: typeof value === "number" ? "price" : "category",
						operator,
						target: { type: "static", value },
					},
				],
			},
		} as DetectorConfig;

		expect(
			processUserDetectors([config], mockOldData, mockNewData)
		).toHaveLength(fires ? 1 : 0);
	});

	describe("rule groups", () => {
		const rule = (logic: DetectorConfig["logic"]): DetectorConfig => ({
			id: "group",
			name: "Group",
			enabled: true,
			severity: "HIGH",
			logic,
		});
		const priceGt = (value: number) =>
			({
				field: "price",
				operator: "gt",
				target: { type: "static", value },
			}) as const;
		const volumeLt = (value: number) =>
			({
				field: "volume",
				operator: "lt",
				target: { type: "static", value },
			}) as const;
		const messages = (config: DetectorConfig) =>
			processUserDetectors([config], mockOldData, mockNewData).map(
				(e) => e.message
			);

		it("OR fires with the first condition that holds", () => {
			expect(
				messages(
					rule({
						operator: "OR",
						conditions: [volumeLt(100), priceGt(10), priceGt(20)],
					})
				)
			).toStrictEqual(["price gt 10"]);
		});

		it("OR stays silent when no condition holds", () => {
			expect(
				messages(
					rule({
						operator: "OR",
						conditions: [volumeLt(100), priceGt(1000)],
					})
				)
			).toStrictEqual([]);
		});

		it("OR reports every trigger of a nested group that holds", () => {
			expect(
				messages(
					rule({
						operator: "OR",
						conditions: [
							priceGt(1000),
							{
								operator: "AND",
								conditions: [priceGt(10), volumeLt(1000)],
							},
						],
					})
				)
			).toStrictEqual(["price gt 10 AND volume lt 1000"]);
		});

		it("OR skips a nested group that fails", () => {
			expect(
				messages(
					rule({
						operator: "OR",
						conditions: [
							{
								operator: "AND",
								conditions: [priceGt(10), volumeLt(100)],
							},
							priceGt(20),
						],
					})
				)
			).toStrictEqual(["price gt 20"]);
		});

		it("AND collects the triggers of a nested group", () => {
			expect(
				messages(
					rule({
						operator: "AND",
						conditions: [
							priceGt(10),
							{
								operator: "OR",
								conditions: [volumeLt(100), volumeLt(1000)],
							},
						],
					})
				)
			).toStrictEqual(["price gt 10 AND volume lt 1000"]);
		});

		it("AND fails when a nested group fails", () => {
			expect(
				messages(
					rule({
						operator: "AND",
						conditions: [
							priceGt(10),
							{
								operator: "OR",
								conditions: [volumeLt(100)],
							},
						],
					})
				)
			).toStrictEqual([]);
		});
	});

	describe("conditions", () => {
		const check = (
			field: string,
			operator: string,
			target: unknown,
			oldData: Partial<CXDataPoint> | undefined = mockOldData
		) =>
			processUserDetectors(
				[
					{
						id: "c",
						name: "C",
						enabled: true,
						severity: "HIGH",
						logic: {
							operator: "AND",
							conditions: [{ field, operator, target }],
						},
					} as DetectorConfig,
				],
				oldData as CXDataPoint | undefined,
				mockNewData
			);

		it("ignores a field the new data lacks", () => {
			expect(
				check("ask", "gt", { type: "static", value: 1 })
			).toHaveLength(0);
		});

		it("a percentage of a previous text value can't be compared", () => {
			expect(
				check("category", "gt", { type: "previous_pct", offset: 10 })
			).toHaveLength(0);
		});

		it("an operator that doesn't fit numbers never fires", () => {
			expect(
				check("price", "matches", { type: "static", value: 150 })
			).toHaveLength(0);
		});

		it("an unknown comparison target never fires", () => {
			expect(check("price", "gt", { type: "average" })).toHaveLength(0);
		});

		it("reports the previous value as the target of a previous comparison", () => {
			const [event] = check("price", "gt", { type: "previous" });

			expect(event.metadata.triggers[0]).toMatchObject({
				targetValue: 100,
				thresholdReached: 100,
				comparisonType: "previous",
			});
			expect(event.metadata.prevData).toBe(mockOldData);
			expect(event.metadata.data).toBe(mockNewData);
		});
	});
});
