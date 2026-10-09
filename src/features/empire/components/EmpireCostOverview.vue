<script setup lang="ts">
	import { type PropType, computed } from "vue";

	// Util
	import { formatNumber, formatPercent } from "@/util/numbers";

	// Types & Interfaces
	import type {
		IEmpireCostOverview,
		IEmpireShippingDemand,
	} from "@/features/empire/empire.types";

	// UI
	import { PValue } from "@/ui";

	const props = defineProps({
		costOverview: {
			type: Object as PropType<IEmpireCostOverview>,
			required: true,
		},
		shippingDemand: {
			type: Object as PropType<IEmpireShippingDemand>,
			required: true,
		},
	});

	const profitPerArea = computed(() => {
		return props.costOverview.totalAreaUsed > 0
			? props.costOverview.totalProfit / props.costOverview.totalAreaUsed
			: 0;
	});

	// no ratio without revenue: shown as "—"
	const revenuePercentage = (value: number) =>
		props.costOverview.totalRevenue
			? (value / props.costOverview.totalRevenue) * 100
			: NaN;
</script>

<template>
	<div
		class="grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_auto_1fr] gap-6 child:child:text-center">
		<div class="sm:col-2">
			<div class="text-muted text-xs">{{ $t("terms.revenue") }}</div>
			<div class="text-white text-xl">
				<PValue :value="costOverview.totalRevenue" />
			</div>
		</div>
		<div>
			<div class="text-muted text-xs">{{ $t("terms.cost") }}</div>
			<div class="text-white text-xl">
				{{ formatNumber(costOverview.totalCost) }}
			</div>
			<div class="text-muted text-xs">
				{{ formatPercent(revenuePercentage(costOverview.totalCost)) }}
			</div>
		</div>
		<div>
			<div class="text-muted text-xs">{{ $t("terms.profit") }}</div>
			<div class="text-white text-xl">
				<PValue :value="costOverview.totalProfit" />
			</div>
			<div class="text-muted text-xs">
				{{ formatPercent(revenuePercentage(costOverview.totalProfit)) }}
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
		<!-- second row, centred under Cost and Profit -->
		<div class="sm:col-3">
			<div class="text-muted text-xs">
				{{ $t("empire.cost_overview.shipping") }}
				({{ $t("plan.components.storage.table.weight") }})
			</div>
			<div class="text-white text-xl">
				{{ formatNumber(shippingDemand.dailyWeight) }}
			</div>
			<div class="text-muted text-xs">
				{{ $t("plan.components.storage.table.import") }}
				{{ formatNumber(shippingDemand.dailyWeightImport) }}
			</div>
			<div class="text-muted text-xs">
				{{ $t("plan.components.storage.table.export") }}
				{{ formatNumber(shippingDemand.dailyWeightExport) }}
			</div>
		</div>
		<div>
			<div class="text-muted text-xs">
				{{ $t("empire.cost_overview.shipping") }}
				({{ $t("plan.components.storage.table.volume") }})
			</div>
			<div class="text-white text-xl">
				{{ formatNumber(shippingDemand.dailyVolume) }}
			</div>
			<div class="text-muted text-xs">
				{{ $t("plan.components.storage.table.import") }}
				{{ formatNumber(shippingDemand.dailyVolumeImport) }}
			</div>
			<div class="text-muted text-xs">
				{{ $t("plan.components.storage.table.export") }}
				{{ formatNumber(shippingDemand.dailyVolumeExport) }}
			</div>
		</div>
	</div>
</template>
