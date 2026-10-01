import { apiService } from "@/lib/apiService";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import axiosSetup from "@/util/axiosSetup";

import { callAnalyticsPlanetInsights } from "@/features/api/analyticsData.api";

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

describe("API Keys Data API Calls", async () => {
	beforeAll(() => {
		setActivePinia(createPinia());
		axiosSetup();
	});

	it("callAnalyticsPlanetInsights", async () => {
		const spyApiService = vi.spyOn(apiService, "get");
		const mockData = {
			status: "success",
			planet_natural_id: "ZV-307b",
			total_plans_analyzed: 89,
			insights_data: {
				expert_distribution: [
					{
						type: "Chemistry",
						percentage: 97.01,
					},
					{
						type: "Manufacturing",
						percentage: 1.74,
					},
					{
						type: "Metallurgy",
						percentage: 1.24,
					},
				],
				recipe_distribution: {
					AML: [
						{
							recipe_id: "AML#5xBTS=>1xW",
							percentage: 38.46,
						},
						{
							recipe_id: "AML#2xBER=>1xBE 1xAL 1xSIO",
							percentage: 23.08,
						},
						{
							recipe_id: "AML#2xZIR=>1xZR 2xSIO",
							percentage: 23.08,
						},
						{
							recipe_id: "AML#1xBOR 1xSI 4xAL=>4xBOS",
							percentage: 15.38,
						},
					],
					CHP: [
						{
							recipe_id: "CHP#3xHAL 1xH2O=>2xNA 1xCL",
							percentage: 34.15,
						},
						{
							recipe_id: "CHP#2xH2O 2xN 1xLST=>4xNS",
							percentage: 31.71,
						},
						{
							recipe_id: "CHP#1xLST=>10xFLX",
							percentage: 14.63,
						},
					],
					LAB: [
						{
							recipe_id: "LAB#50xEPO 75xNCS=>50xNR",
							percentage: 53.85,
						},
						{
							recipe_id: "LAB#1xCL 1xO 1xH=>3xTCL",
							percentage: 20.51,
						},
						{
							recipe_id: "LAB#1xC 1xH 1xCL=>3xDDT",
							percentage: 10.26,
						},
					],
					POL: [
						{
							recipe_id: "POL#1xH 1xC 1xMG=>50xPG",
							percentage: 55.26,
						},
						{
							recipe_id: "POL#1xC 1xH 1xCL 1xO=>50xEPO",
							percentage: 42.11,
						},
					],
				},
				building_distribution: [
					{
						ticker: "POL",
						percentage: 34.83,
					},
					{
						ticker: "CHP",
						percentage: 30.34,
					},
					{
						ticker: "LAB",
						percentage: 28.09,
					},
					{
						ticker: "AML",
						percentage: 20.22,
					},
				],
			},
			last_updated: "2026-04-22T03:43:09.504511Z",
		};

		const fakePlanetId = "Moo";

		mock.onGet(`/analytics/planet_insights/${fakePlanetId}/`).reply(
			200,
			mockData
		);

		// a v1 row gets the v2 keys as defaults
		expect(await callAnalyticsPlanetInsights(fakePlanetId)).toStrictEqual({
			...mockData,
			total_users: 0,
			insights_data: {
				...mockData.insights_data,
				buildings: [],
				experts: [],
			},
		});
		expect(spyApiService).toHaveBeenCalledOnce();
	});

	it("callAnalyticsPlanetInsights v2", async () => {
		const mockData = {
			status: "success",
			planet_natural_id: "KW-688c",
			total_plans_analyzed: 24,
			total_users: 12,
			insights_data: {
				expert_distribution: [],
				building_distribution: [],
				recipe_distribution: {},
				buildings: [
					{
						ticker: "FRM",
						plans: 24,
						users: 12,
						percentage: 100,
						median_amount: 3,
						recipes: [
							{
								recipe_id: "FRM#1xH2O=>4xGRN",
								plans: 24,
								percentage: 100,
								median_amount: 2,
							},
						],
						mixes: [
							{
								recipe_ids: ["FRM#1xH2O=>4xGRN"],
								plans: 12,
								percentage: 50,
								median_building_amount: 3,
								recipe_amounts: { "FRM#1xH2O=>4xGRN": 2 },
							},
						],
					},
				],
				experts: [
					{
						type: "Food_Industries",
						plans_percentage: 80,
						median_amount: 2,
					},
				],
			},
			last_updated: "2026-10-01T03:43:09.504511Z",
		};
		mock.onGet("/analytics/planet_insights/V2/").reply(200, mockData);

		expect(await callAnalyticsPlanetInsights("V2")).toStrictEqual(mockData);
	});

	it.each([
		["without insights", {}],
		["with null insights", { insights_data: null }],
	])(
		"callAnalyticsPlanetInsights below threshold %s",
		async (_name, insights) => {
			const mockData = {
				status: "below_threshold",
				planet_natural_id: "ZV-307b",
				total_plans_analyzed: 0,
				...insights,
			};
			mock.onGet("/analytics/planet_insights/Few/").reply(200, mockData);

			expect(await callAnalyticsPlanetInsights("Few")).toStrictEqual(
				mockData
			);
		}
	);
});
