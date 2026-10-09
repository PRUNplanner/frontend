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
	<!-- two centred rows that wrap when the column is narrow; on phones the
		rows dissolve (contents) into one two-column grid -->
	<div
		class="grid grid-cols-2 gap-6 text-center sm:flex sm:flex-col sm:items-center">
		<div class="contents sm:flex sm:flex-wrap sm:justify-center sm:gap-6">
			<div>
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
		</div>
		<div class="contents sm:flex sm:flex-wrap sm:justify-center sm:gap-6">
			<div>
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
	</div>
</template>
