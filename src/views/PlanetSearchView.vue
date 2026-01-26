<script setup lang="ts">
	import { ref, Ref } from "vue";
	import { useHead } from "@unhead/vue";

	useHead({
		title: "Planet Search | PRUNplanner",
	});

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import PlanetSearchBasic from "@/features/planet_search/components/PlanetSearchBasic.vue";
	import PlanetSearchAdvanced from "@/features/planet_search/components/PlanetSearchAdvanced.vue";
	import PlanetSearchResults from "@/features/planet_search/components/PlanetSearchResults.vue";

	import { IPlanet } from "@/features/api/gameData.types";

	const refResults: Ref<IPlanet[]> = ref([]);
	const refSearchMaterials: Ref<string[]> = ref([]);
	const refSearchMaterialRichness: Ref<Record<string, number>> = ref({});
	const refSearchSystem: Ref<string | undefined> = ref(undefined);
	const refSearchSystemDistance: Ref<number | undefined> = ref(undefined);
</script>

<template>
	<WrapperGameDataLoader load-materials load-exchanges>
		<div class="min-h-screen flex flex-col">
			<div
				class="px-6 py-3 border-b border-white/10 flex flex-row justify-between">
				<h1 class="text-2xl font-bold my-auto">Planet Search</h1>
				<HelpDrawer file-name="planet_search" />
			</div>

			<div class="border-b border-white/10">
				<div
					class="grid grid-cols-1 lg:grid-cols-[20%_auto] gap-3 divide-x divide-white/10">
					<div class="px-6 py-3">
						<PlanetSearchBasic
							@update:results="
								(value) => {
									refResults = value;
									refSearchMaterials = [];
									refSearchMaterialRichness = {};
									refSearchSystem = undefined;
									refSearchSystemDistance = undefined;
								}
							" />
					</div>
					<div class="px-3 py-3">
						<PlanetSearchAdvanced
							@update:results="(value) => (refResults = value)"
							@update:materials="
								(value) => (refSearchMaterials = value)
							"
							@update:richness="
								(value) => (refSearchMaterialRichness = value)
							"
							@update:distance="
								(searchSystem, searchDistance) => {
									refSearchSystem = searchSystem;
									refSearchSystemDistance = searchDistance;
								}
							" />
					</div>
				</div>
			</div>
			<div class="child:px-6 child:py-3">
				<div>
					<PlanetSearchResults
						:results="refResults"
						:search-materials="refSearchMaterials"
						:search-material-richness="refSearchMaterialRichness"
						:search-system="refSearchSystem"
						:search-system-distance="refSearchSystemDistance" />
				</div>
			</div>
		</div>
	</WrapperGameDataLoader>
</template>
