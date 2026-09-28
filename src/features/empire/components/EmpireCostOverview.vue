<script setup lang="ts">
	import { type PropType, computed } from "vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IEmpireCostOverview } from "@/features/empire/empire.types";

	// UI
	import { PValue } from "@/ui";

	const props = defineProps({
		costOverview: {
			type: Object as PropType<IEmpireCostOverview>,
			required: true,
		},
	});

	const profitPerArea = computed(() => {
		return props.costOverview.totalAreaUsed > 0
			? props.costOverview.totalProfit / props.costOverview.totalAreaUsed
			: 0;
	});
</script>

<template>
	<div
		class="grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_auto_1fr] gap-6 child:child:text-center">
		<div class="sm:col-2">
			<div class="text-muted text-xs">{{ $t("terms.profit") }}</div>
			<div class="text-white text-xl">
				<PValue :value="costOverview.totalProfit" />
			</div>
			<div
				v-if="costOverview.totalRevenue === 0"
				class="text-muted text-xs">
				—
			</div>
			<div v-else class="text-muted text-xs">
				{{
					formatNumber(
						(costOverview.totalProfit / costOverview.totalRevenue) *
							100
					)
				}}
				%
			</div>
		</div>
		<div>
			<div class="text-muted text-xs">{{ $t("terms.revenue") }}</div>
			<div class="text-white text-xl">
				{{ formatNumber(costOverview.totalRevenue) }}
			</div>
		</div>
		<div>
			<div class="text-muted text-xs">{{ $t("terms.cost") }}</div>
			<div class="text-white text-xl">
				{{ formatNumber(costOverview.totalCost) }}
			</div>
			<div class="text-muted text-xs">
				{{
					formatNumber(
						(costOverview.totalCost / costOverview.totalRevenue) *
							100
					)
				}}
				%
			</div>
		</div>
		<div>
			<div class="text-muted text-xs">
				{{ $t("terms.profit_per_area") }}
			</div>
			<div class="text-white text-xl">
				<PValue :value="profitPerArea" />
			</div>
		</div>
	</div>
</template>
