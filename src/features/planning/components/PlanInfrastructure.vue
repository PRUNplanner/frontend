<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		type PropType,
		type WritableComputedRef,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { trackPlanEdit } from "@/lib/analytics/useAnalytics";
	import type { HabSolverGoal } from "@/features/planning/calculations/habOptimization";

	// Types & Interfaces
	import type { InfrastructureType } from "@/features/api/schemas/planningData.schemas";
	import type { IInfrastructureRecord } from "@/features/planning/usePlanCalculation.types";
	import { isStorageInfrastructure } from "@/features/planning/calculations/infrastructureCalculations";

	// UI
	import {
		PButton,
		PForm,
		PFormItem,
		PCheckbox,
		PInputNumber,
		PTooltip,
	} from "@/ui";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		autoOptimizeHabs: {
			type: Boolean,
			required: true,
		},
		infrastructureData: {
			type: Object as PropType<IInfrastructureRecord>,
			required: true,
		},
		planetNaturalId: {
			type: String,
			required: true,
		},
	});

	const emit = defineEmits<{
		(
			e: "update:infrastructure",
			infrastructure: InfrastructureType,
			value: number
		): void;
		(
			e: "update:auto-optimize-habs",
			value: boolean,
			goal: HabSolverGoal
		): void;
		(e: "optimize-habs", goal: HabSolverGoal): void;
	}>();

	// Local State
	const localInfrastructureData: ComputedRef<IInfrastructureRecord> =
		computed(() => props.infrastructureData);

	const infrastructureOrder: InfrastructureType[] = [
		"HB1",
		"HBB",
		"HB2",
		"HBC",
		"HB3",
		"HBM",
		"HB4",
		"HBL",
		"HB5",
		"STO",
		"STA",
		"STE",
		"STV",
		"STW",
	];

	const localAutoOptimizeHabs: WritableComputedRef<boolean> = computed({
		get: () => props.autoOptimizeHabs,
		set: (value: boolean) => {
			emit("update:auto-optimize-habs", value, "auto");
		},
	});
</script>

<template>
	<div class="mb-3">
		<PForm>
			<PFormItem
				:label="t('plan.components.infrastructure.auto_optimize')">
				<PTooltip>
					<template #trigger>
						<PCheckbox
							v-model:checked="localAutoOptimizeHabs"
							:disabled="disabled" />
					</template>
					{{
						$t(
							"plan.components.infrastructure.auto_optimize_tooltip"
						)
					}}
				</PTooltip>
			</PFormItem>
		</PForm>
	</div>
	<div class="grid grid-cols-[repeat(4,auto)] gap-3 child:my-auto">
		<template v-for="inf in infrastructureOrder" :key="inf">
			<div>{{ inf }}</div>
			<PInputNumber
				:aria-label="
					$t('plan.components.infrastructure.amount_label', {
						infrastructure: inf,
					})
				"
				:value="localInfrastructureData[inf]"
				:disabled="
					disabled ||
					(localAutoOptimizeHabs && !isStorageInfrastructure(inf))
				"
				show-buttons
				:min="0"
				class="min-w-21.25 max-w-25"
				@update:value="
					(value) => {
						if (value !== null && value !== undefined) {
							emit('update:infrastructure', inf, value);
							trackPlanEdit({
								field: 'infrastructure',
								planet_natural_id: props.planetNaturalId,
								infrastructure_type: inf,
								amount: value,
							});
						}
					}
				" />
		</template>
		<div class="col-span-2 justify-self-center">
			<PButton
				:disabled="disabled || localAutoOptimizeHabs"
				@click="emit('optimize-habs', 'cost')">
				{{ $t("plan.components.infrastructure.buttons.optimize_cost") }}
			</PButton>
		</div>
		<div class="col-span-2 justify-self-center">
			<PButton
				:disabled="disabled || localAutoOptimizeHabs"
				@click="emit('optimize-habs', 'area')">
				{{ $t("plan.components.infrastructure.buttons.optimize_area") }}
			</PButton>
		</div>
	</div>
</template>
