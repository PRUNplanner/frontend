<script setup lang="ts">
	import { computed, type PropType } from "vue";

	// Types & Interfaces
	import type {
		IAreaResult,
		IExpertRecord,
		IOverviewData,
	} from "@/features/planning/usePlanCalculation.types";
	import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
	import { cogcTextMapping } from "@/features/planning_data/usePlan";

	// Util
	import { formatNumber } from "@/util/numbers";

	// UI
	import {} from "@/ui";

	const props = defineProps({
		areaData: {
			type: Object as PropType<IAreaResult>,
			required: true,
		},
		corphq: {
			type: Boolean,
			required: true,
		},
		cogc: {
			type: String as PropType<PlanCOGCProgram>,
			required: true,
		},
		expertData: {
			type: Object as PropType<IExpertRecord>,
			required: true,
		},
		overviewData: {
			type: Object as PropType<IOverviewData>,
			required: true,
		},
	});

	const expertsString = computed(() => {
		let experts = "";

		for (const expertKey in props.expertData) {
			const expert = props.expertData[expertKey as keyof IExpertRecord];
			if (expert.amount > 0) {
				if (experts.length > 0) experts += ", ";
				experts += `${expert.amount}x${expert.name.substring(0, 4)}`;
			}
		}
		if (experts.length === 0) experts = "None";
		return experts;
	});
</script>

<template>
	<div class="flex flex-row font-bold child:mr-3">
		<div :class="corphq ? 'visible' : 'collapse md:invisible'">
			<span class="text-positive">
				{{ $t("plan.components.status.hq") }}
			</span>
		</div>
		<div>
			<span class="pr-1">{{ $t("plan.components.status.cogc") }}</span>
			<span :class="props.cogc === '---' ? 'text-negative' : ''">
				{{ $t(cogcTextMapping[props.cogc]) }}
			</span>
		</div>
		<div>
			<span class="pr-1">{{ $t("plan.components.status.area") }}</span>
			<span
				:class="
					areaData.areaUsed > areaData.areaTotal
						? 'text-negative'
						: ''
				">
				{{ areaData.areaUsed }}
			</span>
			<span>/{{ areaData.areaTotal }}</span>
			<span
				v-if="areaData.areaUsed > areaData.areaTotal"
				class="block text-xs text-red-300">
				{{
					$t("plan.components.area.exceeded", {
						amount: areaData.areaUsed - areaData.areaTotal,
					})
				}}
			</span>
		</div>
		<div>
			<span class="pr-1">{{ $t("plan.components.status.profit") }}</span>
			<span
				:class="
					overviewData.profit > 0 ? 'text-positive' : 'text-negative'
				">
				{{ formatNumber(overviewData.profit) }}
			</span>
		</div>
		<div>
			<span class="pr-1">{{ $t("plan.components.status.experts") }}</span>
			<span :class="expertsString === 'None' ? 'text-negative' : ''">
				{{ expertsString }}
			</span>
		</div>
	</div>
</template>
