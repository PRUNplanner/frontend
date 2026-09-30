<script setup lang="ts">
	import { computed, type ComputedRef, type PropType } from "vue";
	import { trackPlanEdit } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import type { ExpertType } from "@/features/api/schemas/planningData.schemas";
	import type { IExpertRecord } from "@/features/planning/usePlanCalculation.types";

	// Util
	import { formatNumber } from "@/util/numbers";

	// UI
	import { PInputNumber } from "@/ui";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		expertData: {
			type: Object as PropType<IExpertRecord>,
			required: true,
		},
		planetNaturalId: {
			type: String,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "update:expert", expert: ExpertType, value: number): void;
	}>();

	// Local State
	const localExpertData: ComputedRef<IExpertRecord> = computed(
		() => props.expertData
	);

	const totalExperts = computed(() => {
		let total: number = 0;

		Object.keys(localExpertData.value).forEach((expertKey) => {
			total += localExpertData.value[expertKey as ExpertType].amount;
		});

		return total;
	});
</script>

<template>
	<div v-if="totalExperts > 6" class="bg-red-500/50 p-2 mb-3">
		{{
			$t("plan.components.experts.warning", {
				expert_number: totalExperts,
			})
		}}
	</div>
	<div
		class="grid grid-cols-[repeat(3,auto)] sm:grid-cols-[repeat(6,auto)] gap-3 child:my-auto">
		<template v-for="expert in expertData" :key="expert.name">
			<div>
				{{ $t(`game.expertise.${expert.name.toUpperCase()}`) }}
			</div>
			<PInputNumber
				:aria-label="
					$t('plan.components.experts.amount_label', {
						expert: $t(
							`game.expertise.${expert.name.toUpperCase()}`
						),
					})
				"
				:value="localExpertData[expert.name].amount"
				:disabled="disabled"
				show-buttons
				:min="0"
				:max="5"
				class="min-w-20 max-w-25"
				@update:value="
					(value) => {
						if (value !== null && value !== undefined) {
							emit('update:expert', expert.name, value);
							trackPlanEdit({
								field: 'expert',
								planet_natural_id: props.planetNaturalId,
								expert_type: expert.name,
								amount: value,
							});
						}
					}
				" />
			<div
				class="pl-1 text-end text-xs text-nowrap"
				:class="expert.bonus === 0 ? 'text-muted' : ''">
				{{ formatNumber(expert.bonus * 100, 2) }} %
			</div>
		</template>
	</div>
</template>
