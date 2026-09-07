<script setup lang="ts">
	import { PropType, computed } from "vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import { IEmpireCostOverview } from "@/features/empire/empire.types";

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

	const revenuePercentage = (value: number) =>
		props.costOverview.totalRevenue
			? (value / props.costOverview.totalRevenue) * 100
			: 0;
</script>

<template>
	<div
		class="grid grid-cols-[auto_auto] grid-rows-2 sm:grid-rows-1 sm:grid-cols-[1fr_auto_auto_auto_auto_1fr] gap-6 child:child:text-center">
		<div class="sm:col-2">
			<div class="text-white/40 text-xs">{{ $t("terms.revenue") }}</div>
			<div class="text-white text-xl">
				{{ formatNumber(costOverview.totalRevenue) }}
			</div>
		</div>
		<div>
			<div class="text-white/40 text-xs">{{ $t("terms.cost") }}</div>
			<div class="text-white text-xl">
				{{ formatNumber(costOverview.totalCost) }}
			</div>
			<div class="text-white/40 text-xs">
				{{ formatNumber(revenuePercentage(costOverview.totalCost)) }}
				%
			</div>
		</div>
		<div>
			<div class="text-white/40 text-xs">{{ $t("terms.profit") }}</div>
			<div class="text-white text-xl">
				{{ formatNumber(costOverview.totalProfit) }}
			</div>
			<div class="text-white/40 text-xs">
				{{ formatNumber(revenuePercentage(costOverview.totalProfit)) }}
				%
			</div>
		</div>
		<div>
			<div class="text-white/40 text-xs">
				{{ $t("terms.profit_per_area") }}
			</div>
			<div class="text-white text-xl">
				{{ formatNumber(profitPerArea) }}
			</div>
		</div>
	</div>
</template>
