<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	// Util
	import {
		CX_DOT_COLOR,
		isNoPrice,
		priceSourceLabel,
	} from "@/features/exchanges/exchangeLabel.util";

	// Types & Interfaces
	import type { IPriceSource } from "@/features/cx/priceBook";

	// UI
	import { PTag } from "@/ui";

	/*
	 * Where a price comes from as a tag: fixed prices in blue, exchanges
	 * with their colour dot, a 0 ȼ for lack of a price in amber
	 */
	const { source } = defineProps<{ source: IPriceSource }>();

	const { t } = useI18n();

	const fixed = computed(
		() =>
			source.level === "planet_ticker" || source.level === "empire_ticker"
	);
</script>

<template>
	<PTag
		size="sm"
		:type="isNoPrice(source) ? 'warning' : fixed ? 'primary' : 'secondary'">
		<span class="inline-flex items-center gap-1.5 text-nowrap">
			<span
				v-if="source.exchange"
				class="inline-block size-2 rounded-full"
				:style="{ background: CX_DOT_COLOR[source.exchange] }" />
			{{ priceSourceLabel(source, t) }}
		</span>
	</PTag>
</template>
