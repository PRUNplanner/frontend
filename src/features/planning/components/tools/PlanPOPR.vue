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
	<h2 class="pb-3 text-white/80 font-bold text-lg">
		{{ $t("plan.tools.popr.title") }}
	</h2>
	<div v-if="hasError">
		{{ $t("plan.tools.popr.error") }}
	</div>
	<div v-else-if="isLoading" class="text-center">
		<PSpin size="lg" />
		<br />
		{{ $t("plan.tools.popr.loading") }}
	</div>
	<div v-else-if="poprData">
		<PlanetPOPRTable
			:planet-natural-id="planetNaturalId"
			:popr-data="poprData"
			:workforce-data="workforceData" />
	</div>
</template>
