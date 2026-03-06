import { ref } from "vue";
import { describe, it, expect, beforeAll } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Stores
import { materialsStore, exchangesStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";

// test data
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";

// Composables
import { useRepairAnalysis } from "@/features/repair_analysis/useRepairAnalysis";

describe("useRepairAnalysis", async () => {
	const cxUuid = ref(undefined);
	const planetNaturalId = ref(undefined);

	beforeAll(async () => {
		setActivePinia(createPinia());
		await materialsStore.setMany(materials);
		// @ts-expect-error mock data date as string
		await exchangesStore.setMany(exchanges);

		const { preload } = useMaterialData();
		await preload();
	});

	it("daySelectOptions", async () => {
		const { daySelectOptions } = await useRepairAnalysis(
			cxUuid,
			planetNaturalId
		);

		expect(daySelectOptions.value.length).toBe(180);
	});

	it("calculateAmountAtDay", async () => {
		const { calculateAmountAtDay } = await useRepairAnalysis(
			cxUuid,
			planetNaturalId
		);

		expect(calculateAmountAtDay(100, 100)).toBe(56);
		expect(calculateAmountAtDay(1, 100)).toBe(1);
		expect(calculateAmountAtDay(180, 100)).toBe(100);
		expect(calculateAmountAtDay(200, 100)).toBe(100);
	});

	it("calculateDailyRepairMaterials", async () => {
		const testData = [
			{
				name: "EXT",
				amount: 2,
				dailyRevenue: -1565.000993316393,
				constructionMaterials: [
					{ ticker: "BSE", input: 16, output: 0 },
					{ ticker: "MCG", input: 100, output: 0 },
				],
			},
			{
				name: "FP",
				amount: 17,
				dailyRevenue: 84794.95120639441,
				constructionMaterials: [
					{ ticker: "BBH", input: 3, output: 0 },
					{ ticker: "BSE", input: 3, output: 0 },
					{ ticker: "BDE", input: 3, output: 0 },
					{ ticker: "MCG", input: 48, output: 0 },
				],
			},
			{
				name: "IVP",
				amount: 3,
				dailyRevenue: 29106.960063711726,
				constructionMaterials: [
					{ ticker: "RSE", input: 4, output: 0 },
					{ ticker: "RBH", input: 6, output: 0 },
					{ ticker: "RTA", input: 2, output: 0 },
					{ ticker: "RDE", input: 4, output: 0 },
					{ ticker: "TRU", input: 6, output: 0 },
					{ ticker: "MCG", input: 128, output: 0 },
				],
			},
		];

		const { calculateDailyRepairMaterials } = await useRepairAnalysis(
			cxUuid,
			planetNaturalId
		);

		const result = await calculateDailyRepairMaterials(testData);

		// 180 days, starting from 0
		expect(Object.keys(result).length).toBe(181);

		expect(result[90]).toStrictEqual([
			{
				delta: -34,
				individualVolume: 0.800000011920929,
				individualWeight: 0.5,
				input: 34,
				output: 0,
				price: -86083.37134751774,
				ticker: "BBH",
				totalVolume: -27.200000405311584,
				totalWeight: -17,
			},
			{
				delta: -34,
				individualVolume: 1.5,
				individualWeight: 0.10000000149011612,
				input: 34,
				output: 0,
				price: -82593.68266527586,
				ticker: "BDE",
				totalVolume: -51,
				totalWeight: -3.400000050663948,
			},
			{
				delta: -50,
				individualVolume: 0.5,
				individualWeight: 0.30000001192092896,
				input: 50,
				output: 0,
				price: -91067.14852347762,
				ticker: "BSE",
				totalVolume: -25,
				totalWeight: -15.000000596046448,
			},
			{
				delta: -700,
				individualVolume: 0.10000000149011612,
				individualWeight: 0.23999999463558197,
				input: 700,
				output: 0,
				price: -24823.416880678564,
				ticker: "MCG",
				totalVolume: -70.00000104308128,
				totalWeight: -167.99999624490738,
			},
			{
				delta: -9,
				individualVolume: 0.8999999761581421,
				individualWeight: 2.4000000953674316,
				input: 9,
				output: 0,
				price: -177007.57749712974,
				ticker: "RBH",
				totalVolume: -8.099999785423279,
				totalWeight: -21.600000858306885,
			},
			{
				delta: -6,
				individualVolume: 1.5,
				individualWeight: 1.399999976158142,
				input: 6,
				output: 0,
				price: -177080.65686461714,
				ticker: "RDE",
				totalVolume: -9,
				totalWeight: -8.399999856948853,
			},
			{
				delta: -6,
				individualVolume: 0.699999988079071,
				individualWeight: 1.899999976158142,
				input: 6,
				output: 0,
				price: -174013.47747747749,
				ticker: "RSE",
				totalVolume: -4.199999928474426,
				totalWeight: -11.399999856948853,
			},
			{
				delta: -3,
				individualVolume: 0.5,
				individualWeight: 1.5,
				input: 3,
				output: 0,
				price: -50978.31947232578,
				ticker: "RTA",
				totalVolume: -1.5,
				totalWeight: -4.5,
			},
			{
				delta: -9,
				individualVolume: 1.5,
				individualWeight: 0.10000000149011612,
				input: 9,
				output: 0,
				price: -4766.267159609293,
				ticker: "TRU",
				totalVolume: -13.5,
				totalWeight: -0.9000000134110451,
			},
		]);
	});
});
