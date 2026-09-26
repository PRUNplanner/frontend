import { computed, ComputedRef, Ref } from "vue";

// Composables
import { useMaterialIOUtil } from "@/features/planning/util/materialIO.util";
import { usePrice } from "@/features/cx/usePrice";

// Util
import {
	calculateAmountAtDay,
	REPAIR_DAY_MAX,
} from "@/features/repair_analysis/repairAnalysis.util";

// Types & Interfaces
import { IPlanRepairAnalysisDataProp } from "@/features/planning/components/tools/planRepairAnalysis.types";
import {
	IMaterialIO,
	IMaterialIOMinimal,
} from "@/features/planning/usePlanCalculation.types";
import { PSelectOption } from "@/ui/ui.types";

export async function useRepairAnalysis(
	cxUuid: Ref<string | undefined>,
	planetNaturalId: Ref<string | undefined>
) {
	const DAY_MIN = 0;
	const DAY_MAX = REPAIR_DAY_MAX;

	const { combineMaterialIOMinimal, enhanceMaterialIOMinimal } =
		await useMaterialIOUtil();

	const { enhanceMaterialIOMaterial } = await usePrice(
		cxUuid,
		planetNaturalId
	);

	async function calculateDailyRepairMaterials(
		buildingData: IPlanRepairAnalysisDataProp[]
	): Promise<Record<number, IMaterialIO[]>> {
		const dayResults: Record<number, IMaterialIOMinimal[][]> = {};

		for (let day = DAY_MIN; day <= DAY_MAX; day++) {
			dayResults[day] = [];

			buildingData.forEach((building) => {
				const buildingDay: IMaterialIOMinimal[] = [];

				building.constructionMaterials.forEach((constructionMat) => {
					buildingDay.push({
						ticker: constructionMat.ticker,
						input:
							calculateAmountAtDay(day, constructionMat.input) *
							building.amount,
						output: 0,
					});
				});

				dayResults[day].push(buildingDay);
			});
		}

		// combine results down to a single array per day, in parallel
		const result: Record<number, IMaterialIO[]> = {};

		const entries = Object.entries(dayResults);

		const results = await Promise.all(
			entries.map(async ([day, materials]) => {
				const combined = combineMaterialIOMinimal(materials);
				const enhanced = enhanceMaterialIOMinimal(combined);
				const final = await enhanceMaterialIOMaterial(enhanced);
				return [Number(day), final] as const;
			})
		);

		results.forEach(([day, value]) => {
			result[day] = value;
		});

		return result;
	}

	const daySelectOptions: ComputedRef<PSelectOption[]> = computed(() =>
		Array.from({ length: DAY_MAX }, (_, i) => ({
			value: i + 1,
			label: `${i + 1}`,
		}))
	);

	return {
		calculateDailyRepairMaterials,
		calculateAmountAtDay,
		daySelectOptions,
	};
}
