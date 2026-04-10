<script setup lang="ts">
	// Types & Interfaces
	import { CXDataPoint } from "@/features/market_live/cxExchange.types";

	// Util
	import { formatNumber, formatAmount } from "@/util/numbers";

	// UI
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";

	defineProps<{
		data: CXDataPoint[];
	}>();
</script>

<template>
	<XNDataTable
		:data="data"
		striped
		virtual-scroll
		:max-height="800"
		:row-key="(row) => row.ticker">
		<XNDataTableColumn key="ticker" title="Ticker" />
		<XNDataTableColumn key="price" title="Price" align="right">
			<template #render-cell="{ rowData }">
				<div class="text-nowrap">
					<span v-if="rowData.price !== undefined">
						{{ formatNumber(rowData.price, 2, true) }}
					</span>
					<span v-else-if="rowData.price === undefined" class="">
						&mdash;
					</span>
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="bid" title="Bid" align="right">
			<template #render-cell="{ rowData }">
				<div class="font-mono text-sky-500">
					<span v-if="rowData.bid">
						{{ formatNumber(rowData.bid, 2, true) }}
					</span>
					<span v-else>&mdash;</span>
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="ask" title="Ask" align="right">
			<template #render-cell="{ rowData }">
				<div class="font-mono text-rose-600">
					<span v-if="rowData.ask">
						{{ formatNumber(rowData.ask, 2, true) }}
					</span>
					<span v-else>&mdash;</span>
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="spread_pct" title="Spread %" align="right">
			<template #render-cell="{ rowData }">
				<div class="font-mono">
					<span v-if="rowData.spread_pct">
						{{ formatNumber(rowData.spread_pct, 2) }}
						%
					</span>
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="buy_volume_total"
			title="Buy Vol."
			align="right">
			<template #render-cell="{ rowData }">
				<span class="font-mono">
					{{ formatAmount(rowData.buy_volume_total) }}
				</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="sell_volume_total"
			title="Sell Vol."
			align="right">
			<template #render-cell="{ rowData }">
				<span class="font-mono">
					{{ formatAmount(rowData.sell_volume_total) }}
				</span>
			</template>
		</XNDataTableColumn>
	</XNDataTable>
</template>
