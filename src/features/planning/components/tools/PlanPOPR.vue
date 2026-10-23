<script setup lang="ts">
	import { onMounted, type PropType, ref, type Ref } from "vue";

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Components
	import PlanetPOPRTable from "@/features/government/components/PlanetPOPRTable.vue";

	// Types & Interfaces
	import type { IWorkforceRecord } from "@/features/planning/usePlanCalculation.types";
	import type { PopulationReport } from "@/features/api/schemas/gameData.schemas";

	// UI
	import { PSpin } from "@/ui";

	const props = defineProps({
		planetNaturalId: {
			type: String,
			required: true,
		},
		workforceData: {
			type: Object as PropType<IWorkforceRecord>,
			required: true,
		},
	});

	const isLoading: Ref<boolean> = ref(false);
	const hasError: Ref<boolean> = ref(false);
	const poprData: Ref<PopulationReport | null> = ref(null);

	async function fetchPOPR(planetNaturalId: string) {
		isLoading.value = true;
		try {
			await useQuery("GetPlanetLastPOPR", {
				planetNaturalId: planetNaturalId,
			})
				.execute()
				.then((data: PopulationReport) => (poprData.value = data))
				.finally(() => (isLoading.value = false));
		} catch {
			hasError.value = true;
		}
	}

	onMounted(() => fetchPOPR(props.planetNaturalId));
</script>

<template>
	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<h2 class="text-white/80 font-bold text-lg">
				{{ $t("plan.tools.popr.title") }}
			</h2>
			<span class="text-sm text-muted">
				{{ $t("plan.tools.popr.subtitle") }}
			</span>
		</div>
		<p v-if="hasError" class="text-muted">
			{{ $t("plan.tools.popr.error") }}
		</p>
		<div
			v-else-if="isLoading"
			class="flex flex-col items-center gap-2 py-6 text-muted">
			<PSpin size="lg" />
			{{ $t("plan.tools.popr.loading") }}
		</div>
		<PlanetPOPRTable
			v-else-if="poprData"
			:planet-natural-id="planetNaturalId"
			:popr-data="poprData"
			:workforce-data="workforceData" />
	</div>
</template>
