import { describe, it, expect } from "vitest";

import {
	nearestExchange,
	roiChartData,
	roiFrontier,
	roiInsight,
	shortPlanetName,
} from "@/features/resource_roi_overview/resourceROIChart.util";

// Types & Interfaces
import type { IResourceROIResult } from "@/features/resource_roi_overview/useResourceROIOverview.types";

function row(
	planetName: string,
	planROI: number,
	dailyProfit: number,
	[ai1, ci1, ic1, nc1]: [number, number, number, number]
): IResourceROIResult {
	return {
		planetNaturalId: planetName,
		planetName,
		buildingTicker: "EXT",
		dailyYield: 0,
		percentMaxDailyYield: 0,
		cogm: undefined,
		outputProfit: 0,
		dailyProfit,
		planCost: 0,
		planROI,
		planArea: 0,
		planProfitArea: 0,
		planetSurface: [],
		planetGravity: [],
		planetPressure: [],
		planetTemperature: [],
		planetCOGC: null,
		planetInfrastructures: [],
		distanceAI1: ai1,
		distanceCI1: ci1,
		distanceIC1: ic1,
		distanceNC1: nc1,
	};
}

// ALO, as in the mockup (specs/assets/charts/07-resource-roi-drawer.png)
const ALO: IResourceROIResult[] = [
	row("Nascent", 11.88, 106750, [2, 9, 10, 12]),
	row("Deimos", 12.46, 101761, [1, 8, 9, 11]),
	row("CC-558c", 12.63, 107650, [23, 20, 15, 14]),
	row("Sheol", 12.71, 106967, [29, 21, 26, 20]),
	row("BI-500b", 12.82, 128111, [19, 26, 19, 25]),
	row("KC-765b", 13.28, 123732, [17, 22, 11, 17]),
	row("Ementior", 13.95, 90884, [15, 10, 19, 14]),
	row("IC-530a", 14.25, 115272, [29, 23, 21, 17]),
	row("Loss", -40, -500, [3, 3, 3, 3]),
	row("Nowhere", 12, 100000, [-1, -1, -1, -1]),
];

describe("resourceROIChart.util", () => {
	it("picks the nearest exchange with a route, the first on a tie", () => {
		expect(nearestExchange(ALO[0])).toEqual({ code: "AI1", jumps: 2 });
		expect(nearestExchange(ALO[4])).toEqual({ code: "AI1", jumps: 19 });
		expect(nearestExchange(ALO[6])).toEqual({ code: "CI1", jumps: 10 });
		expect(nearestExchange(row("x", 1, 1, [-1, 4, -1, 2]))).toEqual({
			code: "NC1",
			jumps: 2,
		});
		expect(nearestExchange(ALO[9])).toBeNull();
	});

	it("plots ROI against jumps and counts what it leaves out", () => {
		const nearest = roiChartData(ALO, "nearest");
		expect(nearest.points).toHaveLength(8);
		expect(nearest.noPayback).toBe(1);
		expect(nearest.noRoute).toBe(1);
		expect(nearest.points[2]).toMatchObject({
			x: 12.63,
			y: 14,
			exchange: "NC1",
		});

		const ci1 = roiChartData(ALO, "CI1");
		expect(ci1.points.map((p) => p.exchange)).toEqual(
			Array(8).fill("CI1")
		);
		expect(ci1.points[2].y).toBe(20);
		expect(roiChartData([row("x", 5, 1, [3, -1, 2, 2])], "CI1").noRoute).toBe(1);
	});

	it("zooms to paybacks within twice the fastest", () => {
		// fastest 11.88 d: up to 23.76 d stays, 30 d and 300 d go
		const data = roiChartData(
			[
				...ALO,
				row("Near", 23, 1, [0, 1, 1, 1]),
				row("Slow", 30, 1, [0, 1, 1, 1]),
				row("Slower", 300, 1, [0, 1, 1, 1]),
			],
			"nearest"
		);
		expect(data.maxDays).toBeCloseTo(23.76);
		expect(data.slow).toBe(2);
		expect(data.points.map((p) => p.row.planetName)).toContain("Near");
		expect(roiChartData([], "nearest")).toMatchObject({ slow: 0, maxDays: 0 });
	});

	it("finds the best trade-off: Nascent and Deimos for ALO", () => {
		const points = roiChartData(ALO, "nearest").points;
		expect(roiFrontier(points)).toEqual(["Nascent#EXT", "Deimos#EXT"]);
		expect(roiFrontier(roiChartData(ALO, "NC1").points)).toEqual([
			"Nascent#EXT",
			"Deimos#EXT",
		]);
		// a slower but closer planet joins the frontier
		expect(
			roiFrontier(
				roiChartData([...ALO, row("Close", 20, 1, [0, 5, 5, 5])], "nearest")
					.points
			)
		).toEqual(["Nascent#EXT", "Deimos#EXT", "Close#EXT"]);
	});

	it("sums up the frontier and the top earner for the insight line", () => {
		const points = roiChartData(ALO, "nearest").points;
		const insight = roiInsight(points, roiFrontier(points))!;
		expect(insight.frontier.map((p) => p.row.planetName)).toEqual([
			"Nascent",
			"Deimos",
		]);
		expect(insight).toMatchObject({ minJumps: 1, maxJumps: 2, exchange: "AI1" });
		expect(insight.topProfit?.row.planetName).toBe("BI-500b");
		expect(insight.topProfit?.y).toBe(19);

		const mixed = roiChartData([ALO[0], ALO[6]], "nearest").points;
		const both = roiInsight(mixed, ["Nascent#EXT", "Ementior#EXT"])!;
		expect(both.exchange).toBeNull();
		// the top earner on the frontier is not repeated
		expect(roiInsight(points, ["BI-500b#EXT"])!.topProfit).toBeNull();
		expect(roiInsight([], [])).toBeNull();
	});

	it("shortens planet names for labels", () => {
		expect(shortPlanetName("Nascent (QJ-149c)")).toBe("Nascent");
		expect(shortPlanetName("CC-558c")).toBe("CC-558c");
	});
});
