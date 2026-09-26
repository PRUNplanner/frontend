import { computed, ComputedRef, Ref, ref, watchEffect } from "vue";

// Composables
import { useMaterialData } from "@/database/services/useMaterialData";
import { usePrice } from "@/features/cx/usePrice";
import { buildBurnDemand, solveBurn } from "@/features/xit/useBurnSolver";

// Types & Interfaces
import {
	IXITActionElement,
	IXITActionMaterialElement,
} from "@/features/xit/xitAction.types";
import { IMaterial } from "@/features/api/gameData.types";

export async function useBurnXITAction(
	burnMode: Ref<"simple" | "solver"> = ref("simple"),
	elements: Ref<IXITActionElement[]>,
	resupplyDays: Ref<number>,
	hideInfinite: Ref<boolean>,
	materialOverrides: Ref<Record<string, number | null>>,
	materialInactives: Ref<Set<string>>,
	cxUuid: Ref<string | undefined>,
	planetNaturalId: Ref<string | undefined>,
	shipWeightCapacity: Ref<number> = ref(1000),
	shipVolumeCapacity: Ref<number> = ref(1000),
	fullCoverThreshold: Ref<number> = ref(1.0)
) {
	// get materials
	const { materialsMap } = useMaterialData();

	// get price function
	const { getPrice } = await usePrice(cxUuid, planetNaturalId);

	const solverMode: ComputedRef<boolean> = computed(
		() => burnMode.value === "solver"
	);

	// buildupo material overrides
	materialOverrides.value = elements.value.reduce(
		(sum, current) => {
			sum[current.ticker] =
				materialOverrides.value[current.ticker] ?? null;
			return sum;
		},
		{} as Record<string, number | null>
	);

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
			let solverQuantities = new Map<string, number>();

			if (solverMode.value) {
				const activeElements = elements.value.filter((e) => {
					const override = materialOverrides.value[e.ticker];
					return (
						!materialInactives.value.has(e.ticker) &&
						(override == null || override <= 0)
					);
				});

				// Reserve the weight/volume already consumed by static
				// overrides so the solver only fills the remaining ship
				// capacity instead of the full ship.
				let reservedWeight: number = 0;
				let reservedVolume: number = 0;
				elements.value.forEach((e) => {
					const override = materialOverrides.value[e.ticker];
					if (
						override != null &&
						override > 0 &&
						!materialInactives.value.has(e.ticker)
					) {
						const mat: IMaterial | undefined =
							materialsMap.value[e.ticker];
						if (mat) {
							reservedWeight += mat.weight * override;
							reservedVolume += mat.volume * override;
						}
					}
				});

				const remainingWeight: number =
					shipWeightCapacity.value - reservedWeight;
				const remainingVolume: number =
					shipVolumeCapacity.value - reservedVolume;

				// Overrides already filled (or overfilled) the ship in at
				// least one dimension. Since every solvable material has a
				// positive weight and volume, nothing more can be loaded, so
				// skip the no-op solve.
				if (remainingWeight <= 0 || remainingVolume <= 0) {
					solverQuantities = new Map<string, number>();
				} else {
					const demand = buildBurnDemand(
						activeElements,
						materialsMap.value,
						resupplyDays.value
					);
					solverQuantities = solveBurn(demand, {
						volumeCapacity: remainingVolume,
						weightCapacity: remainingWeight,
						targetDays: resupplyDays.value,
						fullCoverBelowBurnPerDay: fullCoverThreshold.value,
						integer: true,
					});
				}
			}

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

					let total: number;
					if (override) {
						total = override;
					} else if (solverMode.value && e.delta < 0) {
						total = Math.max(
							0,
							Math.round(solverQuantities.get(e.ticker) ?? 0)
						);
					} else {
						total =
							Math.ceil(totalNeed) > 0
								? Math.ceil(totalNeed)
								: 0;
					}

					tableElements.push({
						active: !materialInactives.value.has(e.ticker),
						ticker: e.ticker,
						stock: e.stock,
						delta: e.delta,
						burn: e.delta > 0 ? Infinity : e.stock / (e.delta * -1),
						total,
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

				totalWeight += mat.weight * material.total;
				totalVolume += mat.volume * material.total;
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
