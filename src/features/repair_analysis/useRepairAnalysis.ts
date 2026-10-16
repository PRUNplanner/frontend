import { computed, type Ref, shallowRef, watch } from "vue";

// Composables
import { useBuildingData } from "@/database/services/useBuildingData";
import { useMaterialIOUtil } from "@/features/planning/util/materialIO.util";
import { usePrice } from "@/features/cx/usePrice";

// Util
import type { IPriceBook } from "@/features/cx/priceBook";
import { capitalizeString } from "@/util/text";
import {
	goodRange,
	priceRepairMaterials,
	repairCostSplit,
	repairCurveOf,
	repairMaterialsAt,
	repairMaterialTotals,
} from "@/features/repair_analysis/repairAnalysis.util";

// Types & Interfaces
import type { IPlanRepairAnalysisDataProp } from "@/features/planning/components/tools/planRepairAnalysis.types";
import type { IMaterialIOMinimal } from "@/features/planning/usePlanCalculation.types";
import type {
	IRepairBuilding,
	IRepairMaterialList,
} from "@/features/repair_analysis/useRepairAnalysis.types";

/**
 * Repair curves, best intervals and repair materials per building type
 * of a plan. Prices load once per change of the plan or CX, everything
 * else is synchronous; materials are computed only for the asked interval.
 * @author jplacht
 *
 * @param {Ref<IPlanRepairAnalysisDataProp[]>} data Plan's building types
 * @param {Ref<string | undefined>} cxUuid CX preference
 * @param {Ref<string | undefined>} planetNaturalId Plan's planet
 */
export function useRepairAnalysis(
	data: Ref<IPlanRepairAnalysisDataProp[]>,
	cxUuid: Ref<string | undefined>,
	planetNaturalId: Ref<string | undefined>
) {
	const { buildingsMap } = useBuildingData();
	const { enhanceMaterialIOMinimal } = useMaterialIOUtil();
	const { getPriceBook } = usePrice(cxUuid, planetNaturalId);

	// "technetiumProcessing" -> "Technetium Processing"
	const displayName = (ticker: string): string => {
		const name = buildingsMap.value[ticker]?.building_name;
		return name
			? capitalizeString(name.replace(/([a-z])([A-Z])/g, "$1 $2"))
			: ticker;
	};

	const book = shallowRef<IPriceBook>();
	let run = 0;

	watch(
		[data, cxUuid, planetNaturalId],
		async () => {
			// a slower older run must not replace a newer book
			const current = ++run;
			try {
				const loaded = await getPriceBook();
				if (current === run) book.value = loaded;
			} catch (err) {
				console.error(err);
			}
		},
		{ deep: true, immediate: true }
	);

	const buildings = computed<IRepairBuilding[]>(() => {
		const prices = book.value;
		if (!prices) return [];

		return data.value
			.filter((d) => d.amount > 0)
			.map((d) => {
				const { productionValue, workforceCost, curve, best } =
					repairCurveOf(d, prices);

				return {
					ticker: d.name,
					name: displayName(d.name),
					amount: d.amount,
					constructionMaterials: d.constructionMaterials,
					productionValue,
					workforceCost,
					curve,
					split: repairCostSplit(curve, productionValue),
					best,
					range: goodRange(curve, best),
				};
			})
			.sort(
				(a, b) =>
					b.curve[b.best].dailyRepair * b.amount -
					a.curve[a.best].dailyRepair * a.amount
			);
	});

	function priceMaterials(
		minimal: IMaterialIOMinimal[],
		prices: IPriceBook
	): IRepairMaterialList {
		return priceRepairMaterials(enhanceMaterialIOMinimal(minimal), prices);
	}

	// last result per type, an interval change recomputes only its type
	const memo = new Map<
		string,
		{ building: IRepairBuilding; day: number; list: IRepairMaterialList }
	>();

	/**
	 * Materials for one repair of all buildings of a type
	 * @author jplacht
	 *
	 * @param {IRepairBuilding} building Building type
	 * @param {number} day Repair interval
	 * @returns {IRepairMaterialList} Priced materials
	 */
	function materialsFor(
		building: IRepairBuilding,
		day: number
	): IRepairMaterialList {
		const hit = memo.get(building.ticker);
		if (hit && hit.building === building && hit.day === day)
			return hit.list;

		const list = priceMaterials(
			repairMaterialsAt(
				building.constructionMaterials,
				day,
				building.amount
			),
			book.value!
		);
		memo.set(building.ticker, { building, day, list });
		return list;
	}

	/**
	 * One repair of every building type, each at its own interval
	 * @author jplacht
	 *
	 * @param {(ticker: string) => number} intervalOf Interval per type
	 * @returns {IRepairMaterialList} Summed materials
	 */
	function materialsForAll(
		intervalOf: (ticker: string) => number
	): IRepairMaterialList {
		const sum = new Map<string, IRepairMaterialList["materials"][number]>();
		for (const b of buildings.value)
			for (const m of materialsFor(b, intervalOf(b.ticker)).materials) {
				const s = sum.get(m.ticker);
				if (!s) sum.set(m.ticker, { ...m });
				else {
					s.amount += m.amount;
					s.cost += m.cost;
					s.weight += m.weight;
					s.volume += m.volume;
				}
			}
		return repairMaterialTotals(
			[...sum.values()].sort((a, b) => b.cost - a.cost)
		);
	}

	return { buildings, materialsFor, materialsForAll };
}
