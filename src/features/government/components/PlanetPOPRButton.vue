<script setup lang="ts">
	import { ref, type Ref, computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Components
	import PlanetPOPRTable from "./PlanetPOPRTable.vue";

	// Typoes & Interfaces
	import type { PopulationReport } from "@/features/api/schemas/gameData.schemas";

	// UI
	import { PButton } from "@/ui";
	import { NModal } from "naive-ui";

	const {
		planetNaturalId,
		buttonSize = "md",
		buttonText = "POPR",
	} = defineProps<{
		planetNaturalId: string;
		buttonSize?: "sm" | "md";
		buttonText?: string;
	}>();

	const showPOPRModal: Ref<boolean> = ref(false);
	const buttonLoading: Ref<boolean> = ref(false);
	const buttonDisabled: Ref<boolean> = ref(false);
	const poprData: Ref<PopulationReport | null> = ref(null);

	async function loadData(planetNaturalId: string): Promise<void> {
		buttonLoading.value = true;

		trackEvent("popr_load", { planetNaturalId });

		try {
			await useQuery("GetPlanetLastPOPR", {
				planetNaturalId: planetNaturalId,
			})
				.execute()
				.then((data: PopulationReport) => {
					poprData.value = data;
					showPOPRModal.value = true;
				})
				.finally(() => {
					buttonLoading.value = false;
				});
		} catch {
			buttonDisabled.value = true;
		}
	}

	const compButtonText = computed(() =>
		!buttonDisabled.value
			? buttonText
			: t("government.popr_button.buttons.no_popr")
	);

	const buttonType = computed(() =>
		!buttonDisabled.value ? "primary" : "error"
	);
</script>

<template>
	<n-modal
		v-model:show="showPOPRModal"
		preset="card"
		:title="
			t('government.popr_button.modal_title', {
				planet_id: planetNaturalId,
			})
		"
		class="max-w-150">
		<PlanetPOPRTable
			v-if="poprData"
			:planet-natural-id="planetNaturalId"
			:popr-data="poprData" />
	</n-modal>
	<PButton
		:size="buttonSize"
		:loading="buttonLoading"
		:disabled="buttonDisabled"
		:type="buttonType"
		@click="loadData(planetNaturalId)">
		{{ compButtonText }}
	</PButton>
</template>
