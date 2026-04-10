<script setup lang="ts">
	// Util
	import { relativeFromDate } from "@/util/date";

	// Types & Interfaces
	import { MessageHistory } from "@/features/market_live/cxDetectors.types";

	defineProps<{
		data: MessageHistory[];
	}>();
</script>

<template>
	<h2 class="text-lg font-bold pb-3">Data History</h2>
	<template v-for="burst in data" :key="burst.timestamp">
		<div class="w-full border border-white/10 rounded mb-3">
			<div class="flex flex-col text-xs uppercase">
				<div
					class="flex flex-row justify-between items-center bg-gray-dark">
					<div class="text-prunplanner px-4 py-2">
						{{ relativeFromDate(burst.timestamp) }}
					</div>
					<div class="px-4 py-2 text-[10px] text-white/50">
						{{ burst.tickers.length }} Tickers received
					</div>
				</div>
				<div class="flex flex-wrap gap-1.5 p-2">
					<span
						v-for="ticker in burst.tickers"
						:key="`${burst.timestamp}#${ticker}`"
						class="bg-white/10 border border-white/10 text-xs font-mono px-2 py-0.5 rounded">
						{{ ticker }}
					</span>
				</div>
			</div>
		</div>
	</template>
</template>
