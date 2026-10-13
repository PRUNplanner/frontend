<script setup lang="ts">
	import { type PropType, ref, type Ref } from "vue";

	// Components
	import PlanCOGM from "@/features/planning/components/tools/PlanCOGM.vue";

	import { PButton, PModal } from "@/ui";
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
	<PModal
		key="COGM"
		v-model:show="refShowCOGM"
		title="Cost Of Goods Manufactured"
		:width="600">
		<PlanCOGM v-if="cogmData" :cogm-data="cogmData" />
	</PModal>
	<PButton
		size="sm"
		type="secondary"
		:disabled="cogmData === undefined"
		@click="() => (refShowCOGM = true)">
		<template #icon><AnalyticsOutlined /> </template>COGM
	</PButton>
</template>
