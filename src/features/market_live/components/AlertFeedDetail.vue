<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import { formatNumber, formatAmount } from "@/util/numbers";

	// Types & Interfaces
	import { CXDataPoint } from "@/features/market_live/cxExchange.types";

	const { data } = defineProps<{
		data: CXDataPoint;
	}>();

	const demandWidth = computed(() =>
		Math.round(
			(data.buy_volume_total /
				(data.buy_volume_total + data.sell_volume_total)) *
				100
		)
	);
</script>

<template>
	<div class="py-2 px-2 border-t border-white/10">
		<div class="grid grid-cols-4 gap-3">
			<div class="flex flex-col gap-y-1 uppercase">
				<div class="text-white/50">Price</div>
				<div class="text-lg font-mono text-white">
					{{ formatNumber(data.price ?? Infinity) }}
				</div>
				<div class="text-xs text-white/50">
					Bid: {{ formatNumber(data.bid ?? Infinity) }}
				</div>
				<div class="text-xs text-white/50">
					Ask: {{ formatNumber(data.ask ?? Infinity) }}
				</div>
			</div>
			<div class="flex flex-col gap-y-1 uppercase">
				<div class="text-white/50">Spread</div>
				<div class="text-lg font-mono text-white">
					{{ formatNumber(data.spread ?? Infinity) }}
				</div>
				<div class="text-xs text-white/50">
					{{ formatNumber(data.spread_pct ?? Infinity) }} %
				</div>
			</div>
			<div class="flex flex-col gap-y-1 uppercase">
				<div class="text-white/50">Buy Volume</div>
				<div class="text-lg font-mono text-white">
					{{ formatAmount(data.buy_volume_total) }}
				</div>
				<div class="text-xs text-white/50">
					VWAP: {{ formatNumber(data.buy_vwap ?? Infinity) }}
				</div>
				<div class="text-xs text-white/50">
					Change: {{ formatAmount(data.buy_volume_change) }}
				</div>
			</div>
			<div class="flex flex-col gap-y-1 uppercase">
				<div class="text-white/50">Sell Volume</div>
				<div class="text-lg font-mono text-white">
					{{ formatAmount(data.sell_volume_total) }}
				</div>
				<div class="text-xs text-white/50">
					VWAP: {{ formatNumber(data.sell_vwap ?? Infinity) }}
				</div>
				<div class="text-xs text-white/50">
					Change: {{ formatAmount(data.sell_volume_change) }}
				</div>
			</div>
		</div>
		<div class="mt-2 pt-2 border-t border-white/10">
			<div
				class="flex justify-between text-xs text-white/50 mb-1 font-mono uppercase">
				<span
					>Buy Volume: {{ formatAmount(data.buy_volume_total) }}</span
				>
				<span
					>Sell Volume:
					{{ formatAmount(data.sell_volume_total) }}</span
				>
			</div>
			<div
				class="w-full h-1.5 bg-gray-800 rounded-full flex gap-0.5 overflow-hidden">
				<div
					class="bg-blue-500 h-full flex-shrink-0 transition-all duration-500"
					:style="{ width: demandWidth + '%' }"></div>

				<div
					class="bg-orange-500 h-full flex-shrink-0 transition-all duration-500"
					:style="{ width: 100 - demandWidth + '%' }"></div>
			</div>
		</div>
	</div>
</template>
