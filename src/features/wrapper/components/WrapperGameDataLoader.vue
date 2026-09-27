<script setup lang="ts">
	// Composables
	import { useGameDataLoader } from "@/features/wrapper/useGameDataLoader";

	// Types & Interfaces
	import type {
		GameDataLoaderEmits,
		GameDataLoaderProps,
	} from "@/features/wrapper/gameDataLoader.types";

	// Components
	import RenderingProgress from "@/layout/components/RenderingProgress.vue";

	// UI
	import { PSpin, PIcon } from "@/ui";
	import { CheckSharp, ClearSharp } from "@vicons/material";

	const props: GameDataLoaderProps = defineProps<GameDataLoaderProps>();
	const emit: GameDataLoaderEmits = defineEmits<GameDataLoaderEmits>();

	const { done, allLoaded, hasError, loadingSteps, results } =
		useGameDataLoader(props, emit);
</script>

<template>
	<template v-if="!done && !allLoaded">
		<div
			v-if="!props.minimal"
			class="relative w-full h-full bg-center bg-repeat"
			:class="
				!hasError
					? 'bg-[url(/images/bg_striped_prunplanner.png)]'
					: 'bg-[url(/images/bg_striped_error.png)]'
			">
			<div class="absolute inset-0 flex items-center justify-center">
				<div
					class="min-w-75 max-w-125 bg-black p-8 rounded shadow-lg text-center flex flex-col gap-y-3">
					<h1 class="text-2xl font-bold font-mono mb-3">
						{{ $t("wrapper.loading") }}
					</h1>
					<div
						v-for="e in loadingSteps"
						:key="e.name"
						class="flex flex-row align-middle gap-x-3">
						<div class="mr-5">
							<div v-if="e.loading" class="my-1">
								<PSpin />
							</div>
							<PIcon v-else :size="20">
								<CheckSharp v-if="!e.error" />
								<ClearSharp v-else />
							</PIcon>
						</div>
						<div class="text-left!">{{ e.name }}</div>
					</div>
				</div>
			</div>
		</div>
		<div v-else class="relative w-full h-full">
			<div class="absolute inset-0 flex items-center justify-center">
				<PSpin />
			</div>
		</div>
	</template>
	<template v-else>
		<Suspense>
			<slot
				:complete="allLoaded"
				:material-data="results.materialData"
				:exchange-data="results.exchangeData"
				:building-data="results.buildingData"
				:recipe-data="results.recipeData"
				:planet-data="results.planetData"
				:planet-multiple-data="results.planetMultipleData" />
			<template #fallback>
				<RenderingProgress />
			</template>
		</Suspense>
	</template>
</template>
