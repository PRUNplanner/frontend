<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type { CXDataPoint } from "@/features/market_live/cxExchange.types";

	// Util
	import { formatNumber, formatAmount } from "@/util/numbers";

	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable } from "@/ui";

	defineProps<{
		data: CXDataPoint[];
	}>();

	const numeric = (key: string, title: string): PDataTableColumn<CXDataPoint> => ({
		key,
		title: t(`market_live.components.point_table.table.${title}`),
		align: "right",
	});
	const columns = computed<PDataTableColumn<CXDataPoint>[]>(() => [
		{
			key: "ticker",
			title: t("market_live.components.point_table.table.ticker"),
		},
		numeric("price", "price"),
		numeric("bid", "bid"),
		numeric("ask", "ask"),
		numeric("spread_pct", "spread_pct"),
		numeric("buy_volume_total", "buy_volume"),
		numeric("sell_volume_total", "sell_volume"),
	]);
</script>

<template>
	<div class="flex-1 min-h-0">
		<PDataTable
			:columns="columns"
			:data="data"
			striped
			fill
			virtual
			:min-width="700"
			:row-key="(row) => row.ticker">
			<template #cell-price="{ row }">
				<div class="text-nowrap">
					<span v-if="row.price !== undefined">
						{{ formatNumber(row.price) }}
					</span>
					<span v-else-if="row.price === undefined" class="">
						&mdash;
					</span>
				</div>
			</template>
			<template #cell-bid="{ row }">
				<div class="font-mono text-sky-500">
					<span v-if="row.bid">
						{{ formatNumber(row.bid) }}
					</span>
					<span v-else>&mdash;</span>
				</div>
			</template>
			<template #cell-ask="{ row }">
				<div class="font-mono text-negative">
					<span v-if="row.ask">
						{{ formatNumber(row.ask) }}
					</span>
					<span v-else>&mdash;</span>
				</div>
			</template>
			<template #cell-spread_pct="{ row }">
				<div class="font-mono">
					<span v-if="row.spread_pct">
						{{ formatNumber(row.spread_pct, 2) }}
					</span>
					<span v-else>&mdash;</span>
				</div>
			</template>
			<template #cell-buy_volume_total="{ row }">
				<span class="font-mono">
					{{ formatAmount(row.buy_volume_total) }}
				</span>
			</template>
			<template #cell-sell_volume_total="{ row }">
				<span class="font-mono">
					{{ formatAmount(row.sell_volume_total) }}
				</span>
			</template>
		</PDataTable>
	</div>
</template>
