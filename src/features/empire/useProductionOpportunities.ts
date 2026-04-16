import { ref, computed, onMounted, Ref } from "vue";

// Composables
import { useBuildingData } from "@/database/services/useBuildingData";
import { usePrice } from "@/features/cx/usePrice";

// Types & Interfaces
import { IEmpireMaterialIO } from "@/features/empire/empire.types";
import { IRecipe } from "@/features/api/gameData.types";
import { IOpportunityStats } from "@/features/empire/useProductionOpportunities.types";

interface IPriceSellMap {
	[ticker: string]: number;
}

export function useProductionOpportunities(
	empireIO: Ref<IEmpireMaterialIO[]>,
	cxUuid: Ref<string | undefined>
) {
	const recipeMap = ref<Record<string, IRecipe[]>>({});
	const priceSellMap = ref<IPriceSellMap>({});
	const isLoading = ref<boolean>(true);

	onMounted(async () => {
		try {
			const [{ getAllBuildingRecipes }, { getPrice }] = await Promise.all(
				[useBuildingData(), usePrice(cxUuid, ref(undefined))]
			);

			// fetch recipes
			const recipes = getAllBuildingRecipes();
			recipeMap.value = recipes;

			// extract materials and get their sell prices
			const uniqueTickers = new Set<string>();
			Object.values(recipes)
				.flat()
				.forEach((recipe) => {
					recipe.inputs.forEach((input) =>
						uniqueTickers.add(input.material_ticker)
					);
					recipe.outputs.forEach((output) =>
						uniqueTickers.add(output.material_ticker)
					);
				});

			const priceEntries = await Promise.all(
				Array.from(uniqueTickers).map(async (ticker) => {
					const price = await getPrice(ticker, "SELL");
					return [ticker, price] as const;
				})
			);
			priceSellMap.value = Object.fromEntries(priceEntries);
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

					// calculate sell income for all sustainedRuns x all output materials
					let outputSellCost: number = 0;

					recipe.outputs.forEach((output) => {
						const unitPrice =
							priceSellMap.value[output.material_ticker] ?? 0;
						outputSellCost +=
							unitPrice * output.material_amount * sustainedRuns;
					});

					// calculate sell income for all positive delta input available
					let inputSellCost: number = 0;

					inputStats.map((input) => {
						if (input.currentDelta >= input.requiredAmount) {
							const unitPrice =
								priceSellMap.value[input.ticker] ?? 0;
							inputSellCost +=
								unitPrice *
								input.requiredAmount *
								sustainedRuns;
						}
					});

					return {
						recipe,
						inputStats,
						inputMatchRatio,
						sustainedRuns,
						isFullMatch:
							sustainedRuns >= 1 &&
							positiveDeltaCount === recipe.inputs.length,
						inputSellCost,
						outputSellCost,
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
		priceSellMap,
	};
}
