import { ref, computed, onMounted, Ref } from "vue";
import { useBuildingData } from "@/database/services/useBuildingData";
import { IEmpireMaterialIO } from "./empire.types";
import { IRecipe } from "../api/gameData.types";

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

					const inputStats = recipe.inputs.map((input) => {
						const currentDelta =
							dMap.get(input.material_ticker) ?? 0;

						if (currentDelta > 0) positiveDeltaCount++;

						// potential runs = current delta / recipe requirement
						const potentialRuns =
							currentDelta > 0
								? currentDelta / input.material_amount
								: 0;

						return {
							ticker: input.material_ticker,
							requiredAmount: input.material_amount,
							currentDelta,
							potentialRuns,
							isMissing: currentDelta <= 0,
						};
					});

					const sustainedRuns = Math.min(
						...inputStats.map((i) => i.potentialRuns)
					);
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

	return {
		isLoading,
		allRecipesList,
		opportunities,
	};
}
