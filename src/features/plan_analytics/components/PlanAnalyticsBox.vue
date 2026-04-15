<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";

	// UI
	import PIcon from "@/ui/components/PIcon.vue";
	import { InsightsSharp, CloseSharp } from "@vicons/material";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import {
		AnalyticsPlanetInsightsDataType,
		AnalyticsPlanetInsightsRecipeType,
	} from "@/features/api/schemas/analyticsData.schemas";

	const { planetNaturalId } = defineProps<{
		planetNaturalId: string;
	}>();

	const isOpen = ref<boolean>(false);
	const expandedBuildings = ref<Set<string>>(new Set());
	const planetInsights = ref<AnalyticsPlanetInsightsDataType | null>(null);

	onMounted(() => {
		// async fetch planet insights
		useQuery("GetAnalyticsPlanetInsights", { planetNaturalId })
			.execute()
			.then((data) => {
				if (data.status === "success") {
					planetInsights.value = data;
				}
			});
	});

	const hasData = computed(() => planetInsights.value?.status === "success");

	const analyticsData = computed(() => {
		const rawData = planetInsights.value?.insights_data;
		if (!rawData) return null;

		// sort recipe_distribution by key
		const sortedRecipeKeys = Object.keys(
			rawData.recipe_distribution
		).sort();
		const sortedRecipes: Record<
			string,
			AnalyticsPlanetInsightsRecipeType[]
		> = {};

		for (const key of sortedRecipeKeys) {
			sortedRecipes[key] = rawData.recipe_distribution[key];
		}

		return {
			...rawData,
			recipe_distribution: sortedRecipes,
		};
	});

	const formatRecipe = (id: string): string => {
		return id.split("#")[1]?.replace("=>", " ➔ ") || id;
	};

	const getSegmentColor = (index: number): string => {
		const colors = [
			"bg-prunplanner",
			"bg-white",
			"bg-white/80",
			"bg-white/60",
			"bg-white/40",
			"bg-white/20",
			"bg-white/10",
		];
		return colors[index] || colors[colors.length - 1];
	};

	const toggleBuilding = (building: string) => {
		if (expandedBuildings.value.has(building)) {
			expandedBuildings.value.delete(building);
		} else {
			expandedBuildings.value.add(building);
		}
	};
</script>

<template>
	<div
		v-if="hasData && analyticsData"
		class="fixed bottom-6 right-4 z-50 flex flex-col items-end text-white/80">
		<div
			v-if="isOpen"
			class="flex flex-col gap-3 w-100 max-h-[500px] flex-col rounded border border-white/10 bg-gray-dark shadow-lg mb-3">
			<div
				class="flex items-center justify-between border-b border-white/10 p-3">
				<h3 class="font-bold">Planning Insights</h3>
				<button
					class="text-sm text-white/60 hover:text-white"
					@click="isOpen = false">
					<PIcon><CloseSharp /></PIcon>
				</button>
			</div>

			<div class="overflow-y-auto px-3 flex flex-col gap-3 pb-3">
				<div>
					<h4 class="mb-2 text-xs font-bold uppercase">Experts</h4>

					<div
						class="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-white/5 shadow-inner">
						<div
							v-for="(
								item, index
							) in analyticsData.expert_distribution"
							:key="item.type"
							class="h-full transition-all duration-500"
							:class="getSegmentColor(index)"
							:style="{ width: `${item.percentage}%` }"
							:title="`${item.type}: ${item.percentage}%`"></div>
					</div>

					<ul class="space-y-1">
						<li
							v-for="(
								item, index
							) in analyticsData.expert_distribution"
							:key="item.type"
							class="flex items-center justify-between text-xs">
							<div class="flex items-center gap-2">
								<span
									:class="[
										'h-2 w-2 rounded-full',
										getSegmentColor(index),
									]"></span>
								<span class="text-white/60"
									>{{ item.type }}
								</span>
							</div>
							<span class="font-mono text-white/60">
								{{ formatNumber(item.percentage, 2, false) }}%
							</span>
						</li>
					</ul>
				</div>

				<div>
					<h4 class="mb-2 text-xs font-bold uppercase">
						Production Buildings
					</h4>
					<div class="space-y-3">
						<div
							v-for="item in analyticsData.building_distribution"
							:key="item.ticker"
							class="group">
							<div class="mb-1 flex justify-between text-xs">
								<span
									class="font-mono font-bold text-prunplanner">
									{{ item.ticker }}
								</span>
								<span class="text-white/60 font-mono">
									{{ item.percentage }}%
								</span>
							</div>

							<div
								class="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
								<div
									class="bg-prunplanner h-full transition-all duration-500 ease-out"
									:style="{
										width: `${item.percentage}%`,
									}"></div>
							</div>
						</div>
					</div>
				</div>

				<div>
					<h4 class="mb-2 text-xs font-bold uppercase">Recipes</h4>

					<div class="space-y-1">
						<div
							v-for="(
								recipes, building
							) in analyticsData.recipe_distribution"
							:key="building"
							class="overflow-hidden rounded border border-white/10 bg-white/5">
							<button
								class="flex w-full items-center justify-between px-2 py-1 text-xs hover:bg-white/10 font-mono transition-colors"
								@click="toggleBuilding(building as string)">
								<span class="font-bold text-prunplanner">
									{{ building }}
								</span>
								<div class="flex items-center gap-2 text-xs">
									<span class="text-white/60">
										{{ recipes.length }}
									</span>
									<span
										class="transition-transform duration-200"
										:class="{
											'rotate-180': expandedBuildings.has(
												building as string
											),
										}">
										▼
									</span>
								</div>
							</button>

							<div
								v-if="expandedBuildings.has(building as string)"
								class="border-t border-white/5 bg-gray-dark p-2">
								<div
									v-for="recipe in recipes"
									:key="recipe.recipe_id"
									class="mb-3 last:mb-0">
									<div
										class="mb-1 flex flex-row items-end gap-x-6 justify-between text-xs font-mono text-white/60">
										<span>
											{{ formatRecipe(recipe.recipe_id) }}
										</span>
										<span>{{ recipe.percentage }}% </span>
									</div>
									<div
										class="h-1.5 overflow-hidden w-full bg-white/5 rounded-full">
										<div
											class="bg-prunplanner h-full"
											:style="{
												width: `${recipe.percentage}%`,
											}"></div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="text-xs text-white/50">
					Insights are aggregated from active player plans on
					<strong>{{ planetNaturalId }}</strong
					>. PRUNplanner enforces minimum sample thresholds to ensure
					both anonymity and statistical accuracy.
				</div>
			</div>
		</div>

		<button
			class="bg-prunplanner flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-transform hover:scale-110 active:scale-80 focus:outline-none"
			aria-label="Toggle Insights"
			@click="isOpen = !isOpen">
			<span class="h-5 w-5 flex items-center justify-center text-black">
				<InsightsSharp v-if="!isOpen" />
				<CloseSharp v-else />
			</span>
		</button>
	</div>
</template>
