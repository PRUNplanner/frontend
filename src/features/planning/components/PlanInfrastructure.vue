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
	import { PButton, PCheckbox, PInputNumber, PTooltip } from "@/ui";

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

	function update(inf: InfrastructureType, value: number): void {
		emit("update:infrastructure", inf, value);
		trackPlanEdit({
			field: "infrastructure",
			planet_natural_id: props.planetNaturalId,
			infrastructure_type: inf,
			amount: value,
		});
	}

	const localAutoOptimizeHabs: WritableComputedRef<boolean> = computed({
		get: () => props.autoOptimizeHabs,
		set: (value: boolean) => {
			emit("update:auto-optimize-habs", value, "auto");
		},
	});
</script>

<template>
	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-3 text-sm">
			<PTooltip>
				<template #trigger>
					<label class="flex items-center gap-2 cursor-pointer">
						<PCheckbox
							v-model:checked="localAutoOptimizeHabs"
							:aria-label="t('plan.base.housing.auto')"
							:disabled="disabled" />
						{{ t("plan.base.housing.auto") }}
					</label>
				</template>
				{{
					t("plan.components.infrastructure.auto_optimize_tooltip")
				}}
			</PTooltip>
			<template v-if="!localAutoOptimizeHabs && !disabled">
				<PButton
					size="sm"
					type="secondary"
					@click="emit('optimize-habs', 'cost')">
					{{ t("plan.base.housing.cheapest") }}
				</PButton>
				<PButton
					size="sm"
					type="secondary"
					@click="emit('optimize-habs', 'area')">
					{{ t("plan.base.housing.least_area") }}
				</PButton>
			</template>
		</div>
		<div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm tabular-nums">
			<div
				v-for="inf in infrastructureOrder"
				:key="inf"
				class="flex items-center justify-between gap-2">
				<span
					class="font-mono"
					:class="
						localInfrastructureData[inf] > 0 ? 'text-ink-strong' : 'text-muted'
					">
					{{ inf }}
				</span>
				<PInputNumber
					:aria-label="
						t('plan.components.infrastructure.amount_label', {
							infrastructure: inf,
						})
					"
					:value="localInfrastructureData[inf]"
					:disabled="
						disabled ||
						(localAutoOptimizeHabs && !isStorageInfrastructure(inf))
					"
					show-buttons
					size="sm"
					:min="0"
					class="w-28"
					@update:value="
						(value) => {
							if (value !== null && value !== undefined)
								update(inf, value);
						}
					" />
			</div>
		</div>
	</div>
</template>
