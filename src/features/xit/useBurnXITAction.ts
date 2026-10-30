import { computed, type ComputedRef, type Ref, ref, watchEffect } from "vue";

// Composables
import { useMaterialData } from "@/database/services/useMaterialData";
import { usePrice } from "@/features/cx/usePrice";
import { useRunProgress } from "@/util/runProgress";

// Types & Interfaces
import type {
	IBurnXITActionOptions,
	IXITActionMaterialElement,
} from "@/features/xit/xitAction.types";
import type { Material } from "@/features/api/schemas/gameData.schemas";

interface IWeightVolume {
	totalWeight: number;
	totalVolume: number;
}

/**
 * # Burn XIT Action
 *
 * Resupply amounts, their weight, volume and price for the given burn
 * elements. Reads the given refs only; `fit` returns the days that fit.
 *
 * @param {IBurnXITActionOptions} options Elements and the action settings
 */
export function useBurnXITAction({
	elements,
	resupplyDays,
	hideInfinite,
	materialOverrides,
	materialInactives,
	cxUuid = ref(undefined),
	planetNaturalId = ref(undefined),
}: IBurnXITActionOptions) {
	// get materials
	const { materialsMap } = useMaterialData();

	// get price function
	const { getPrice } = usePrice(cxUuid, planetNaturalId);

	/**
	 * The material table for a resupply of the given days
	 *
	 * @author jplacht
	 *
	 * @param {number} days Resupply days
	 * @returns {IXITActionMaterialElement[]} Material table
	 */
	function tableFor(days: number): IXITActionMaterialElement[] {
		const tableElements: IXITActionMaterialElement[] = [];

		elements.value.forEach((e) => {
			let totalNeed: number = Infinity;

			if (e.delta < 0) {
				totalNeed = e.delta * -1 * days - e.stock;
			}

			if (!hideInfinite.value || (hideInfinite.value && e.delta < 0)) {
				// no override set reads as undefined, like null
				const value = materialOverrides.value[e.ticker];
				const override: number | undefined =
					value != null && value > 0 ? value : undefined;

				tableElements.push({
					active: !materialInactives.value.has(e.ticker),
					ticker: e.ticker,
					stock: e.stock,
					delta: e.delta,
					// no consumption (delta 0 too) never runs out; stock / -0
					// would be -Infinity and read as critical
					burn: e.delta < 0 ? e.stock / (e.delta * -1) : Infinity,
					total: override
						? override
						: Math.ceil(totalNeed) > 0
							? Math.ceil(totalNeed)
							: 0,
				});
			}
		});

		return tableElements;
	}

	/**
	 * Weight and volume of a material table's active, finite amounts
	 *
	 * @author jplacht
	 *
	 * @param {IXITActionMaterialElement[]} table Material table
	 * @returns {IWeightVolume} Totals
	 */
	function weightVolumeOf(table: IXITActionMaterialElement[]): IWeightVolume {
		let totalWeight: number = 0;
		let totalVolume: number = 0;

		table
			.filter((f) => f.total !== Infinity && f.active)
			.forEach((material) => {
				const mat: Material = materialsMap.value[material.ticker];

				totalWeight += mat.weight * material.total;
				totalVolume += mat.volume * material.total;
			});

		return {
			totalWeight,
			totalVolume,
		};
	}

	/**
	 * Computes a material table to be used in a XIT Resupply Action
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<IXITActionMaterialElement[]>}
	 */
	const materialTable: ComputedRef<IXITActionMaterialElement[]> = computed(
		() => tableFor(resupplyDays.value)
	);

	/**
	 * Computes weight and volume totals for materialTable elements
	 * total amount to be used in the resupply action
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<IWeightVolume>}
	 */
	const totalWeightVolume: ComputedRef<IWeightVolume> = computed(() =>
		weightVolumeOf(materialTable.value)
	);

	/**
	 * Holds estimated price total for materialTable elements
	 * Updated async via watchEffect
	 *
	 * @author adrian-cancio
	 *
	 * @type {Ref<number>}
	 */
	const totalPrice: Ref<number> = ref(0);

	// prices resolve async, a run started later may finish first: only the
	// latest run may set the total, a slower older one is stale
	const { start } = useRunProgress();

	async function sumPrices(
		activeMaterials: IXITActionMaterialElement[]
	): Promise<number> {
		let price: number = 0;

		for (const material of activeMaterials) {
			const unitPrice = await getPrice(material.ticker, "BUY");
			price += unitPrice * material.total;
		}

		return price;
	}

	watchEffect(() => {
		const run = start();
		const activeMaterials = materialTable.value.filter(
			(f) => f.total !== Infinity && f.active
		);

		void sumPrices(activeMaterials).then((price) => {
			if (run.isCurrent()) totalPrice.value = price;
		});
	});

	/**
	 * The resupply days whose amounts fit the given weight and volume,
	 * starting from the current days, capped to 0 and 100
	 *
	 * @param {number} targetWeight Max weight
	 * @param {number} targetVolume Max volume
	 * @returns {number} Resupply days
	 */
	function fit(targetWeight: number, targetVolume: number): number {
		function fits(days: number): boolean {
			const { totalWeight, totalVolume } = weightVolumeOf(tableFor(days));
			return totalWeight <= targetWeight && totalVolume <= targetVolume;
		}

		let days: number = resupplyDays.value;

		// decrease until fit or 0
		while (days > 0 && !fits(days)) {
			days--;
		}

		// increase until next would exceed, max to 100 capped
		while (days < 100 && fits(days + 1)) {
			days++;
		}

		return days;
	}

	return {
		materialTable,
		totalWeightVolume,
		totalPrice,
		fit,
	};
}
