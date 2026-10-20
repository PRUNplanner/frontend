<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	// Util
	import {
		formatChange,
		formatDay,
		formatMoney,
		marketBrief,
	} from "@/features/market_report/marketReport.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

	const { summary } = defineProps<{ summary: MarketSummary }>();
	const { t } = useI18n();

	const sentences = computed<string[]>(() => {
		const b = marketBrief(summary);
		const date = formatDay(summary.index.base);
		return [
			b.index != null &&
				t("market_report.in_short.index", {
					level: formatNumber(b.index, 1),
					change: formatChange(b.indexChange),
					date,
				}),
			b.sector &&
				t("market_report.in_short.sector", {
					sector: t(`market_report.sector.${b.sector}`),
					change: formatChange(b.sectorChange),
					date,
				}),
			b.pioneerCost != null &&
				t("market_report.in_short.pioneer", {
					cost: formatMoney(b.pioneerCost),
					change: formatChange(b.pioneerChange),
				}),
		].filter((s): s is string => !!s);
	});
</script>

<template>
	<ul class="flex flex-col gap-2 list-disc pl-5 text-base min-h-40 md:min-h-24">
		<li v-for="s in sentences" :key="s">{{ s }}</li>
	</ul>
</template>
