<script setup lang="ts">
	import { ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: `${t("production_chains.view_title")} | PRUNplanner`,
	});

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import GraphVueFlow from "@/features/production_chain/components/GraphVueFlow.vue";
	import GraphAnalysisMaterials from "@/features/production_chain/components/GraphAnalysisMaterials.vue";
	import GraphAnalysisExpertise from "@/features/production_chain/components/GraphAnalysisExpertise.vue";
	import GraphAnalysisWorkforce from "@/features/production_chain/components/GraphAnalysisWorkforce.vue";

	// Composables
	import { useGraph } from "@/features/production_chain/useGraph";
	// the graph indexes all recipes on creation, so only after the loader
	let graph: ReturnType<typeof useGraph> | undefined;
	import { useMaterialData } from "@/database/services/useMaterialData";
	const { materialSelectOptions } = useMaterialData();
	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import type { IGraphFlow } from "@/features/production_chain/productionGraph.types";
	import type { PSelectOption } from "@/ui/ui.types";
	import {
		type NodeColorType,
		NodeColorTypeOptions,
	} from "@/features/production_chain/components/ChainNode.types";

	// UI
	import {
		PForm,
		PFormItem,
		PFormSeperator,
		PInput,
		PSelect,
		PInputNumber,
	} from "@/ui";

	const graphData: Ref<IGraphFlow | null> = ref(null);

	const selectedMaterial: Ref<string> = ref("RAT");
	const selectedAmount: Ref<number> = ref(1);
	const selectedRecipes: Ref<Record<string, string>> = ref({});
	const selectedTerminals: Ref<string> = ref("");
	const recipeOptions: Ref<Record<string, PSelectOption[]>> = ref({});
	const selectedNodeColorType: Ref<NodeColorType> = ref("Material");

	async function generate(resetSelection: boolean = false) {
		if (resetSelection) selectedRecipes.value = {};

		trackEvent("production_chain", {
			materialTicker: selectedMaterial.value,
			amount: selectedAmount.value,
			recipes: Object.values(selectedRecipes.value),
			terminals: selectedTerminals.value,
		});

		graph ??= useGraph();
		const { create } = await graph;

		graphData.value = await create(
			selectedMaterial.value,
			selectedAmount.value,
			Object.values(selectedRecipes.value),
			selectedTerminals.value
		);

		selectedRecipes.value = graphData.value.recipeSelection;
		recipeOptions.value = graphData.value.recipeOptions;
	}
</script>

<template>
	<!-- the graph needs recipes and buildings, build it once they are loaded -->
	<WrapperGameDataLoader
		load-materials
		load-recipes
		load-buildings
		@complete="generate()">
		<div class="min-h-screen flex flex-col">
			<div
				class="px-6 py-3 border-b border-white/10 flex flex-row flex-wrap justify-between gap-3">
				<h1 class="text-2xl font-bold my-auto">
					{{ $t("production_chains.title") }}
				</h1>
				<HelpDrawer file-name="tools_production_chain" />
			</div>
			<div
				class="grow grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)_300px] gap-3 divide-x divide-white/10">
				<div class="px-6 py-3">
					<h3 class="font-bold pb-3">
						{{ $t("production_chains.configuration.title") }}
					</h3>
					<PForm>
						<PFormItem
							:label="
								t('production_chains.configuration.material')
							">
							<PSelect
								v-model:value="selectedMaterial"
								:options="materialSelectOptions"
								searchable
								class="w-full"
								@update:value="generate(true)" />
						</PFormItem>
						<PFormItem
							:label="
								t('production_chains.configuration.recipe_runs')
							">
							<PInputNumber
								v-model:value="selectedAmount"
								:min="1"
								show-buttons
								class="w-full"
								@update:value="generate()" />
						</PFormItem>
						<PFormItem
							:label="
								t('production_chains.configuration.node_color')
							">
							<PSelect
								v-model:value="selectedNodeColorType"
								:options="NodeColorTypeOptions"
								searchable
								class="w-full"
								@update:value="generate(true)" />
						</PFormItem>
						<PFormItem
							:label="
								t('production_chains.configuration.terminals')
							">
							<PInput
								v-model:value="selectedTerminals"
								:placeholder="
									t(
										'production_chains.configuration.terminals_placeholder'
									)
								"
								class="w-full"
								@update:value="generate()" />
						</PFormItem>
						<PFormSeperator>
							<div class="text-xs text-white/60 pt-1">
								{{
									$t(
										"production_chains.configuration.terminals_info"
									)
								}}
							</div>
						</PFormSeperator>
					</PForm>
					<template v-if="graphData">
						<h3 class="font-bold py-3">
							{{
								$t(
									"production_chains.configuration.recipe_selection"
								)
							}}
						</h3>
						<PForm>
							<template
								v-for="[building, options] in Object.entries(
									recipeOptions
								)"
								:key="building">
								<PFormItem
									v-if="options.length > 1"
									:label="building">
									<PSelect
										v-model:value="
											selectedRecipes[building]
										"
										:options="options"
										class="w-full"
										@update:value="generate()" />
								</PFormItem>
							</template>
						</PForm>
					</template>

					<GraphAnalysisMaterials
						v-if="graphData"
						:material-analysis="graphData.materialAnalysis" />
				</div>
				<div class="py-3 pr-3 min-w-0 overflow-hidden">
					<GraphVueFlow
						v-if="graphData"
						:nodes="graphData.nodes"
						:edges="graphData.edges"
						:selected-node-color-type="selectedNodeColorType" />
				</div>
				<div class="pl-3 pr-6 py-3 min-w-0 overflow-x-auto">
					<GraphAnalysisExpertise
						v-if="graphData"
						:expertise-analysis="graphData.expertiseAnalysis" />

					<GraphAnalysisWorkforce
						v-if="graphData"
						:workforce-analysis="graphData.workforceAnalysis" />
				</div>
			</div>
		</div>
	</WrapperGameDataLoader>
</template>

<style>
	/* these are necessary styles for vue flow */
	@import "@vue-flow/core/dist/style.css";

	/* this contains the default theme, these are optional styles */
	@import "@vue-flow/core/dist/theme-default.css";

	/* the theme sets 10px edge labels */
	.vue-flow__edge-text {
		font-size: 12px;
	}

	/* the theme removes the focus outline of nodes and edges */
	.vue-flow .vue-flow__node:focus-visible,
	.vue-flow .vue-flow__edge:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
