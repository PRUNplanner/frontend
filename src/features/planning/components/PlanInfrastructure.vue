<script setup lang="ts">
	import { computed, ComputedRef, PropType, WritableComputedRef } from "vue";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { HabSolverGoal } from "@/features/planning/calculations/habOptimization";

	// Types & Interfaces
	import {
		IInfrastructureRecord,
		INFRASTRUCTURE_TYPE,
	} from "@/features/planning/usePlanCalculation.types";
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
			infrastructure: INFRASTRUCTURE_TYPE,
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

	const infrastructureOrder: INFRASTRUCTURE_TYPE[] = [
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
			<PFormItem label="Auto-Optimize Habs">
				<PTooltip>
					<template #trigger>
						<PCheckbox
							v-model:checked="localAutoOptimizeHabs"
							:disabled="disabled" />
					</template>
					Automatically optimize habitations to meet<br />workforce
					needs as buildings are added.
				</PTooltip>
			</PFormItem>
		</PForm>
	</div>
	<div class="grid grid-cols-[repeat(4,auto)] gap-3 child:my-auto">
		<template v-for="inf in infrastructureOrder" :key="inf">
			<div>{{ inf }}</div>
			<PInputNumber
				v-model:value="localInfrastructureData[inf]"
				:disabled="disabled || (localAutoOptimizeHabs && !isStorageInfrastructure(inf))"
				show-buttons
				:min="0"
				class="min-w-21.25 max-w-25"
				@update:value="
					(value) => {
						if (value !== null && value !== undefined) {
							emit('update:infrastructure', inf, value);
							trackEvent('plan_update_infrastructure', {
								planetNaturalId: props.planetNaturalId,
								infrastructureType: inf,
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
				Optimize Cost
			</PButton>
		</div>
		<div class="col-span-2 justify-self-center">
			<PButton
				:disabled="disabled || localAutoOptimizeHabs"
				@click="emit('optimize-habs', 'area')">
				Optimize Area
			</PButton>
		</div>
	</div>
</template>
