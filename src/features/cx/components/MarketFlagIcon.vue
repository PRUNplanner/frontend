<script setup lang="ts">
	// Types & Interfaces
	import type { MarketFlagLevel } from "@/features/cx/marketCheck.types";

	// shapes differ by level, so colour isn't the only signal: a filled
	// circle with "!", a triangle with "!", a hollow ring
	const { level } = defineProps<{ level: MarketFlagLevel }>();

	const COLOR: Record<MarketFlagLevel, string> = {
		red: "text-negative",
		amber: "text-warning",
		muted: "text-muted",
	};
</script>

<template>
	<svg
		viewBox="0 0 16 16"
		class="size-4 shrink-0"
		:class="COLOR[level]"
		aria-hidden="true">
		<template v-if="level === 'red'">
			<circle cx="8" cy="8" r="7" fill="currentColor" />
			<path
				d="M8 4.2v4.6"
				stroke="black"
				stroke-width="1.8"
				stroke-linecap="round" />
			<circle cx="8" cy="11.6" r="1.1" fill="black" />
		</template>
		<template v-else-if="level === 'amber'">
			<path
				d="M8 1.2 15.2 14.3H.8z"
				fill="currentColor"
				stroke-linejoin="round" />
			<path
				d="M8 5.6v4.3"
				stroke="black"
				stroke-width="1.7"
				stroke-linecap="round" />
			<circle cx="8" cy="12.1" r="1" fill="black" />
		</template>
		<circle
			v-else
			cx="8"
			cy="8"
			r="4.8"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6" />
	</svg>
</template>
