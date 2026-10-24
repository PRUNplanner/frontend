<script setup lang="ts">
	import { computed, type PropType, type WritableComputedRef } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { trackPlanEdit } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import type { IAreaResult } from "@/features/planning/usePlanCalculation.types";

	// UI
	import { PInputNumber } from "@/ui";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		areaData: {
			type: Object as PropType<IAreaResult>,
			required: true,
		},
		planetNaturalId: {
			type: String,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "update:permits", value: number): void;
	}>();

	// Local State
	const localPermits: WritableComputedRef<number, number | null> = computed({
		get: () => props.areaData.permits,
		set: (value: number | null) => {
			// the input is empty while retyping
			if (value === null) return;

			emit("update:permits", value);
			trackPlanEdit({
				field: "permits",
				amount: value,
				planet_natural_id: props.planetNaturalId,
			});
		},
	});
</script>

<template>
	<div class="flex items-center justify-between gap-3 text-sm tabular-nums">
		<span>
			{{ t("plan.components.area.permits") }}
			<span class="text-xs text-muted">
				·
				{{ t("plan.base.planet.area", { n: areaData.areaTotal }) }}
			</span>
		</span>
		<PInputNumber
			v-model:value="localPermits"
			:aria-label="t('plan.components.area.permits')"
			:disabled="disabled"
			show-buttons
			size="sm"
			:min="1"
			:max="3"
			class="w-28" />
	</div>
</template>
