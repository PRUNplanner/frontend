<script setup lang="ts">
	// Composables
	import { usePlanningDataLoader } from "@/features/wrapper/usePlanningDataLoader";
	import { useDelay } from "@/features/wrapper/useDelay";

	// Types & Interfaces
	import type {
		PlanningDataLoaderEmits,
		PlanningDataLoaderProps,
	} from "@/features/wrapper/planningDataLoader.types";

	// Components
	import RenderingProgress from "@/layout/components/RenderingProgress.vue";

	// UI
	import { PSpin, PIcon } from "@/ui";
	import { CheckSharp, ClearSharp } from "@vicons/material";

	const props: PlanningDataLoaderProps =
		defineProps<PlanningDataLoaderProps>();
	const emit = defineEmits<PlanningDataLoaderEmits>();

	const {
		done,
		allLoaded,
		hasError,
		sharedPlanMissing,
		loadingSteps,
		results,
	} = usePlanningDataLoader(props, emit);

	// fast (cached) loads show nothing, errors show at once
	const showLoader = useDelay(400);
</script>

<template>
	<div
		v-if="sharedPlanMissing"
		class="min-h-[50vh] flex items-center justify-center p-6">
		<div class="max-w-125 text-center flex flex-col gap-y-3">
			<h1 class="text-2xl font-bold text-white">
				{{ $t("sharing.unavailable.title") }}
			</h1>
			<p>{{ $t("sharing.unavailable.text") }}</p>
			<RouterLink
				to="/"
				class="text-link-primary font-bold hover:underline">
				{{ $t("sharing.unavailable.home") }}
			</RouterLink>
		</div>
	</div>
	<template v-else-if="!done && !allLoaded">
		<div
			v-if="hasError || showLoader"
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
						<div class="mr-5 w-7.5">
							<div v-if="e.loading" class="my-1">
								<PSpin />
							</div>
							<PIcon v-else :size="20">
								<CheckSharp v-if="!e.error" />
								<ClearSharp v-else />
							</PIcon>
						</div>
						<div>{{ e.name }}</div>
					</div>
				</div>
			</div>
		</div>
	</template>
	<Suspense v-else>
		<slot
			:complete="allLoaded"
			:disabled="results.disabled"
			:shared-plan="results.sharedPlan"
			:empire-list="results.empireList"
			:empire-planet-list="results.empirePlanetList.value"
			:planet-data="results.planetData"
			:plan-data="results.planData"
			:plan-list="results.planList"
			:shared-data="results.sharedData"
			:plan-definition="results.planDefinition" />
		<template #fallback>
			<RenderingProgress />
		</template>
	</Suspense>
</template>
