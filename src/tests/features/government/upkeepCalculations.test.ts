import { describe, expect, it } from "vitest";

import {
	calculatePricePerNeed,
	getBuildingsForNeed,
	getBuildingNeedCount,
	calculateMaterialsForNeed,
	UPKEEP_BUILDINGS,
	UPKEEP_NEED_TYPES,
} from "@/features/government/upkeepCalculations";

import type { IUpkeepBuilding } from "@/features/government/upkeepCalculations.types";

describe("Government: Upkeep Calculations", () => {
	describe("UPKEEP_NEED_TYPES", () => {
		it("should contain all 5 need types", () => {
			expect(UPKEEP_NEED_TYPES).toHaveLength(5);
			expect(UPKEEP_NEED_TYPES).toContain("safety");
			expect(UPKEEP_NEED_TYPES).toContain("health");
			expect(UPKEEP_NEED_TYPES).toContain("comfort");
			expect(UPKEEP_NEED_TYPES).toContain("culture");
			expect(UPKEEP_NEED_TYPES).toContain("education");
		});
	});

	describe("UPKEEP_BUILDINGS", () => {
		it("should contain all 14 upkeep buildings", () => {
			expect(UPKEEP_BUILDINGS).toHaveLength(14);
		});

		it("should have valid structure for each building", () => {
			for (const building of UPKEEP_BUILDINGS) {
				expect(building).toHaveProperty("ticker");
				expect(building).toHaveProperty("name");
				expect(building).toHaveProperty("materials");
				expect(building).toHaveProperty("needs");
				expect(building.materials.length).toBeGreaterThan(0);
			}
		});
	});

	describe("calculatePricePerNeed", () => {
		it("should calculate price per need correctly", () => {
			// Material price: 100, qty per day: 10, need provided: 500
			// Need per qty = 500 / 10 = 50
			// Price per need = 100 / 50 = 2
			const result = calculatePricePerNeed(100, 10, 500);
			expect(result).toBe(2);
		});

		it("should return Infinity when needProvided is 0", () => {
			const result = calculatePricePerNeed(100, 10, 0);
			expect(result).toBe(Infinity);
		});

		it("should return Infinity when qtyPerDay is 0", () => {
			const result = calculatePricePerNeed(100, 0, 500);
			expect(result).toBe(Infinity);
		});

		it("should handle decimal values correctly", () => {
			// Material price: 50, qty per day: 0.5, need provided: 833.3
			// Need per qty = 833.3 / 0.5 = 1666.6
			// Price per need = 50 / 1666.6 ≈ 0.03
			const result = calculatePricePerNeed(50, 0.5, 833.3);
			expect(result).toBeCloseTo(0.03, 2);
		});
	});

	describe("getBuildingsForNeed", () => {
		it("should return buildings that provide safety", () => {
			const buildings = getBuildingsForNeed("safety");
			expect(buildings.length).toBeGreaterThan(0);

			// SST, SDP, and EMC provide safety
			const tickers = buildings.map((b) => b.ticker);
			expect(tickers).toContain("SST");
			expect(tickers).toContain("SDP");
			expect(tickers).toContain("EMC");
		});

		it("should return buildings that provide health", () => {
			const buildings = getBuildingsForNeed("health");
			expect(buildings.length).toBeGreaterThan(0);

			// INF, HOS, WCE, EMC provide health
			const tickers = buildings.map((b) => b.ticker);
			expect(tickers).toContain("INF");
			expect(tickers).toContain("HOS");
			expect(tickers).toContain("WCE");
			expect(tickers).toContain("EMC");
		});

		it("should return buildings that provide comfort", () => {
			const buildings = getBuildingsForNeed("comfort");
			expect(buildings.length).toBeGreaterThan(0);

			// PAR, 4DA, WCE, ACA provide comfort
			const tickers = buildings.map((b) => b.ticker);
			expect(tickers).toContain("PAR");
			expect(tickers).toContain("4DA");
			expect(tickers).toContain("WCE");
			expect(tickers).toContain("ACA");
		});

		it("should return buildings that provide culture", () => {
			const buildings = getBuildingsForNeed("culture");
			expect(buildings.length).toBeGreaterThan(0);

			// ART, VRT, PBH, ACA provide culture
			const tickers = buildings.map((b) => b.ticker);
			expect(tickers).toContain("ART");
			expect(tickers).toContain("VRT");
			expect(tickers).toContain("PBH");
			expect(tickers).toContain("ACA");
		});

		it("should return buildings that provide education", () => {
			const buildings = getBuildingsForNeed("education");
			expect(buildings.length).toBeGreaterThan(0);

			// LIB, UNI, PBH provide education
			const tickers = buildings.map((b) => b.ticker);
			expect(tickers).toContain("LIB");
			expect(tickers).toContain("UNI");
			expect(tickers).toContain("PBH");
		});

		it("should not return buildings that don't provide the need", () => {
			const safetyBuildings = getBuildingsForNeed("safety");

			// PAR only provides comfort, not safety
			const tickers = safetyBuildings.map((b) => b.ticker);
			expect(tickers).not.toContain("PAR");
		});
	});

	describe("getBuildingNeedCount", () => {
		it("should return 1 for single-need buildings", () => {
			// SST only provides safety
			const sst = UPKEEP_BUILDINGS.find((b) => b.ticker === "SST");
			expect(sst).toBeDefined();
			expect(getBuildingNeedCount(sst as IUpkeepBuilding)).toBe(1);

			// PAR only provides comfort
			const par = UPKEEP_BUILDINGS.find((b) => b.ticker === "PAR");
			expect(par).toBeDefined();
			expect(getBuildingNeedCount(par as IUpkeepBuilding)).toBe(1);
		});

		it("should return 2 for dual-need buildings", () => {
			// EMC provides safety and health
			const emc = UPKEEP_BUILDINGS.find((b) => b.ticker === "EMC");
			expect(emc).toBeDefined();
			expect(getBuildingNeedCount(emc as IUpkeepBuilding)).toBe(2);

			// WCE provides health and comfort
			const wce = UPKEEP_BUILDINGS.find((b) => b.ticker === "WCE");
			expect(wce).toBeDefined();
			expect(getBuildingNeedCount(wce as IUpkeepBuilding)).toBe(2);

			// PBH provides culture and education
			const pbh = UPKEEP_BUILDINGS.find((b) => b.ticker === "PBH");
			expect(pbh).toBeDefined();
			expect(getBuildingNeedCount(pbh as IUpkeepBuilding)).toBe(2);
		});
	});

	describe("calculateMaterialsForNeed", () => {
		it("should return calculations for all materials in buildings providing the need", async () => {
			const mockGetPrice = async (ticker: string) => {
				const prices: Record<string, number> = {
					DW: 50,
					OFF: 100,
					SUN: 500,
				};
				return prices[ticker] || 0;
			};

			const calculations = await calculateMaterialsForNeed(
				"safety",
				mockGetPrice
			);

			expect(calculations.length).toBeGreaterThan(0);

			// Check that SST materials are included
			const dwCalc = calculations.find(
				(c) => c.ticker === "DW" && c.buildingTicker === "SST"
			);
			expect(dwCalc).toBeDefined();
			expect(dwCalc?.cxPrice).toBe(50);
		});

		it("should sort calculations by price per need ascending", async () => {
			const mockGetPrice = async (ticker: string) => {
				const prices: Record<string, number> = {
					DW: 50,
					OFF: 100,
					SUN: 500,
					POW: 200,
					RAD: 1000,
					CCD: 5000,
					SUD: 5000,
					PK: 50,
					BND: 20,
					RED: 2000,
					BSC: 3000,
				};
				return prices[ticker] || 0;
			};

			const calculations = await calculateMaterialsForNeed(
				"safety",
				mockGetPrice
			);

			// Filter only priced calculations
			const pricedCalcs = calculations.filter((c) => c.cxPrice > 0);

			// Check that they're sorted by pricePerNeed
			for (let i = 1; i < pricedCalcs.length; i++) {
				expect(pricedCalcs[i].pricePerNeed).toBeGreaterThanOrEqual(
					pricedCalcs[i - 1].pricePerNeed
				);
			}
		});

		it("should put materials with no price at the end", async () => {
			const mockGetPrice = async (ticker: string) => {
				// Only return price for some materials
				const prices: Record<string, number> = {
					DW: 50,
					OFF: 100,
				};
				return prices[ticker] || 0;
			};

			const calculations = await calculateMaterialsForNeed(
				"safety",
				mockGetPrice
			);

			// Find materials with price 0
			const zeroPriceCalcs = calculations.filter((c) => c.cxPrice === 0);
			const pricedCalcs = calculations.filter((c) => c.cxPrice > 0);

			if (zeroPriceCalcs.length > 0 && pricedCalcs.length > 0) {
				// Get the index of the first zero-price calc
				const firstZeroIndex = calculations.findIndex((c) => c.cxPrice === 0);
				// Get the index of the last priced calc
				const lastPricedIndex =
					calculations.length -
					1 -
					[...calculations].reverse().findIndex((c) => c.cxPrice > 0);

				// All zero-price calcs should come after all priced calcs
				expect(firstZeroIndex).toBeGreaterThan(lastPricedIndex);
			}
		});

	});
});
