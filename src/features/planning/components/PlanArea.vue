<script setup lang="ts">
	import { computed, type PropType, type WritableComputedRef } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import type { IAreaResult } from "@/features/planning/usePlanCalculation.types";

	// UI
	import { PForm, PFormItem, PInputNumber } from "@/ui";

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
			trackEvent("plan_update_permits", {
				permits: value,
				planetNaturalId: props.planetNaturalId,
			});
		},
	});
</script>

<template>
	<PForm>
		<PFormItem :label="t('plan.components.area.permits')">
			<PInputNumber
				v-model:value="localPermits"
				:disabled="disabled"
				show-buttons
				:min="1"
				:max="3"
				class="w-full" />
		</PFormItem>
		<PFormItem :label="t('plan.components.area.area')">
			<div class="flex flex-row w-full">
				<div class="grow">
					{{ areaData.areaUsed }} / {{ areaData.areaTotal }}
				</div>
				<div>
					<span
						class="font-bold"
						:class="
							areaData.areaLeft >= 0
								? 'text-positive'
								: 'text-negative'
						"
						>{{ areaData.areaLeft }}</span
					>
					{{ $t("plan.components.area.free") }}
					<span v-if="areaData.areaLeft < 0" class="text-negative">
						·
						{{
							$t("plan.components.area.exceeded", {
								amount: -areaData.areaLeft,
							})
						}}
					</span>
				</div>
			</div>
		</PFormItem>
	</PForm>
</template>
