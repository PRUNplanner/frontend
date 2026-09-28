<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	/**
	 * A signed number coloured by its sign, readable without colour:
	 * "+1.00" / "-1.00", optionally with an up/down arrow for deltas.
	 *
	 * @author jplacht
	 */
	const {
		value,
		decimals = 2,
		optionalDecimals = false,
		arrow = false,
	} = defineProps<{
		value: number;
		decimals?: number;
		optionalDecimals?: boolean;
		arrow?: boolean;
	}>();

	const sign = computed(() =>
		Number.isFinite(value) ? Math.sign(Number(value.toFixed(decimals))) : 0
	);
</script>

<template>
	<span :class="sign > 0 ? 'text-positive' : sign < 0 ? 'text-negative' : ''">
		<span v-if="arrow && sign !== 0" aria-hidden="true" class="pr-0.5">
			{{ sign > 0 ? "▲" : "▼" }}
		</span>
		{{
			formatNumber(
				sign === 0 && Number.isFinite(value) ? 0 : value,
				decimals,
				optionalDecimals,
				sign !== 0
			)
		}}
	</span>
</template>
