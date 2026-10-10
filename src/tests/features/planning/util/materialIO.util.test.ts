import { ref } from "vue";
import { beforeAll, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Composables
import { useMaterialIOUtil } from "@/features/planning/util/materialIO.util";
import { usePrice } from "@/features/cx/usePrice";

// Types & Interfaces
import type { IMaterialIOMinimal } from "@/features/planning/usePlanCalculation.types";
import type {
	IEmpireMaterialIO,
	IEmpirePlanMaterialIO,
} from "@/features/empire/empire.types";

// test data
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";

import { materialsStore } from "@/database/stores";
import { exchangesStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { flushPromises } from "@vue/test-utils";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

describe("Util: materialIO ", async () => {
	beforeAll(async () => {
		setActivePinia(createPinia());

		await materialsStore.setMany(materials);
		// @ts-expect-error mock data date as string
		await exchangesStore.setMany(exchanges);
		const { preload } = useMaterialData();
		await preload();
		await flushPromises();
	});

	it("combineMaterialIOMinimal", async () => {
		const { combineMaterialIOMinimal } = useMaterialIOUtil();
		const firstArray: IMaterialIOMinimal[] = [
			{
				ticker: "C",
				input: 1,
				output: 0,
			},
			{
				ticker: "H2O",
				input: 0,
				output: 10,
			},
		];

		const secondArray: IMaterialIOMinimal[] = [
			{
				ticker: "C",
				input: 5,
				output: 0,
			},
			{
				ticker: "H2O",
				input: 2,
				output: 0,
			},
			{
				ticker: "DW",
				input: 7,
				output: 12,
			},
		];

		const result = combineMaterialIOMinimal([firstArray, secondArray]);

		expect(result.length).toBe(3);

		const findC = result.find((e) => e.ticker === "C");

		expect(findC).toBeDefined();
		expect(findC?.input).toBe(6);
		expect(findC?.output).toBe(0);

		const findWater = result.find((e) => e.ticker === "H2O");

		expect(findWater).toBeDefined();
		expect(findWater?.input).toBe(2);
		expect(findWater?.output).toBe(10);

		const findDW = result.find((e) => e.ticker === "DW");

		expect(findDW).toBeDefined();
		expect(findDW?.input).toBe(7);
		expect(findDW?.output).toBe(12);
	});

	it("enhanceMaterialIOMinimal", async () => {
		const { enhanceMaterialIOMinimal } = useMaterialIOUtil();

		const fakeArray: IMaterialIOMinimal[] = [
			{
				ticker: "C",
				input: 1,
				output: 0,
			},
			{
				ticker: "H2O",
				input: 2,
				output: 7,
			},
		];

		const result = enhanceMaterialIOMinimal(fakeArray);

		expect(result.length).toBe(fakeArray.length);

		const findC = result.find((e) => e.ticker === "C");
		const findWater = result.find((e) => e.ticker === "H2O");

		expect(findC).toBeDefined();
		expect(findWater).toBeDefined();

		// deltas
		expect(findC?.delta).toBe(-1);
		expect(findWater?.delta).toBe(5);

		// individual weight
		expect(findC?.individualVolume).toBe(1);
		expect(findC?.individualWeight).toBe(2.25);

		// total
		expect(findWater?.totalVolume).toBe(1.0000000149011612);
		expect(findWater?.totalWeight).toBe(1.0000000149011612);

		// sorted alphabetically
		expect(result[0].ticker).toBe("C");
		expect(result[1].ticker).toBe("H2O");
	});

	it("enhanceMaterialIOMaterial", async () => {
		const { enhanceMaterialIOMaterial } = usePrice(
			ref(undefined),
			ref(undefined)
		);

		// SELL
		const resultSell = await enhanceMaterialIOMaterial(
			// @ts-expect-error mock data
			[{ ticker: "OVE", delta: 1 }]
		);
		// BUY
		const resultBuy = await enhanceMaterialIOMaterial(
			// @ts-expect-error mock data
			[{ ticker: "OVE", delta: -1 }]
		);

		expect(resultSell).toStrictEqual([
			{ ticker: "OVE", delta: 1, price: 122.03631467139488 },
		]);
		expect(resultBuy).toStrictEqual([
			{ ticker: "OVE", delta: -1, price: -122.03631467139488 },
		]);
	});

	it("combineEmpireMaterialIO", async () => {
		const material = (
			ticker: string,
			input: number,
			output: number,
			price: number
		) => ({
			ticker,
			input,
			output,
			delta: output - input,
			individualVolume: 0,
			individualWeight: 0,
			totalWeight: 0,
			totalVolume: 0,
			price,
		});
		const fakeInput: IEmpirePlanMaterialIO[] = [
			{
				planetId: "foo",
				planUuid: "foo#1",
				planName: "foo",
				planCOGC: "---",
				materialIO: [
					material("OUT", 0, 2, 5),
					material("DW", 0, 3, 5),
					material("OUT", 1, 1, 0),
				],
			},
			{
				planetId: "moo",
				planUuid: "moo#1",
				planName: "moo",
				planCOGC: "---",
				materialIO: [
					material("DW", 3, 0, -5),
					material("IN", 3, 0, -9),
				],
			},
		];

		const { combineEmpireMaterialIO, calculateEmpireCostOverview } =
			useMaterialIOUtil();

		const result = combineEmpireMaterialIO(fakeInput);

		expect(result.length).toBe(3);
		// sorting
		expect(result[0].ticker).toBe("DW");
		expect(result[1].ticker).toBe("IN");
		expect(result[2].ticker).toBe("OUT");

		expect(result[0].delta).toBe(0);
		expect(result[0].deltaPrice).toBe(0);
		expect(result[0].input).toBe(3);
		expect(result[0].output).toBe(3);
		expect(result[0].inputPlanets.length).toBe(1);
		expect(result[0].outputPlanets.length).toBe(1);
		expect(calculateEmpireCostOverview(result, 25, 0)).toMatchObject({
			totalRevenue: 5,
			totalCost: 9,
			totalProfit: -4,
		});
	});

	it("includes building degradation in empire cost", () => {
		const { calculateEmpireCostOverview } = useMaterialIOUtil();
		const materialIO = [
			{ deltaPrice: 5 },
			{ deltaPrice: -9 },
		] as IEmpireMaterialIO[];

		expect(calculateEmpireCostOverview(materialIO, 25, 20)).toMatchObject({
			totalRevenue: 5,
			totalCost: 29,
			totalProfit: -24,
		});
	});

	it("combineEmpireMaterialIO", async () => {
		const fakeInput: IEmpirePlanMaterialIO[] = [
			{
				planetId: "foo",
				planUuid: "foo#1",
				planName: "foo",
				planCOGC: "---",
				materialIO: [
					{
						ticker: "RAT",
						input: 10,
						output: 10,
						delta: 0,
						individualVolume: 0,
						individualWeight: 0,
						totalWeight: 0,
						totalVolume: 0,
						price: 5,
					},
				],
			},
		];

		const { combineEmpireMaterialIO } = useMaterialIOUtil();

		const result = combineEmpireMaterialIO(fakeInput);

		expect(result.length).toBe(1);

		expect(result[0].ticker).toBe("RAT");
		expect(result[0].delta).toBe(0);
		expect(result[0].deltaPrice).toBe(0);
		expect(result[0].input).toBe(10);
		expect(result[0].output).toBe(10);
		expect(result[0].inputPlanets.length).toBe(1);
		expect(result[0].outputPlanets.length).toBe(1);
	});

	it("empireMaterialIOState", async () => {
		const { empireMaterialIOState } = useMaterialIOUtil();

		const noResult = await empireMaterialIOState(undefined, []);
		expect(noResult).toBeUndefined();

		const fakeIPlanEmpireElement: PlanEmpireElement = {
			empire_faction: "MORIA",
			empire_permits_used: 3,
			empire_permits_total: 3,
			uuid: "foo",
			empire_name: "foo",
			modified_at: "2026-01-01T00:00:00Z",
			plans: [
				{
					uuid: "moo",
					plan_name: "moo",
					planet_natural_id: "moo",
				},
			],
		};

		const fakeIEmpireMaterialIO: IEmpireMaterialIO[] = [
			{
				ticker: "C",
				input: 5,
				output: 0,
				delta: -5,
				deltaPrice: 0,
				inputPlanets: [
					{
						planetId: "moo",
						planUuid: "moo",
						planName: "moo",
						planCOGC: "---",
						delta: -5,
						input: 5,
						output: 0,
						price: 0,
					},
				],
				outputPlanets: [],
			},
		];

		const result = await empireMaterialIOState(
			fakeIPlanEmpireElement,
			fakeIEmpireMaterialIO
		);
		expect(result).toBeDefined();

		expect(result?.metadata).toBeDefined();
		expect(result?.empire_total["C"]).toBeDefined();
		expect(result?.empire_total["C"].p).toBe(0);
		expect(result?.empire_total["C"].c).toBe(5);
		expect(result?.empire_total["C"].d).toBe(-5);
	});
});
