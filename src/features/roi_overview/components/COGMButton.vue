<script setup lang="ts">
	import { type PropType, ref, type Ref } from "vue";

	// Components
	import PlanCOGM from "@/features/planning/components/tools/PlanCOGM.vue";

	import { PButton } from "@/ui";
	import { NModal } from "naive-ui";
	import type { IProductionBuildingRecipeCOGM } from "@/features/planning/usePlanCalculation.types";
	import { AnalyticsOutlined } from "@vicons/material";

	defineProps({
		cogmData: {
			type: Object as PropType<IProductionBuildingRecipeCOGM>,
			required: false,
			default: undefined,
		},
	});

	const refShowCOGM: Ref<boolean> = ref(false);
</script>

<template>
	<n-modal
		key="COGM"
		v-model:show="refShowCOGM"
		preset="card"
		title="Cost Of Goods Manufactured"
		class="max-w-150">
		<PlanCOGM v-if="cogmData" :cogm-data="cogmData" />
	</n-modal>
	<PButton
		size="sm"
		secondary
		:disabled="cogmData === undefined"
		@click="() => (refShowCOGM = true)">
		<template #icon><AnalyticsOutlined /> </template>COGM
	</PButton>
</template>
