<script setup lang="ts">
	import { computed, type ComputedRef, type PropType } from "vue";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Utils
	import { capitalizeString } from "@/util/text";
	import { formatAmount, formatNumber } from "@/util/numbers";
	import { WORKFORCE_CONSUMPTION_MAP } from "../calculations/workforceCalculations";

	// Types & Interfaces
	import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";
	import type { IWorkforceRecord } from "@/features/planning/usePlanCalculation.types";

	// UI
	import { PButton, PTable } from "@/ui";
	import { CheckSharp, BlockOutlined } from "@vicons/material";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		workforceData: {
			type: Object as PropType<IWorkforceRecord>,
			required: true,
		},
		planetNaturalId: {
			type: String,
			required: true,
		},
	});

	const emit = defineEmits<{
		(
			e: "update:lux",
			workforce: WorkforceType,
			luxType: "lux1" | "lux2",
			value: boolean
		): void;
	}>();

	// Local State
	const localWorkforceData: ComputedRef<IWorkforceRecord> = computed(
		() => props.workforceData
	);

	// Click Handlers
	function updateLux(
		workforce: WorkforceType,
		luxType: "lux1" | "lux2",
		value: boolean
	) {
		emit("update:lux", workforce, luxType, value);
		trackEvent("plan_update_workforce", {
			planetNaturalId: props.planetNaturalId,
			workforceType: workforce,
			luxType: luxType === "lux1" ? "Lux1" : "Lux2",
			value: value,
		});
	}

	function getLuxuryTicker(
		workforce: WorkforceType,
		luxType: "lux1" | "lux2"
	): string {
		return (
			WORKFORCE_CONSUMPTION_MAP[workforce].find((e) => e[luxType])
				?.ticker ?? "N/A"
		);
	}
</script>

<template>
	<PTable striped>
		<thead>
			<tr>
				<th>{{ $t("plan.components.workforce.table.type") }}</th>
				<th>{{ $t("plan.components.workforce.table.need") }}</th>
				<th>{{ $t("plan.components.workforce.table.supply") }}</th>
				<th>{{ $t("plan.components.workforce.table.open") }}</th>
				<th colspan="2" class="text-center!">
					{{ $t("plan.components.workforce.table.luxuries") }}
				</th>
				<th class="text-end!">
					{{ $t("plan.components.workforce.table.pct_eff") }}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="workforce in localWorkforceData" :key="workforce.name">
				<td class="font-bold">
					{{
						capitalizeString(
							$t(`game.workforce_type.${workforce.name}`)
						)
					}}
				</td>
				<td :class="workforce.required === 0 ? 'text-muted!' : ''">
					{{ formatAmount(workforce.required) }}
				</td>
				<td :class="workforce.capacity === 0 ? 'text-muted!' : ''">
					{{ formatAmount(workforce.capacity) }}
				</td>
				<td :class="workforce.left === 0 ? 'text-muted!' : ''">
					{{ formatAmount(workforce.left) }}
				</td>
				<td class="text-center">
					<PButton
						:disabled="disabled"
						size="sm"
						:type="workforce.lux1 ? 'success' : 'secondary'"
						:aria-pressed="workforce.lux1"
						@click="
							updateLux(workforce.name, 'lux1', !workforce.lux1)
						">
						<template #icon>
							<CheckSharp v-if="workforce.lux1" />
							<BlockOutlined v-else />
						</template>
						<template #default>
							<div class="w-[4ch]">
								{{ getLuxuryTicker(workforce.name, "lux1") }}
							</div>
						</template>
					</PButton>
				</td>
				<td class="text-center">
					<PButton
						:disabled="disabled"
						size="sm"
						:type="workforce.lux2 ? 'success' : 'secondary'"
						:aria-pressed="workforce.lux2"
						@click="
							updateLux(workforce.name, 'lux2', !workforce.lux2)
						">
						<template #icon>
							<CheckSharp v-if="workforce.lux2" />
							<BlockOutlined v-else />
						</template>
						<template #default>
							<div class="w-[4ch]">
								{{ getLuxuryTicker(workforce.name, "lux2") }}
							</div>
						</template>
					</PButton>
				</td>
				<td
					class="text-end"
					:class="workforce.efficiency === 0 ? 'text-muted!' : ''">
					{{ formatNumber(workforce.efficiency * 100) }}
				</td>
			</tr>
		</tbody>
	</PTable>
</template>
