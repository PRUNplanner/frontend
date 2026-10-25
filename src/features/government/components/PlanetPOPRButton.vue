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
	import { PButton, PModal } from "@/ui";

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

		trackEvent("planet:popr_load", {
			planet_natural_id: planetNaturalId,
		});

		try {
			await useQuery("GetPlanetLastPOPR", {
				planetNaturalId: planetNaturalId,
			})
				.execute()
				// no report yet: the button says so, like a failed load
				.then((data: PopulationReport | null) => {
					if (!data) {
						buttonDisabled.value = true;
						return;
					}
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
	<PModal
		v-model:show="showPOPRModal"
		:title="
			t('government.popr_button.modal_title', {
				planet_id: planetNaturalId,
			})
		"
		:width="600">
		<PlanetPOPRTable
			v-if="poprData"
			:planet-natural-id="planetNaturalId"
			:popr-data="poprData" />
	</PModal>
	<PButton
		:size="buttonSize"
		:loading="buttonLoading"
		:disabled="buttonDisabled"
		:type="buttonType"
		@click="loadData(planetNaturalId)">
		{{ compButtonText }}
	</PButton>
</template>
