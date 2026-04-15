import { ref, computed, onMounted, Ref } from "vue";

// Composables
import { useBuildingData } from "@/database/services/useBuildingData";

// Types & Interfaces
import { IEmpireMaterialIO } from "@/features/empire/empire.types";
import { IRecipe } from "@/features/api/gameData.types";
import { IOpportunityStats } from "@/features/empire/useProductionOpportunities.types";

export function useProductionOpportunities(empireIO: Ref<IEmpireMaterialIO[]>) {
	const recipeMap = ref<Record<string, IRecipe[]>>({});
	const isLoading = ref<boolean>(true);

	onMounted(async () => {
		try {
			const { getAllBuildingRecipes } = await useBuildingData();
			recipeMap.value = getAllBuildingRecipes();
		} finally {
			isLoading.value = false;
		}
	});

	const allRecipesList = computed(() =>
		Object.values(recipeMap.value).flat()
	);

	// map, allows O(1) lookup
	const deltaMap = computed(() => {
		return new Map(empireIO.value.map((io) => [io.ticker, io.delta]));
	});

	const opportunities = computed(() => {
		if (
			isLoading.value ||
			!empireIO.value.length ||
			!allRecipesList.value.length
		)
			return [];

		const dMap = deltaMap.value;

		return (
			allRecipesList.value
				.map((recipe) => {
					let positiveDeltaCount = 0;
					let minRuns = Infinity;

					const inputStats = recipe.inputs.map((input) => {
						const currentDelta =
							dMap.get(input.material_ticker) ?? 0;

						if (currentDelta > 0) positiveDeltaCount++;

						const potentialRuns =
							currentDelta > 0
								? currentDelta / input.material_amount
								: 0;

						// Update bottleneck immediately
						if (potentialRuns < minRuns) minRuns = potentialRuns;

						return {
							ticker: input.material_ticker,
							requiredAmount: input.material_amount,
							currentDelta,
							potentialRuns,
							isMissing: currentDelta <= 0,
						};
					});

					const sustainedRuns = minRuns === Infinity ? 0 : minRuns;
					const inputMatchRatio =
						positiveDeltaCount / recipe.inputs.length;

					return {
						recipe,
						inputStats,
						inputMatchRatio,
						sustainedRuns,
						isFullMatch:
							sustainedRuns >= 1 &&
							positiveDeltaCount === recipe.inputs.length,
					};
				})
				// only use those where there is a match from the delta
				.filter((opp) => opp.inputMatchRatio > 0)
				// sort by full match -> highest sustained throughput
				.sort(
					(a, b) =>
						b.inputMatchRatio - a.inputMatchRatio ||
						b.sustainedRuns - a.sustainedRuns
				)
		);
	});

	const opportunityStats = computed((): IOpportunityStats => {
		const list = opportunities.value;

		return list.reduce(
			(acc, opp) => {
				if (opp.isFullMatch) acc.fullMatch++;
				else if (opp.sustainedRuns > 0) {
					acc.deltaRequired++;
				} else {
					acc.missingMaterial++;
				}
				return acc;
			},
			{
				fullMatch: 0,
				deltaRequired: 0,
				missingMaterial: 0,
				total: list.length,
			}
		);
	});

	return {
		isLoading,
		allRecipesList,
		opportunities,
		opportunityStats,
	};
}
