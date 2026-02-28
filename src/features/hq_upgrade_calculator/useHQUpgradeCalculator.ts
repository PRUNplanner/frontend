import { computed, ComputedRef, ref, Ref } from "vue";

// Composables
import { usePrice } from "@/features/cx/usePrice";
import { useFIOStorage } from "@/features/fio/useFIOStorage";
import { useMaterialData } from "@/database/services/useMaterialData";

// Util
import { clamp } from "@/util/numbers";

// Types & Interfaces
import {
	IHQLevelRecord,
	IHQMaterial,
	IHQMaterialData,
} from "@/features/hq_upgrade_calculator/useHQUpgradeCalculator.types";
import { PSelectOption } from "@/ui/ui.types";

// Static data
import hqLevels from "@/features/hq_upgrade_calculator/hq_levels.json";

export async function useHQUpgradeCalculator(
	start: Ref<number>,
	to: Ref<number>,
	refOverride: Ref<Record<string, number | null>>,
	cxUuid: Ref<string | undefined>
) {
	const { getPrice } = await usePrice(cxUuid, ref(undefined));
	const { findMaterial } = useFIOStorage();
	const { materialsMap } = useMaterialData();

	// use json data
	const data: IHQLevelRecord = hqLevels;

	/**
	 * All HQ level options according to JSON data
	 * @author jplacht
	 *
	 * @type {PSelectOption[]}
	 */
	const levelOptions: PSelectOption[] = Object.keys(data).map((e) => ({
		label: e,
		value: parseInt(e),
	}));

	/**
	 * Level Options greater or equal to start value
	 * @author jplacht
	 *
	 * @type {ComputedRef<PSelectOption[]>}
	 */
	const levelOptionsTo: ComputedRef<PSelectOption[]> = computed(() =>
		levelOptions.filter((f) => (f.value as number) >= start.value)
	);

	/**
	 * Start value can't be greater than to value
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<boolean>}
	 */
	const hasError: ComputedRef<boolean> = computed(
		() => to.value < start.value
	);

	const materialData: Ref<IHQMaterial[]> = ref([]);

	async function calculateMaterialData() {
		const sumData: Record<string, IHQMaterialData> = {};

		if (hasError.value) return [];

		// iterate over all upgrade costs from "start" to "to"
		// do not count the materials for the start value (+1)
		for (let index = start.value + 1; index <= to.value; index++) {
			const element = data[index];

			// check and create or add to sumData
			element.forEach((point) => {
				if (sumData[point.ticker])
					sumData[point.ticker].amount += point.amount;
				else {
					const {
						amount: storageAmount,
						locations: storageLocations,
					} = findMaterial(point.ticker);

					// initialize material, combined values added later
					sumData[point.ticker] = {
						amount: point.amount,
						required: 0,
						storage:
							refOverride.value[point.ticker] ?? storageAmount,
						storageLocations: storageLocations,
						override: refOverride.value[point.ticker] ?? 0,
						unitCost: 0,
						totalCost: 0,
					};
				}
			});
		}

		// calculate required and cost values
		for (const [ticker, e] of Object.entries(sumData)) {
			e.required = clamp(e.amount - e.storage, 0, Infinity);
			e.unitCost = await getPrice(ticker, "BUY");
			e.totalCost = e.required * e.unitCost;
		}

		// transform to array, sort by ticker, required for datatable
		materialData.value = [
			...Object.entries(sumData).map(([ticker, value]) => ({
				ticker: ticker,
				amount: value.amount,
				override: value.override,
				required: value.required,
				unitCost: value.unitCost,
				totalCost: value.totalCost,
				storage: value.storage,
				storageLocations: value.storageLocations,
			})),
		].sort((a, b) => (a.ticker > b.ticker ? 1 : -1));
	}

	/**
	 * Calculates the total cost of all upgrade materials
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<number>} Total Cost
	 */
	const totalCost: ComputedRef<number> = computed(() =>
		materialData.value.reduce((sum, current) => sum + current.totalCost, 0)
	);

	/**
	 * Calculates the total weight and volume of all materials
	 * in that HQ upgrade selection
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<{
	 * 		totalWeight: number;
	 * 		totalVolume: number;
	 * 	}>} total Weight and total Volume
	 */
	const totalWeightVolume: ComputedRef<{
		totalWeight: number;
		totalVolume: number;
	}> = computed(() => {
		return {
			totalWeight: materialData.value.reduce(
				(sum, current) =>
					sum +
					materialsMap.value[current.ticker].Weight *
						current.required,
				0
			),
			totalVolume: materialData.value.reduce(
				(sum, current) =>
					sum +
					materialsMap.value[current.ticker].Volume *
						current.required,
				0
			),
		};
	});

	return {
		hasError,
		levelOptions,
		levelOptionsTo,
		materialData,
		totalCost,
		totalWeightVolume,
		calculateMaterialData,
	};
}
