<script setup lang="ts">
	import { ref, type Ref } from "vue";

	// Components
	import PlanCOGM from "@/features/planning/components/tools/PlanCOGM.vue";

	import { PButton, PModal } from "@/ui";
	import type { IProductionBuildingRecipeCOGM } from "@/features/planning/usePlanCalculation.types";
	import { AnalyticsOutlined } from "@vicons/material";

	defineProps<{ cogmData?: IProductionBuildingRecipeCOGM }>();

	const refShowCOGM: Ref<boolean> = ref(false);
</script>

<template>
	<PModal
		key="COGM"
		v-model:show="refShowCOGM"
		:title="$t('plan.components.production_recipe.cogm_title')"
		:width="600">
		<PlanCOGM v-if="cogmData" :cogm-data="cogmData" />
	</PModal>
	<PButton
		size="sm"
		type="secondary"
		:disabled="cogmData === undefined"
		@click="() => (refShowCOGM = true)">
		<template #icon><AnalyticsOutlined /> </template>{{ $t("terms.cogm") }}
	</PButton>
</template>
