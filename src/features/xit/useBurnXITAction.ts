import { computed, ComputedRef, Ref, ref, watchEffect } from "vue";

// Composables
import { useMaterialData } from "@/database/services/useMaterialData";
import { usePrice } from "@/features/cx/usePrice";

// Types & Interfaces
import {
	IXITActionElement,
	IXITActionMaterialElement,
} from "@/features/xit/xitAction.types";
import { IMaterial } from "@/features/api/gameData.types";

export async function useBurnXITAction(
	elements: Ref<IXITActionElement[]>,
	resupplyDays: Ref<number>,
	hideInfinite: Ref<boolean>,
	materialOverrides: Ref<Record<string, number | null>>,
	materialInactives: Ref<Set<string>>,
	cxUuid: Ref<string | undefined>,
	planetNaturalId: Ref<string | undefined>
) {
	// get materials
	const { materialsMap } = useMaterialData();

	// get price function
	const { getPrice } = await usePrice(cxUuid, planetNaturalId);

	// buildupo material overrides
	materialOverrides.value = elements.value.reduce((sum, current) => {
		sum[current.ticker] = materialOverrides.value[current.ticker] ?? null;
		return sum;
	}, {} as Record<string, number | null>);

	/**
	 * Computes a material table to be used in a XIT Resupply Action
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<IXITActionMaterialElement[]>}
	 */
	const materialTable: ComputedRef<IXITActionMaterialElement[]> = computed(
		() => {
			const tableElements: IXITActionMaterialElement[] = [];

			elements.value.forEach((e) => {
				let totalNeed: number = Infinity;

				if (e.delta < 0) {
					totalNeed = e.delta * -1 * resupplyDays.value - e.stock;
				}

				if (
					!hideInfinite.value ||
					(hideInfinite.value && e.delta < 0)
				) {
					const value = materialOverrides.value[e.ticker];
					const override: number | undefined =
						value != null && value > 0 ? value : undefined;

					tableElements.push({
						active: !materialInactives.value.has(e.ticker),
						ticker: e.ticker,
						stock: e.stock,
						delta: e.delta,
						burn: e.delta > 0 ? Infinity : e.stock / (e.delta * -1),
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
	);

	/**
	 * Computes weight and volume totals for materialTable elements
	 * total amount to be used in the resupply action
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<{
	 * 		totalWeight: number;
	 * 		totalVolume: number;
	 * 	}>}
	 */
	const totalWeightVolume: ComputedRef<{
		totalWeight: number;
		totalVolume: number;
	}> = computed(() => {
		let totalWeight: number = 0;
		let totalVolume: number = 0;

		materialTable.value
			.filter((f) => f.total !== Infinity && f.active)
			.forEach((material) => {
				const mat: IMaterial = materialsMap.value[material.ticker];

				totalWeight += mat.Weight * material.total;
				totalVolume += mat.Volume * material.total;
			});

		return {
			totalWeight,
			totalVolume,
		};
	});

	/**
	 * Holds estimated price total for materialTable elements
	 * Updated async via watchEffect
	 *
	 * @author adrian-cancio
	 *
	 * @type {Ref<number>}
	 */
	const totalPrice: Ref<number> = ref(0);

	watchEffect(async () => {
		let price: number = 0;

		const activeMaterials = materialTable.value.filter(
			(f) => f.total !== Infinity && f.active
		);

		for (const material of activeMaterials) {
			const unitPrice = await getPrice(material.ticker, "BUY");
			price += unitPrice * material.total;
		}

		totalPrice.value = price;
	});

	function fit(targetWeight: number, targetVolume: number): void {
		function fits(days: number): boolean {
			const old = resupplyDays.value;
			resupplyDays.value = days;

			const ok =
				totalWeightVolume.value.totalWeight <= targetWeight &&
				totalWeightVolume.value.totalVolume <= targetVolume;

			resupplyDays.value = old;
			return ok;
		}

		// decrease until fit or 0
		while (resupplyDays.value > 0 && !fits(resupplyDays.value)) {
			resupplyDays.value--;
		}

		// increase until next would exceed, max to 100 capped
		while (resupplyDays.value < 100 && fits(resupplyDays.value + 1)) {
			resupplyDays.value++;
		}
	}
	return {
		materialTable,
		totalWeightVolume,
		totalPrice,
		fit,
	};
}
