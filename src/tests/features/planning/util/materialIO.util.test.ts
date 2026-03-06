import { ref } from "vue";
import { beforeAll, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Composables
import { useMaterialIOUtil } from "@/features/planning/util/materialIO.util";
import { usePrice } from "@/features/cx/usePrice";

// Types & Interfaces
import { IMaterialIOMinimal } from "@/features/planning/usePlanCalculation.types";
import { IEmpirePlanMaterialIO } from "@/features/empire/empire.types";

// test data
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";

import { materialsStore } from "@/database/stores";
import { exchangesStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { flushPromises } from "@vue/test-utils";

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
		const { combineMaterialIOMinimal } = await useMaterialIOUtil();
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
		const { enhanceMaterialIOMinimal } = await useMaterialIOUtil();

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
		const { enhanceMaterialIOMaterial } = await usePrice(
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
			{ ticker: "OVE", delta: 1, price: 121.77925679203784 },
		]);
		expect(resultBuy).toStrictEqual([
			{ ticker: "OVE", delta: -1, price: -121.77925679203784 },
		]);
	});

	it("combineEmpireMaterialIO", async () => {
		const fakeInput: IEmpirePlanMaterialIO[] = [
			{
				planetId: "foo",
				planUuid: "foo#1",
				planName: "foo",
				materialIO: [
					{
						ticker: "RAT",
						input: 10,
						output: 2,
						delta: 8,
						individualVolume: 0,
						individualWeight: 0,
						totalWeight: 0,
						totalVolume: 0,
						price: 5,
					},
					{
						ticker: "DW",
						input: 0,
						output: 3,
						delta: -3,
						individualVolume: 0,
						individualWeight: 0,
						totalWeight: 0,
						totalVolume: 0,
						price: 5,
					},
				],
			},
			{
				planetId: "moo",
				planUuid: "moo#1",
				planName: "moo",
				materialIO: [
					{
						ticker: "DW",
						input: 3,
						output: 0,
						delta: -3,
						individualVolume: 0,
						individualWeight: 0,
						totalWeight: 0,
						totalVolume: 0,
						price: 5,
					},
				],
			},
		];

		const { combineEmpireMaterialIO } = await useMaterialIOUtil();

		const result = combineEmpireMaterialIO(fakeInput);

		expect(result.length).toBe(2);
		// sorting
		expect(result[0].ticker).toBe("DW");
		expect(result[1].ticker).toBe("RAT");

		expect(result[0].delta).toBe(-6);
		expect(result[0].deltaPrice).toBe(-10);
		expect(result[0].input).toBe(3);
		expect(result[0].output).toBe(3);
		expect(result[0].inputPlanets.length).toBe(1);
		expect(result[0].outputPlanets.length).toBe(1);
	});
	it("combineEmpireMaterialIO", async () => {
		const fakeInput: IEmpirePlanMaterialIO[] = [
			{
				planetId: "foo",
				planUuid: "foo#1",
				planName: "foo",
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

		const { combineEmpireMaterialIO } = await useMaterialIOUtil();

		const result = combineEmpireMaterialIO(fakeInput);

		expect(result.length).toBe(1);

		expect(result[0].ticker).toBe("RAT");
		expect(result[0].delta).toBe(0);
		expect(result[0].deltaPrice).toBe(0);
		expect(result[0].input).toBe(10);
		expect(result[0].output).toBe(10);
		expect(result[0].inputPlanets.length).toBe(2);
		expect(result[0].outputPlanets.length).toBe(2);
	});
});
