<script setup lang="ts">
	import { computed, type PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type {
		IAreaResult,
		IExpertRecord,
		IOverviewData,
	} from "@/features/planning/usePlanCalculation.types";
	import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
	import { cogcTextMapping } from "@/features/planning_data/usePlan";

	// UI
	import { PValue } from "@/ui";

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

	const experts = computed(() =>
		Object.values(props.expertData).filter((e) => e.amount > 0)
	);

	// spelled out on wide screens, "5xChem" below @6xl
	const expertsFull = computed(() =>
		experts.value
			.map(
				(e) =>
					`${e.amount} ${t(`game.expertise.${e.name.toUpperCase()}`)}`
			)
			.join(", ")
	);
	const expertsShort = computed(() =>
		experts.value
			.map((e) => `${e.amount}x${e.name.substring(0, 4)}`)
			.join(", ")
	);
</script>

<template>
	<div
		class="flex flex-row flex-wrap items-baseline gap-x-4 gap-y-1 tabular-nums">
		<div v-if="corphq" class="font-bold text-positive">
			{{ $t("plan.components.status.hq") }}
		</div>
		<div>
			<span class="pr-1 text-muted">
				{{ $t("plan.components.status.cogc") }}
			</span>
			<span
				class="font-bold"
				:class="props.cogc === '---' ? 'text-negative' : ''">
				{{ $t(cogcTextMapping[props.cogc]) }}
			</span>
		</div>
		<div>
			<span class="pr-1 text-muted">
				{{ $t("plan.components.status.area") }}
			</span>
			<span class="font-bold">
				{{ areaData.areaUsed }} / {{ areaData.areaTotal }}
			</span>
			<span
				class="pl-1"
				:class="areaData.areaLeft < 0 ? 'text-negative' : 'text-muted'">
				{{
					areaData.areaLeft < 0
						? $t("plan.components.status.area_over", {
								count: -areaData.areaLeft,
							})
						: $t("plan.components.status.area_free", {
								count: areaData.areaLeft,
							})
				}}
			</span>
		</div>
		<div>
			<span class="pr-1 text-muted">
				{{ $t("plan.components.status.profit") }}
			</span>
			<PValue class="font-bold" :value="overviewData.profit" />
			<span class="pl-1 text-muted">
				{{ $t("plan.components.status.per_day") }}
			</span>
		</div>
		<div>
			<span class="pr-1 text-muted">
				{{ $t("plan.components.status.experts") }}
			</span>
			<span v-if="experts.length === 0" class="font-bold text-negative">
				{{ $t("plan.components.status.experts_none") }}
			</span>
			<template v-else>
				<span class="font-bold hidden @6xl:inline">
					{{ expertsFull }}
				</span>
				<span class="font-bold @6xl:hidden">{{ expertsShort }}</span>
			</template>
		</div>
	</div>
</template>
