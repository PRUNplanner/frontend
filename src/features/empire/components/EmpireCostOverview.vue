<script setup lang="ts">
	import { type PropType, computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { formatNumber, formatPercent } from "@/util/numbers";
	import { useChartTheme } from "@/ui/charts/chartTheme";
	import { splitShares } from "@/features/empire/empireAnalysis.util";

	// Components
	import PStackedBar from "@/ui/charts/PStackedBar.vue";

	// Types & Interfaces
	import type {
		IEmpireCostOverview,
		IEmpireShippingDemand,
		IEmpireSplitParts,
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
		split: {
			type: Object as PropType<IEmpireSplitParts>,
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

	const theme = useChartTheme();

	// inputs, workforce, degradation and profit: 100 % of revenue, or of
	// cost with the uncovered part hatched when the empire loses money
	const kpiSplit = computed(() => {
		const shares = splitShares(props.split);
		const colors = {
			inputs: theme.value.costPart(1),
			workforce: theme.value.costPart(2),
			degradation: theme.value.costPart(3),
			profit: theme.value.positive,
		};
		const parts = (
			["inputs", "workforce", "degradation", "profit"] as const
		).map((key) => ({
			key,
			value: shares[key],
			color: colors[key],
			text: t(`empire.analysis.kpi_split.${key}`, {
				pct: formatPercent(shares[key], 1),
			}),
		}));
		const legend: { key: string; value: number; color: string; text: string }[] =
			parts.filter((p) => p.key !== "profit" || p.value > 0);
		if (shares.uncovered > 0)
			legend.push({
				key: "uncovered",
				value: shares.uncovered,
				color: "repeating-linear-gradient(135deg, var(--color-negative) 0 3px, transparent 3px 5px)",
				text: t("empire.analysis.kpi_split.uncovered", {
					pct: formatPercent(shares.uncovered, 1),
				}),
			});
		return {
			parts,
			legend,
			hatchFrom:
				shares.uncovered > 0 ? 100 - shares.uncovered : undefined,
			label: t("empire.analysis.kpi_split.label", {
				parts: legend.map((l) => l.text).join(", "),
			}),
		};
	});
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
		<div class="col-span-2 w-full text-left">
			<PStackedBar
				:segments="kpiSplit.parts"
				:hatch-from="kpiSplit.hatchFrom"
				:label="kpiSplit.label">
				<div v-for="l in kpiSplit.legend" :key="l.key" class="tabular-nums">
					{{ l.text }}
				</div>
				<div v-if="kpiSplit.hatchFrom !== undefined" class="text-muted">
					{{ $t("empire.analysis.kpi_split.of_cost") }}
				</div>
			</PStackedBar>
			<div
				class="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs text-muted"
				aria-hidden="true">
				<span
					v-for="l in kpiSplit.legend"
					:key="l.key"
					class="inline-flex items-center gap-x-1.5 tabular-nums">
					<span
						class="inline-block size-2.5 rounded-[2px]"
						:style="{ background: l.color }" />
					{{ l.text }}
				</span>
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
